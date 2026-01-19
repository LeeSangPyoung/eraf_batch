import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import requests
from celery import Task
from celery.exceptions import Ignore
from celery.result import AsyncResult
from dateutil.parser import parse
from django.utils import timezone
from django_celery_beat.models import PeriodicTask
from opentelemetry import trace
from requests.exceptions import HTTPError

from batchbe.celery import app
from batchbe.settings import BASE_URL
from celerytasks import redis_helper
from celerytasks.models import (
    JobSettings,
    TaskDetail,
)
from exceptions.executable_exception import ExecutableError
from logger import get_logger

from .utils import (
    call_scheduler_workflow_update,
    datetime_to_epoch,
    extract_error_message,
    get_current_time,
    get_next_run_date,
    get_worker_start_time_key,
    remove_task_from_local,
    save_task_to_local,
)
from .views import get_next_tasks, rrule_schedule_task, walk_results

logger = get_logger()
tracer = trace.get_tracer(__name__)

# Constants for magic numbers and status codes
DEFAULT_ERROR_CODE = -104
PRIORITY_MULTIPLIER = 400
DEFAULT_WAIT_TIME = 1
MAX_WAIT_TIME = 10
SUCCESS_HTTP_CODE = 200
MAX_ITERATIONS = 10
CACHE_TIMEOUT = 3600


class OperationType(Enum):
    """
    Enum for possible operation statuses for a task/job run.
    """

    RUN = "RUN"
    COMPLETED = "COMPLETED"
    BROKEN = "BROKEN"
    FAILED = "FAILED"
    RETRY_RUN = "RETRY_RUN"


class PickableException(Exception):
    """
    Exception that can be pickled.
    """

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

    def __str__(self):
        return self.message


# Utility functions for repeated status/result update logic


def set_task_status_and_result(
    task_detail: "TaskDetail", status: str, result: str = None
):
    task_detail.status = status
    if result is not None:
        task_detail.task_result = result


@dataclass
class TaskCache:
    job_id: str = None
    task_id: str = None
    workflow_run_id: Optional[str] = None
    actual_start_date: int = None
    job_log_id: int = None
    context_data: dict = field(
        default_factory=lambda: {"task_id": "-", "task_name": "-", "job_id": "-"}
    )
    ttl: float = field(default_factory=lambda: time.time() + CACHE_TIMEOUT)


class RepeatTask(Task):
    """Base task for executing repeated tasks with workflow support and caching."""

    def __init__(self):
        super().__init__()
        self._cached_objects: Dict[str, Any] = {}
        self.task_cache: Dict[str, TaskCache] = {}
        self.logger = logger

    def _is_revoked(self):
        task_detail = TaskDetail.objects.filter(celery_task_id=self.request.id).first()
        if task_detail and task_detail.task_result == "REVOKED":
            self.logger.info(f"Task {self.request.id} is revoked.")
            return True

        return False

    def add_trace_attribute(self, span: trace.Span, **kwargs):
        """Add trace attributes to the span."""
        for key, value in kwargs.items():
            if value is not None:
                span.set_attribute(key, value)

        task_cache: TaskCache = self.get_task_cache()
        if not task_cache:
            return

        if task_cache.job_id:
            span.set_attribute("job.id", task_cache.job_id)
        if task_cache.task_id:
            span.set_attribute("task.id", task_cache.task_id)

    def _get_cached_object(self, key: str, fetch_func, *args) -> Any:
        """Cache database objects to avoid repeated queries within a single task execution."""
        if key not in self._cached_objects:
            self._cached_objects[key] = fetch_func(*args)
        return self._cached_objects[key]

    def get_task_cache(self) -> Optional[TaskCache]:
        task_id = self.request.id

        task_cache = self.task_cache.get(task_id)
        logger.debug("Task cache: found for task_id %s: %s", task_id, task_cache)

        if not task_cache:
            return None

        return task_cache

    def clear_caches(self):
        # remove current task cache
        self.delete_task_cache()
        self._cached_objects.clear()

        scan_keys = list(self.task_cache.keys())

        for key in scan_keys:
            if self.task_cache[key].ttl < time.time():
                del self.task_cache[key]

    def delete_task_cache(self):
        task_id = self.request.id

        logger.debug("Task cache: deleting for task_id %s", task_id)

        self.task_cache.pop(task_id, None)

    def set_task_cache(self, cache_obj: TaskCache):
        task_id = self.request.id
        logger.debug("Task cache: setting for task_id %s: %s", task_id, cache_obj)
        self.task_cache[task_id] = cache_obj

    def set_cache_values(self, values: Dict[str, Any]):
        task_cache = self.get_task_cache()
        if not task_cache:
            task_cache = TaskCache()

        for key, val in values.items():
            setattr(task_cache, key, val)

        self.set_task_cache(task_cache)

    def get_cache_value(self, key: str, default_value: Any = None) -> Any:
        task_cache = self.get_task_cache()
        if not task_cache:
            return default_value

        return getattr(task_cache, key, default_value)

    def call_scheduler_run_log(self, body, method):
        url = f"{BASE_URL}/logs/{method}"
        headers = {"Content-Type": "application/json"}
        if body is None:
            logger.error("Failed to convert task detail to log data.")
            return False

        try:
            response = requests.post(url, json=body, headers=headers)
            response.raise_for_status()
            if method == "create":
                job_log_id = response.json().get("data", {}).get("job_run_id")
                self.set_cache_values({"job_log_id": job_log_id})

            logger.info(
                "Success push task result to scheduler with method %s and body %s: response: %s",
                method,
                body,
                response,
            )
            return True
        except requests.RequestException as e:
            logger.error("Error in pushing task result to scheduler: %s", e)
            return False

    def _log_and_call_scheduler(
        self, body: Optional[Dict], method: str, context: str
    ) -> bool:
        """Utility to call scheduler run log and log the result."""
        success = True
        if body is not None:
            # Use non-blocking call to avoid blocking the task
            try:
                success = self.call_scheduler_run_log(body, method)
                if success:
                    self.logger.debug(
                        "Successfully update at %s scheduler run log", context
                    )
                else:
                    self.logger.warning(
                        "Failed to update at %s scheduler run log", context
                    )
            except Exception as e:
                self.logger.warning("Error calling scheduler run log: %s", e)
                success = False

        return success

    def get_task_and_job_by_id_or_name(
        self, *, task_id: Optional[str] = None, task_name: Optional[str] = None
    ) -> Tuple[Optional[TaskDetail], Optional[JobSettings]]:
        """
        Retrieve TaskDetail and JobSettings objects by either task_id or task_name.
        If task_id is provided, fetch TaskDetail by celery_task_id and its related JobSettings.
        If task_name is provided, fetch TaskDetail by task_name and its related JobSettings, using cache for efficiency within a single task execution.
        Returns a tuple (TaskDetail, JobSettings) or (None, None) if not found.
        """
        if task_id:
            task_detail = (
                TaskDetail.objects.select_related("job")
                .filter(celery_task_id=task_id)
                .first()
            )
            if task_detail:
                return task_detail, task_detail.job
        elif task_name:
            task_detail = self._get_cached_object(
                f"task_detail_{task_name}",
                lambda: TaskDetail.objects.select_related("job")
                .filter(task_name=task_name)
                .first(),
            )
            if task_detail:
                return task_detail, task_detail.job
        return None, None

    def _get_task_and_job(
        self, *, task_id: Optional[str] = None, task_name: Optional[str] = None
    ) -> Tuple[Optional[TaskDetail], Optional[JobSettings]]:
        """
        Wrapper for get_task_and_job_by_id_or_name for backward compatibility.
        Fetches TaskDetail and JobSettings by task_id or task_name.
        """
        return self.get_task_and_job_by_id_or_name(task_id=task_id, task_name=task_name)

    def __call__(self, *args, **kwargs):
        """Main task execution with workflow prerequisites and error handling."""
        task_name = args[1]
        job_id = args[2]

        with tracer.start_as_current_span("__call___span") as span:
            self.add_trace_attribute(span)
            job_settings = self._get_cached_object(
                f"job_settings_{job_id}",
                lambda: JobSettings.objects.filter(job_id=job_id).first(),
            )
            if job_settings is None:
                self.logger.error("JobSettings not found for job_id %s.", job_id)
                raise RuntimeError(f"JobSettings not found for job_id {job_id}")
            task_detail = self._get_cached_object(
                f"task_detail_{task_name}",
                lambda: TaskDetail.objects.select_related("job")
                .filter(task_name=task_name)
                .first(),
            )
            if task_detail is None:
                self.logger.error("TaskDetail not found for task_name %s.", task_name)
                raise RuntimeError(f"TaskDetail not found for task_name {task_name}")

            return self._execute_task_with_error_handling(
                args, kwargs, job_settings, task_detail, job_id
            )

    def _check_tasks_still_running(self, task_names: List[str]) -> bool:
        """
        Check if any tasks in the provided list of task names are still running or pending.
        Returns True if at least one task is running or pending, otherwise False.
        """
        if not task_names:
            return False
        return TaskDetail.objects.filter(
            task_name__in=task_names, task_result__in=["RUNNING", "PENDING"]
        ).exists()

    def _count_duration_in_memory(self, task_detail: "TaskDetail") -> None:
        """
        Update the run_duration field of a TaskDetail instance in memory only, without saving to the database.
        Sets run_duration to the difference between now and actual_start_date (if present) or run_date.
        """
        current_time = get_current_time()
        task_cache = self.get_task_cache()
        duration = max(current_time - task_cache.actual_start_date, 0)

        task_detail.run_duration = timedelta(seconds=duration // 1000)

    def _execute_task_with_error_handling(
        self,
        args: tuple,
        kwargs: dict,
        job_settings: JobSettings,
        task_detail: TaskDetail,
        job_id: str,
    ):
        is_revoked = False

        """Execute the main task with error handling and logging."""
        with tracer.start_as_current_span(
            "execute_task_with_error_handling_span"
        ) as span:
            try:
                body = self.task_call_update_run_log(task_detail, job_settings)
                self._log_and_call_scheduler(body, "update", "hook call")
                result = super(RepeatTask, self).__call__(*args, **kwargs)
                is_revoked = self._is_revoked()

                if is_revoked:
                    return {"success": False, "error": "Task was revoked"}

                return result
            except Exception as e:
                is_revoked = self._is_revoked()

                span.record_exception(e)
                span.set_status(
                    trace.Status(trace.StatusCode.ERROR, "Task execution failed")
                )

                if isinstance(e, HTTPError):
                    error_no = e.response.status_code
                    output = e.response.text
                elif isinstance(e, ExecutableError):
                    error_no = e.status_code
                    output = e.error_details if e.error_details else e.output
                else:
                    error_no = DEFAULT_ERROR_CODE
                    output = str(e)

                if not is_revoked:
                    body = self.convert_task_detail_to_log_data(
                        task_detail=task_detail,
                        job_settings=job_settings,
                        result=None,
                        operation=None,
                        method="update",
                        error_no=error_no,
                        error_detail=extract_error_message(output),
                        next_run_date=None,
                        status="failed",
                    )
                    self._log_and_call_scheduler(body, "update", "hook on_failure")

                self.logger.error(
                    "Error in task %s with task_retry_count=%s job_retry_count=%s: %s",
                    self.name,
                    task_detail.retry_count,
                    job_settings.retry_count,
                    e,
                )

                # WORKAROUND
                job_settings.refresh_from_db(fields=["auto_drop"])
                if (
                    job_settings.restart_on_failure
                    and task_detail.retry_count < job_settings.max_failure
                    and not job_settings.auto_drop
                    and not is_revoked
                ):
                    self._retry_task(job_settings, task_detail, job_id, e, args, kwargs)
                else:
                    return {"success": False, "error": output}
            finally:
                if is_revoked:
                    remove_task_from_local(self.request.id)
                    self.set_cache_values({"is_revoked": True})

                    body = self.convert_task_detail_to_log_data(
                        task_detail=task_detail,
                        job_settings=job_settings,
                        result=None,
                        operation="BLOCKED",
                        method="update",
                        error_no=None,
                        error_detail=None,
                        next_run_date=None,
                        status="stopped",
                    )
                    self._log_and_call_scheduler(body, "update", "hook on_failure")

    def _retry_task(
        self,
        job_settings: JobSettings,
        task_detail: TaskDetail,
        job_id: str,
        exception: Exception,
        args: tuple,
        kwargs: dict,
    ) -> None:
        """Handles task retries based on job settings."""
        max_retries = job_settings.max_failure
        time_limit = job_settings.max_run_duration.total_seconds()
        retry_delay = float(job_settings.retry_delay)

        if task_detail.retry_count < max_retries:
            task_detail.increase_retry_count()
            task_detail.save(update_fields=["retry_count"])
            job_settings.increase_retry_count()
            job_settings.save(update_fields=["retry_count"])

            self.logger.info(
                "Trying to retry task: %s with details: "
                "task_retry_count=%s retry_delay=%s, max_retries=%s, time_limit=%s",
                job_id,
                task_detail.retry_count,
                retry_delay,
                max_retries,
                time_limit,
            )

        self.retry(
            exc=exception,
            countdown=retry_delay,
            args=args,
            kwargs=kwargs,
            max_retries=max_retries,
            time_limit=time_limit,
        )

    def before_start(self, task_id: str, args: tuple, kwargs: dict) -> None:
        """Celery hook called before task execution starts."""
        actual_start_date = get_current_time()

        task_name = args[1]
        job_id = args[2]
        run_account = args[3]
        workflow_run_id = kwargs.get("workflow_run_id", None)
        manual_run = kwargs.get("manual_run", False)
        context_data = {
            "task_id": task_id,
            "task_name": task_name,
            "job_id": job_id,
        }
        adapter = logging.LoggerAdapter(logger, context_data)
        self.logger = adapter

        on_retry = bool(self.request.retries)

        with tracer.start_as_current_span("before_start_span") as span:
            self.add_trace_attribute(span)
            self.logger.info("Hook before_start for task with id: %s", task_id)
            self.logger.debug(
                "Running task: %s, args: %s, kwargs: %s", task_name, args, kwargs
            )

            task_cache = TaskCache(
                job_id=job_id,
                task_id=task_id,
                workflow_run_id=workflow_run_id,
                actual_start_date=actual_start_date,
                context_data={
                    "task_id": task_id,
                    "task_name": task_name,
                    "job_id": job_id,
                },
            )

            self.set_task_cache(task_cache)

            try:
                if workflow_run_id or manual_run:
                    job_settings = JobSettings.objects.filter(job_id=job_id).first()
                    if not job_settings:
                        self.logger.error(
                            "JobSettings not found for job_id %s.", job_id
                        )
                        raise RuntimeError(f"JobSettings not found for job_id {job_id}")

                    task_detail, _ = self._get_task_and_job(task_name=task_name)
                    if task_detail is None:
                        task_detail = TaskDetail.objects.create(
                            job=job_settings,
                            task_name=task_name,
                            celery_task_id=task_id,
                            run_date=self.request.eta or datetime.now(timezone.utc),
                            manually_run=manual_run,
                        )
                        self._cached_objects[f"task_detail_{task_name}"] = task_detail

                    if not manual_run:
                        body = {
                            "workflow_id": job_settings.workflow_id,
                            "latest_status": "RUNNING",
                            "current_job_id": job_id,
                        }
                        call_scheduler_workflow_update(body)
                else:
                    task_detail, job_settings = self._get_task_and_job(
                        task_name=task_name
                    )
                    if not task_detail or not job_settings:
                        self.logger.error(
                            "TaskDetail or JobSettings not found for before_start task_name %s.",
                            task_name,
                        )
                        raise RuntimeError("TaskDetail or JobSettings not found.")

                skipped = False
                worker_start_time = redis_helper.get_key(get_worker_start_time_key())
                worker_start_time = int(worker_start_time) if worker_start_time else 0

                if isinstance(task_detail.run_date, str):
                    task_run_date = parse(task_detail.run_date)
                else:
                    task_run_date = task_detail.run_date

                logger.debug(
                    "task_run_date: %s, worker_start_time: %s",
                    task_run_date,
                    worker_start_time,
                )

                if not manual_run and (
                    (job_settings.workflow_id and not workflow_run_id)
                    or not job_settings.is_enable
                    or (
                        worker_start_time
                        and worker_start_time > task_run_date.timestamp() * 1000
                        and not job_settings.restartable
                    )
                ):
                    self.logger.info(
                        "Skpping job %s due to workflow, or is disabled, or worker start time is before task run date and is not restartable",
                        job_id,
                    )
                    skipped = True

                # Step 2: Atomically update task state to running and mark as already run
                max_run_reached = False
                task_detail.celery_task_id = task_id

                if skipped:
                    set_task_status_and_result(
                        task_detail, TaskDetail.STATUS_SKIPPED, "SKIPPED"
                    )
                else:
                    logger.debug(
                        "job_run_count=%s job_max_run=%s",
                        job_settings.run_count,
                        job_settings.max_run,
                    )
                    if (
                        job_settings.run_count == job_settings.max_run
                        and not job_settings.run_forever
                        and task_detail.retry_count == 0
                    ):
                        max_run_reached = True
                        skipped = True

                    if max_run_reached:
                        set_task_status_and_result(
                            task_detail, TaskDetail.STATUS_CANCELLED, "CANCELLED"
                        )
                    else:
                        set_task_status_and_result(
                            task_detail, TaskDetail.STATUS_NONE, "RUNNING"
                        )
                        task_detail.run_account = run_account
                        task_detail.already_run = True

                task_detail.save(
                    update_fields=[
                        "run_date",
                        "status",
                        "celery_task_id",
                        "run_account",
                        "already_run",
                        "task_result",
                    ]
                )

                if skipped:
                    raise Ignore()

                # Step 3: Handle next run date and logging (outside atomic)
                self._handle_before_start_next_run(
                    task_detail, job_settings, actual_start_date, on_retry
                )
            except Ignore:
                self.logger.info("Task %s ignored due to workflow conditions", task_id)
                self.clear_caches()
                raise
            except Exception as e:
                self.logger.exception("Error in before_start for %s: %s", task_id, e)
                raise e
            finally:
                # no matter what, handle before_start scheduling
                try:
                    if (
                        not job_settings
                        or workflow_run_id
                        or not job_settings.is_enable
                    ):
                        return

                    self._handle_before_start_scheduling(
                        task_detail, job_settings, on_retry=on_retry
                    )
                except Exception as e:
                    self.logger.error(
                        "Error in before_start scheduling for task %s: %s", task_id, e
                    )

    def _handle_before_start_scheduling(
        self, task_detail: TaskDetail, job_settings: JobSettings, **kwargs
    ) -> None:
        """Handle scheduling of forever tasks in before_start."""
        on_retry = kwargs.get("on_retry", False)

        if (
            (job_settings.run_forever or job_settings.run_count < job_settings.max_run)
            and not task_detail.manually_run
            and on_retry is not True
        ):
            try:
                rrule_schedule_task(job_settings=job_settings)
            except Exception as e:
                self.logger.error("Fail to create forever task: %s", e)

    def _handle_before_start_next_run(
        self,
        task_detail: TaskDetail,
        job_settings: JobSettings,
        actual_start_date: int,
        on_retry: bool = False,
    ) -> None:
        """Handle next run date and logging in before_start."""
        request = self.request

        # Step 1: Prepare job settings for running state
        job_settings.job_operation = "RUNNING"
        job_settings.last_task_done = False
        update_fields = ["job_operation", "last_task_done"]
        # Step 2: If not a manual run, calculate next run date and increment run count
        next_run_date_int = None
        if not task_detail.manually_run:
            next_run_date = get_next_run_date(
                start_date=job_settings.start_date,
                end_date=job_settings.end_date,
                rrule_str=job_settings.repeat_interval,
                tz=job_settings.timezone,
            )
            job_settings.next_run_date = next_run_date
            update_fields += ["next_run_date"]
            next_run_date_int = (
                (int(next_run_date.timestamp() * 1000)) if next_run_date else None
            )
        if task_detail.retry_count == 0:
            job_settings.increase_run_count()
            update_fields += ["run_count"]
        job_settings.last_run_date = request.eta
        # Step 4: Save all job settings changes in one DB call
        job_settings.save(update_fields=update_fields)
        self.logger.info("run count: %s", job_settings.run_count)
        # Step 5: Add task to Redis set for job tracking
        # redis_key = f"job_id:{job_settings.job_id}"
        # try:
        #     add_to_set(redis_key, task_detail.task_name)
        # except Exception as e:
        #     self.logger.warning(f"Failed to add to redis set {redis_key}: {e}")
        # Step 6: Prepare and send log data to scheduler
        operation = "RUN"
        context = "hook before_start"

        if on_retry:
            operation = "RETRY_RUN"
            context = "hook on_retry"

        method = "create"
        body = self.convert_task_detail_to_log_data(
            task_detail=task_detail,
            job_settings=job_settings,
            result=None,
            operation=operation,
            method=method,
            error_no=None,
            error_detail=None,
            next_run_date=next_run_date_int,
            actual_start_date=actual_start_date,
        )
        success = self._log_and_call_scheduler(body, method, context)

        workflow_run_id = None
        log_id = None
        task_cache = self.get_task_cache()

        if task_cache:
            workflow_run_id = task_cache.workflow_run_id
            log_id = task_cache.job_log_id

        if success:
            save_task_to_local(
                self.request.id,
                body=dict(
                    celery_task_id=self.request.id,
                    job_id=job_settings.job_id,
                    workflow_run_id=workflow_run_id,
                    workflow_id=job_settings.workflow_id,
                    task_id=task_detail.id if task_detail else None,
                    log_id=log_id,
                ),
            )

    def on_success(self, retval: Any, task_id: str, args: tuple, kwargs: dict) -> None:
        """Celery hook called when task succeeds."""
        with tracer.start_as_current_span("on_success_span") as span:
            self.add_trace_attribute(span, retval=str(retval))

            if isinstance(retval, dict) and retval.get("success") is False:
                exc = Exception(retval.get("error")) if retval.get("error") else None
                return self.on_failure(exc, task_id, args, kwargs, None)

            if isinstance(retval, dict) and retval.get("success") is False:
                error = Exception(retval.get("error")) if retval.get("error") else None

                return self.on_failure(error, task_id, args, kwargs, None)

            self.logger.debug("Hook on_success for task with id: %s", task_id)
            try:
                is_revoked = self.get_cache_value("is_revoked", False)
                if is_revoked:
                    self.logger.debug(
                        "Task %s is revoked, skipping on_success", task_id
                    )
                    return

                task_detail, job_settings = self._get_task_and_job(task_id=task_id)
                if not task_detail or not job_settings:
                    self.logger.error(
                        "TaskDetail or JobSettings not found for on_success task_id %s.",
                        task_id,
                    )
                    return
                self._handle_success_update(task_detail, job_settings, retval, task_id)
            except Exception as e:
                span.record_exception(e)
                span.set_status(
                    trace.Status(trace.StatusCode.ERROR, "Error in on_success")
                )
                self.logger.error("Error in task %s: %s", self.name, e)

    def _handle_success_update(
        self,
        task_detail: TaskDetail,
        job_settings: JobSettings,
        retval: Any,
        task_id: str,
    ) -> None:
        """Handle status, result, and logging for on_success."""
        # Accumulate TaskDetail changes
        self._count_duration_in_memory(task_detail)
        set_task_status_and_result(task_detail, TaskDetail.STATUS_SUCCESS, "SUCCESS")
        task_detail.save(update_fields=["run_duration", "status", "task_result"])
        error_no = (
            SUCCESS_HTTP_CODE
            if job_settings.function_name == "celerytasks.tasks.rest_api"
            else None
        )
        body = self.convert_task_detail_to_log_data(
            task_detail=task_detail,
            job_settings=job_settings,
            result=None,
            operation=None,
            method="update",
            error_no=error_no,
            error_detail=None,
            next_run_date=None,
            reset_task_retry_count=True,
        )
        self._log_and_call_scheduler(body, "update", "hook on_success")
        # is_required_check = check_related_workflow_job(job_settings)
        # if is_required_check:
        #     body = {
        #         "workflow_id": job_settings.workflow_id,
        #         "latest_status": "SUCCESS",
        #         "current_job_id": job_settings.job_id,
        #     }
        #     try:
        #         call_scheduler_workflow_update(body)
        #     except Exception as e:
        #         self.logger.warning(f"Failed to update workflow status: {e}")

    def on_failure(
        self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo
    ) -> None:
        """Celery hook called when task fails."""
        with tracer.start_as_current_span("on_failure_span") as span:
            self.add_trace_attribute(span)
            span.record_exception(exc)
            span.set_status(trace.Status(trace.StatusCode.ERROR, "Task failed"))
            self.logger.info("Hook on_failure for task with id: %s", task_id)
            try:
                is_revoked = self.get_cache_value("is_revoked", False)
                if is_revoked:
                    return

                task_detail, job_settings = self._get_task_and_job(task_id=task_id)
                if not task_detail or not job_settings:
                    self.logger.error(
                        "TaskDetail or JobSettings not found for on_failure task_id %s.",
                        task_id,
                    )
                    return
                self._handle_failure_update(task_detail, job_settings, exc, task_id)
            except Exception as e:
                span.record_exception(e)
                span.set_status(
                    trace.Status(trace.StatusCode.ERROR, "Error in on_failure handling")
                )
                self.logger.error("Error in task %s: %s", self.name, e)
                return

    def _handle_failure_update(
        self,
        task_detail: TaskDetail,
        job_settings: JobSettings,
        exc: Exception,
        task_id: str,
    ) -> None:
        """Handle status, result, and logging for on_failure."""
        set_task_status_and_result(task_detail, TaskDetail.STATUS_FAILURE, "FAILED")
        task_detail.save(update_fields=["status", "task_result"])
        job_settings.increase_failure_count()
        job_settings.save(update_fields=["failure_count"])
        if isinstance(exc, HTTPError):
            error_no = exc.response.status_code
            output = exc.response.text
        elif isinstance(exc, ExecutableError):
            error_no = exc.status_code
            output = exc.error_details if exc.error_details else exc.output
        else:
            error_no = DEFAULT_ERROR_CODE
            output = str(exc)
        body = self.convert_task_detail_to_log_data(
            task_detail=task_detail,
            job_settings=job_settings,
            result=None,
            operation=None,
            method="update",
            error_no=error_no,
            error_detail=extract_error_message(output),
            next_run_date=None,
        )
        self._log_and_call_scheduler(body, "update", "hook on_failure")
        # is_required_check = check_related_workflow_job(job_settings)
        # if is_required_check:
        #     body = {
        #         "workflow_id": job_settings.workflow_id,
        #         "latest_status": "FAILED",
        #         "current_job_id": job_settings.job_id,
        #     }
        #     try:
        #         call_scheduler_workflow_update(body)
        #     except Exception as e:
        #         self.logger.warning(f"Failed to update workflow status: {e}")
        self.logger.error("Task %s: %s marked as FAILED", task_id, exc)

    def on_retry(
        self, exc: Exception, task_id: str, args: tuple, kwargs: dict, einfo
    ) -> None:
        """Celery hook called when task is retried."""
        with tracer.start_as_current_span("on_retry_span") as span:
            self.add_trace_attribute(span)
            span.record_exception(exc)
            self.logger.debug("Hook on_retry for task with id: %s", task_id)
            try:
                task_name = args[1]
                task_detail, job_settings = self._get_task_and_job(task_id=task_id)
                if not task_detail or not job_settings:
                    self.logger.error(
                        "TaskDetail or JobSettings not found for on_retry task_id %s.",
                        task_id,
                    )
                    return
                self._handle_retry_update(task_detail, job_settings, exc, task_name)
            except Exception as e:
                span.record_exception(e)
                span.set_status(
                    trace.Status(trace.StatusCode.ERROR, "Error in on_retry handling")
                )
                self.logger.error("Error in on_retry for %s: %s", task_id, e)
                return

    def _handle_retry_update(
        self,
        task_detail: TaskDetail,
        job_settings: JobSettings,
        exc: Exception,
        task_name: str,
    ) -> None:
        """Handle status, result, and logging for on_retry."""
        set_task_status_and_result(task_detail, TaskDetail.STATUS_FAILURE)
        task_detail.save(update_fields=["status"])
        self.logger.info("Retrying task %s for job %s.", task_name, job_settings.job_id)

    def after_return(
        self, status: str, retval: Any, task_id: str, args: tuple, kwargs: dict, einfo
    ) -> None:
        """Celery hook called after task returns (success or failure)."""
        with tracer.start_as_current_span("after_return_span") as span:
            self.add_trace_attribute(span, status=status, retval=str(retval))

            if einfo and einfo.type is Ignore:
                self.logger.debug(
                    "Task %s was ignored, skipping after_return processing", task_id
                )
                return

            self.logger.debug("Hook after_return for task with id: %s", task_id)
            try:
                is_revoked = self.get_cache_value("is_revoked", False)
                if is_revoked:
                    return

                task_detail, job_settings = self._get_task_and_job(task_id=task_id)
                if not task_detail or not job_settings:
                    self.logger.error(
                        "TaskDetail or JobSettings not found for after_return task_id %s.",
                        task_id,
                    )
                    return
                self._handle_after_return_update(task_detail, job_settings, retval)
            except Exception as e:
                span.record_exception(e)
                span.set_status(
                    trace.Status(trace.StatusCode.ERROR, "Error in after_return")
                )
                self.logger.error("Error in after_return for %s: %s", task_id, e)
            finally:
                self.clear_caches()

    def _calculate_run_operation_status(
        self, task_detail: TaskDetail, job_settings: JobSettings
    ) -> OperationType:
        """
        Determine the operation status for a task/job run after completion.
        - If the current task is the latest for the job and failed, return BROKEN.
        - If the current task is the latest and succeeded, return COMPLETED.
        - If not the latest and failed, return FAILED.
        - Otherwise, return RUN.
        Args:
            task_detail (TaskDetail): The task instance being evaluated.
            job_settings (JobSettings): The job settings for the task.
        Returns:
            OperationType: Enum value representing the operation status.
        """
        latest_task = (
            TaskDetail.objects.filter(
                job=job_settings, soft_delete=False, already_run=True
            )
            .only("id", "status", "run_date")
            .order_by("-run_date")
            .first()
        )

        self.logger.debug(
            "TaskDetail: %s Latest task: %s Job settings: %s",
            task_detail.id,
            latest_task.id,
            job_settings.job_id,
        )

        if (
            task_detail.id == latest_task.id
            and not job_settings.run_forever
            and job_settings.run_count >= job_settings.max_run
        ):
            if task_detail.status == TaskDetail.STATUS_FAILURE:
                operation = OperationType.BROKEN
            else:
                operation = OperationType.COMPLETED
        else:
            if self.request.retries:
                operation = OperationType.RETRY_RUN
            else:
                if task_detail.status == TaskDetail.STATUS_FAILURE:
                    operation = OperationType.FAILED
                else:
                    operation = OperationType.RUN

        return operation

    def _handle_after_return_update(
        self, task_detail: TaskDetail, job_settings: JobSettings, retval: Any
    ) -> None:
        """Handle status, result, and logging for after_return."""
        success = False
        if job_settings.auto_drop:
            job_settings.max_run = job_settings.run_count
            job_settings.run_forever = False
            job_settings.save(update_fields=["max_run", "run_forever"])
            next_tasks = get_next_tasks(job_settings.job_id, task_detail.id)
            for next_task in next_tasks:
                next_task.task_result = "REVOKED"
                next_task.soft_delete = True
                next_task.save(update_fields=["task_result", "soft_delete"])
                if next_task.celery_task_id is not None:
                    result = AsyncResult(next_task.celery_task_id, app=app)
                    result.revoke(terminate=True, signal="SIGKILL")
                    for ar in walk_results(result.children or []):
                        ar.revoke(terminate=True, signal="SIGKILL")
                        app.control.revoke(ar.id, terminate=True, signal="SIGKILL")
                    app.control.revoke(
                        next_task.celery_task_id, terminate=True, signal="SIGKILL"
                    )
                PeriodicTask.objects.filter(name=next_task.task_name).delete()
            PeriodicTask.objects.filter(description=job_settings.job_id).delete()
        operation = self._calculate_run_operation_status(task_detail, job_settings)
        next_run_date = 1 if operation == OperationType.COMPLETED else None
        body = self.convert_task_detail_to_log_data(
            task_detail,
            job_settings,
            retval,
            operation.value,
            "update",
            None,
            None,
            next_run_date,
            None,
            "",
            True if task_detail.status == TaskDetail.STATUS_SUCCESS else False,
        )
        try:
            success = self._log_and_call_scheduler(body, "update", "hook after_return")
            job_settings.save_operation(operation.value, task_detail.status)
        except Exception as e:
            self.logger.warning("Failed to save job operation: %s", e)
            success = False
        finally:
            if success:
                remove_task_from_local(self.request.id)
        task_detail.retry_count = 0
        task_detail.save(update_fields=["retry_count"])
        job_settings.retry_count = 0
        job_settings.save(update_fields=["retry_count"])

    def task_call_update_run_log(
        self,
        task_detail: TaskDetail,
        job_settings: JobSettings,
        actual_start_date: Optional[int] = None,
    ) -> Optional[Dict]:
        """Create log data for task call updates."""
        try:
            task_cache = self.get_task_cache()
            workflow_run_id = None
            log_id = None

            if task_cache:
                workflow_run_id = task_cache.workflow_run_id
                log_id = task_cache.job_log_id

            task_detail.refresh_from_db(fields=["retry_count"])
            job_settings.refresh_from_db(
                fields=["run_count", "failure_count", "retry_count"]
            )
            logger.debug(
                "task_call_update_run_log: task_name=%s task_status=%s task_retry_count=%s job_retry_count=%s",
                task_detail.task_name,
                task_detail.status,
                task_detail.retry_count,
                job_settings.retry_count,
            )
            output = {
                "job_id": task_detail.job.job_id,
                "user_name": task_detail.run_account,
                "run_duration": None,
                "additional_info": None,
                "celery_task_name": f"{task_detail.task_name}_{task_detail.retry_count}",
                "run_count": job_settings.run_count,
                "failure_count": job_settings.failure_count,
                "job_retry_count": job_settings.retry_count,
                "retry_count": task_detail.retry_count,
            }

            if workflow_run_id:
                output["workflow_run_id"] = workflow_run_id
            if log_id:
                output["log_id"] = log_id

            if task_detail.status != TaskDetail.STATUS_NONE and not (
                task_detail.manually_run
                and task_detail.status == TaskDetail.STATUS_CREATED
            ):
                output["status"] = task_detail.status

            if task_detail.manually_run:
                output["batch_type"] = "Manual"

            if actual_start_date:
                output["actual_start_date"] = actual_start_date

            return output
        except Exception as e:
            logger.error("Error in converting task detail to log data: %s", e)
            return None

    def convert_task_detail_to_log_data(
        self,
        task_detail: TaskDetail,
        job_settings: JobSettings,
        result: Any,
        operation: Optional[str],
        method: str,
        error_no: Optional[int],
        error_detail: Optional[str],
        next_run_date: Optional[int],
        actual_start_date: Optional[int] = None,
        status: str = "",
        reset_task_retry_count: Optional[bool] = False,
    ) -> Optional[Dict]:
        """Convert task detail and job settings to log data format."""
        try:
            task_cache = self.get_task_cache()
            workflow_run_id = None
            log_id = None

            if task_cache:
                workflow_run_id = task_cache.workflow_run_id
                log_id = task_cache.job_log_id

            task_detail.refresh_from_db(fields=["retry_count"])
            job_settings.refresh_from_db(
                fields=["run_count", "failure_count", "retry_count"]
            )
            logger.debug(
                "convert_task_detail_to_log_data: task_name=%s task_status=%s task_retry_count=%s job_retry_count=%s",
                task_detail.task_name,
                task_detail.status,
                task_detail.retry_count,
                job_settings.retry_count,
            )
            output = {
                "job_id": task_detail.job.job_id,
                "user_name": task_detail.run_account,
                "run_duration": (
                    str(task_detail.run_duration) if task_detail.run_duration else None
                ),
                "additional_info": None,
                "celery_task_name": f"{task_detail.task_name}_{task_detail.retry_count}",
                "run_count": job_settings.run_count,
                "failure_count": job_settings.failure_count,
                "job_retry_count": job_settings.retry_count,
                "retry_count": task_detail.retry_count
                if reset_task_retry_count is False
                else 0,
                "workflow_priority": job_settings.priority,
                "workflow_run_id": workflow_run_id,
                "log_id": log_id,
            }

            if method == "create":
                output["req_start_date"] = datetime_to_epoch(task_detail.run_date)
                output["actual_start_date"] = actual_start_date

            if operation:
                output["operation"] = operation

            if task_detail.status != TaskDetail.STATUS_NONE:
                output["status"] = task_detail.status

            if status != "":
                output["status"] = status

            if (
                task_detail.check_final_state()
                or status == TaskDetail.STATUS_SUCCESS
                or status == TaskDetail.STATUS_FAILURE
                or status == TaskDetail.STATUS_CANCELLED
            ):
                output["actual_end_date"] = get_current_time()

            if task_detail.status != TaskDetail.STATUS_FAILURE:
                output["output"] = str(result)

            if error_no is not None:
                output["error_no"] = error_no
                output["errors"] = error_detail

            if task_detail.manually_run:
                output["batch_type"] = "Manual"

            if next_run_date is not None:
                output["next_run_date"] = next_run_date

            logger.debug("/logs/%s: %s", method, output)
            return output
        except Exception as e:
            logger.error("Error in converting task detail to log data: %s", e)
            return None
