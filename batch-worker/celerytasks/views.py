import ast
import json
import time as _time
from contextlib import contextmanager
from datetime import datetime
from typing import List

import pytz
import requests
from celery.result import AsyncResult
from collections.abc import Iterable
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django_celery_beat.models import ClockedSchedule, PeriodicTask

from batchbe.celery import app
from batchbe.settings import BASE_URL
from logger import get_logger

from .models import JobSettings, TaskDetail
from .utils import (
    get_next_run_date,
    validate_rrule,
)

logger = get_logger()


class CeleryBeTask:
    def __init__(self, celery_task_name, run_date, next_run_date):
        self.celery_task_name = celery_task_name
        self.run_date = run_date
        self.next_run_date = next_run_date


@contextmanager
def log_time(label, logger):
    start = _time.monotonic()
    try:
        yield
    finally:
        elapsed = _time.monotonic() - start
        logger.info(f"[timing] {label}: {elapsed:.4f}s")


@csrf_exempt
def delete_task(request, task_id):
    if request.method == "DELETE":
        task = PeriodicTask.objects.get(id=task_id)
        task.delete()
        return JsonResponse(
            {"status": "success", "message": "Task deleted successfully."}
        )

    return JsonResponse({"status": "failure", "message": "Invalid request method."})


def validate_job_settings(job_settings):
    """Validate required fields in job settings."""
    logger.info("Validating job settings...")
    required_fields = ["job_type", "job_id", "queue_name"]
    for field in required_fields:
        if not getattr(job_settings, field, None):
            logger.error("Validation failed: Missing required field %s", field)
            raise ValueError(f"Missing required field: {field}")
    logger.info("Job settings validation successful.")


def parse_job_action(job_type, job_action):
    """Parse job_action for REST API type jobs."""
    logger.info("Parsing job_action for job_type: %s", job_type)
    if job_type.lower() == "rest_api":
        job_action = ast.literal_eval(job_action)
        logger.info("Parsed job_action for REST API.")
    return job_action


def validate_rrule_input(rrule_str):
    """Validate RRULE input and return its dictionary form."""
    logger.info("Validating RRULE input: %s", rrule_str)
    validity, rrule_dict = validate_rrule(rrule_str)
    if not validity:
        logger.error("RRULE validation failed: %s", rrule_str)
        raise ValueError(f"Invalid RRULE FORMAT: {rrule_str}")
    logger.info("RRULE validation successful.")
    return rrule_dict


def calculate_next_runs(start_date, end_date, rrule_str, timezone):
    """Calculate the next run date for the task and return it as a list of datetime objects."""
    logger.info("Calculating next run dates...")

    # Retrieve the next run date as a string or formatted datetime
    next_run_date = get_next_run_date(
        start_date=start_date, end_date=end_date, rrule_str=rrule_str, tz=timezone
    )
    logger.info("Initial next run date: %s", next_run_date)

    if not next_run_date:
        return []

    # Convert next_run_date to a datetime object with UTC tzinfo if necessary
    if isinstance(next_run_date, str):
        next_run_date = datetime.strptime(next_run_date, "%Y-%m-%d %H:%M:%S%z")
    elif next_run_date.tzinfo is None:
        next_run_date = next_run_date.replace(tzinfo=pytz.UTC)

    # Return as a list containing the datetime object
    next_runs = [next_run_date]
    logger.info("Calculated next run dates: %s", next_runs)

    return next_runs


def create_clocked_schedules(next_runs: List[datetime]) -> List[ClockedSchedule]:
    """Create clocked schedules based on next run times."""
    logger.info("Creating clocked schedules...")
    clocked_schedules = []
    for run_time in next_runs:
        clocked_schedule = ClockedSchedule.objects.create(clocked_time=run_time)
        logger.info("Created ClockedSchedule at time: %s", run_time)
        clocked_schedules.append(clocked_schedule)
    return clocked_schedules


def create_celery_tasks(job_id: str, next_runs: List[datetime]) -> List[CeleryBeTask]:
    """Create Celery tasks based on the next run times."""
    logger.info("Creating Celery tasks...")
    celery_tasks = []
    for i, next_run in enumerate(next_runs):
        next_run_date = next_runs[i + 1] if i + 1 < len(next_runs) else None
        next_run_str = next_run.strftime("%Y-%m-%d %H:%M:%S%z") if next_run else ""
        celery_task = CeleryBeTask(
            celery_task_name=f"{job_id}_{next_run_str}",
            run_date=next_run,
            next_run_date=str(next_run_date),
        )
        logger.info(
            "Created CeleryBeTask: %s, run_date: %s",
            celery_task.celery_task_name,
            next_run,
        )
        celery_tasks.append(celery_task)
    return celery_tasks


def save_periodic_tasks(
    job_settings, clocked_schedules, celery_tasks, function_name, queue_name
):
    """Create and save PeriodicTask objects."""
    logger.info("Saving PeriodicTask objects...")
    tasks = []

    for i, clocked_schedule in enumerate(clocked_schedules):
        task_name = celery_tasks[i].celery_task_name
        try:
            # First try to get existing task by name
            logger.debug(
                "Creating periodic task: %s; job_id: %s",
                task_name,
                job_settings.job_id,
            )
            task = PeriodicTask.objects.filter(name=task_name).first()

            if task:
                # Task exists, update it with new parameters
                logger.info("Found existing PeriodicTask: %s, updating...", task_name)
                task.clocked = clocked_schedule
                task.task = function_name
                task.description = job_settings.job_id
                task.queue = queue_name
                task.exchange = queue_name
                task.routing_key = queue_name
                task.enabled = job_settings.is_enable
                task.priority = job_settings.priority
                task.args = json.dumps(
                    [
                        job_settings.job_action,
                        task_name,
                        job_settings.job_id,
                        job_settings.run_account,
                        celery_tasks[i].next_run_date,
                    ]
                )
                task.save()
            else:
                # Task doesn't exist, create new one
                logger.info("Creating new PeriodicTask: %s", task_name)
                task = PeriodicTask.objects.create(
                    clocked=clocked_schedule,
                    name=task_name,
                    task=function_name,
                    one_off=True,
                    description=job_settings.job_id,
                    queue=queue_name,
                    exchange=queue_name,
                    routing_key=queue_name,
                    enabled=job_settings.is_enable,
                    priority=job_settings.priority,
                    args=json.dumps(
                        [
                            job_settings.job_action,
                            task_name,
                            job_settings.job_id,
                            job_settings.run_account,
                            celery_tasks[i].next_run_date,
                        ]
                    ),
                )

            tasks.append(task_name)
            logger.info(
                "Saved PeriodicTask: %s; job_id: %s", task_name, job_settings.job_id
            )
        except Exception as e:
            logger.error(f"Failed to save PeriodicTask {task_name}: {e}")
            raise
    return tasks


def save_task_details(job_settings, clocked_schedules, celery_tasks):
    """Create and save TaskDetail objects."""
    logger.info("Saving TaskDetail objects...")
    for i, clocked_schedule in enumerate(clocked_schedules):
        try:
            task_detail, created = TaskDetail.objects.get_or_create(
                job=job_settings,
                task_name=celery_tasks[i].celery_task_name,
                run_date=clocked_schedule.clocked_time,
            )
            logger.info("Created TaskDetail: %s", celery_tasks[i].celery_task_name)
        except Exception as e:
            logger.error(
                "Failed to save TaskDetail for %s: %s",
                celery_tasks[i].celery_task_name,
                e,
            )
            raise


@csrf_exempt
@transaction.atomic
def rrule_schedule_task(job_settings) -> List[str]:
    """Main function to schedule tasks."""
    try:
        logger.info("Received request to create interval task: %s", job_settings)
        with log_time("rrule_schedule_task: validate_job_settings", logger):
            validate_job_settings(job_settings)
        with log_time("rrule_schedule_task: calculate_next_runs", logger):
            next_runs = calculate_next_runs(
                start_date=job_settings.start_date,
                end_date=job_settings.end_date,
                rrule_str=job_settings.repeat_interval,
                timezone=job_settings.timezone,
            )
        with log_time("rrule_schedule_task: create_clocked_schedules", logger):
            clocked_schedules = create_clocked_schedules(next_runs)
        with log_time("rrule_schedule_task: create_celery_tasks", logger):
            celery_tasks = create_celery_tasks(job_settings.job_id, next_runs)
        function_name = f"celerytasks.tasks.{job_settings.job_type.lower()}"
        with log_time("rrule_schedule_task: save_periodic_tasks", logger):
            task_names = save_periodic_tasks(
                job_settings,
                clocked_schedules,
                celery_tasks,
                function_name,
                job_settings.queue_name,
            )
        with log_time("rrule_schedule_task: save_task_details", logger):
            save_task_details(job_settings, clocked_schedules, celery_tasks)
        logger.info("Successfully created tasks: %s", task_names)
        return task_names
    except ValueError as ve:
        logger.error("Validation Error: %s", str(ve))
        raise
    except Exception as e:
        logger.error("Unexpected Error: %s", str(e))
        raise


@csrf_exempt
def force_terminate_task(request):
    if request.method == "POST":
        data = json.loads(request.body)
        job_id = data.get("job_id")
        latest_task = get_latest_running_task(job_id)
        if latest_task is None:
            return JsonResponse(
                {
                    "status": "error",
                    "message": f"No running job found for job_id {job_id}",
                },
                status=404,
            )

        task_id = latest_task.celery_task_id
        result = AsyncResult(task_id, app=app)
        result.revoke(terminate=True, signal="SIGKILL")
        latest_task.save_status(TaskDetail.STATUS_STOPPED)
        request_body = convert_scheduler_log_update_body(
            task_detail=latest_task, operation="BLOCKED", job_settings=None, result=None
        )
        if request_body is not None:
            success = call_scheduler_run_log(request_body, "update")
            if success:
                logger.info(
                    "Successfully update scheduler run log for force stop %s", job_id
                )
            else:
                logger.error(
                    "Failed to update scheduler run log for force stop %s", job_id
                )

        return JsonResponse(
            {
                "status": "success",
                "message": f"Job {job_id} force terminated with task_id {task_id}.",
            }
        )
    return JsonResponse({"status": "failure", "message": "Invalid request method."})


# Fields that only exist in JobSettings
JOB_SETTINGS_ONLY_FIELDS = {
    "start_date",
    "end_date",
    "repeat_interval",
    "max_run",
    "max_run_duration",
    "max_failure",
    "auto_drop",
    "restart_on_failure",
    "restartable",
    "priority",
    "job_action",
    "job_body",
    "job_type",
    "queue_name",
    "user_name",
    "retry_delay",
}


def get_latest_running_task(job_id):
    job_settings = JobSettings.objects.filter(job_id=job_id).first()
    latest_job = (
        TaskDetail.objects.filter(job=job_settings, status=TaskDetail.STATUS_NONE)
        .order_by("-run_date")
        .first()
    )
    return latest_job

def get_next_tasks(job_id, id):
    job_settings = JobSettings.objects.filter(job_id=job_id).first()
    next_jobs = TaskDetail.objects.filter(job=job_settings, id__gt=id)
    return next_jobs

@csrf_exempt
def update_state_job(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            logger.info("Received request to update status job with body %s", data)

            # Get job_id from the request data
            job_id = data.get("job_id")
            if not job_id:
                return JsonResponse(
                    {"status": "error", "message": "job_id parameter is required"},
                    status=400,
                )

            # Get status from the request data
            status = data.get("status")
            if status is None:
                return JsonResponse(
                    {"status": "error", "message": "status parameter is required"},
                    status=400,
                )

            # Check if status is a boolean
            if not isinstance(status, bool):
                return JsonResponse(
                    {
                        "status": "error",
                        "message": "status parameter must be a boolean",
                    },
                    status=400,
                )

            # Update JobSettings object
            job_settings = JobSettings.objects.filter(job_id=job_id).first()
            if job_settings is None:
                return JsonResponse(
                    {"status": "error", "message": f"No job found for job_id {job_id}"},
                    status=404,
                )

            job_settings.update_status(status)
            task_details = TaskDetail.objects.filter(
                job=job_settings, already_run=False, soft_delete=False
            )
            if not task_details:
                return JsonResponse(
                    {
                        "status": "success",
                        "message": "Job ran completely, no need to update status",
                    },
                    status=200,
                )

            for task in task_details:
                periodic_task = PeriodicTask.objects.filter(name=task.task_name).first()
                if not periodic_task:
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": f"No enabled tasks found for task_name {task.task_name}",
                        },
                        status=404,
                    )
                periodic_task.enabled = status
                periodic_task.save()

            logger.info(
                "Successfully updated status for job_id %s to %s", job_id, status
            )
            return JsonResponse(
                {
                    "status": "success",
                    "message": f"Successfully updated status for job_id {job_id}",
                }
            )

        except Exception as e:
            logger.error("Error updating job status: %s", str(e))
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


def get_request_data(request, required_fields):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format")
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

    return {field: data[field] for field in required_fields}


def health_check(request):
    return JsonResponse({"status": "ok"})


def call_scheduler_run_log(body, method):
    url = f"{BASE_URL}/logs/{method}"
    headers = {"Content-Type": "application/json"}
    if body is None:
        logger.error("Failed to convert task detail to log data.")
        return False

    try:
        response = requests.post(url, json=body, headers=headers)
        response.raise_for_status()
        logger.info(
            "Success push task result to scheduler with method %s and body %s",
            method,
            body,
        )
        return True
    except requests.RequestException as e:
        logger.error("Error in pushing task result to scheduler: %s", e)
        return False


def convert_scheduler_log_update_body(task_detail, job_settings, result, operation):
    try:
        log_body = {
            # Task detail attributes
            "job_id": task_detail.job.job_id,
            "operation": operation,
            "status": task_detail.status,
            "user_name": task_detail.run_account,
            "actual_start_date": int(task_detail.run_date.timestamp() * 1000),
            "run_duration": str(task_detail.run_duration)
            if task_detail.run_duration
            else None,
            "additional_info": None,
            "celery_task_name": task_detail.task_name,
        }

        # Add job settings attributes if job_settings is not None
        if job_settings:
            log_body.update(
                {
                    "error_no": job_settings.failure_count,
                    "run_count": job_settings.run_count,
                    "failure_count": job_settings.failure_count,
                    "retry_count": job_settings.retry_count,
                }
            )

        # Add result attributes if result is not None
        if result is not None:
            log_body.update(
                {
                    "errors": str(result)
                    if job_settings and job_settings.failure_count > 0
                    else None,
                    "output": str(result),
                }
            )

        return log_body
    except Exception as e:
        logger.error("Error in converting task detail to log data: %s", e)
        return None

def walk_results(root):
    """
    Depth-first generator that yields every AsyncResult
    contained in *root* (which may be an AsyncResult, a list,
    or any nested combination thereof).
    """
    stack = [root]
    while stack:
        node = stack.pop()
        if isinstance(node, AsyncResult):
            yield node
        elif isinstance(node, Iterable) and not isinstance(node, (str, bytes)):
            # push children in reverse order so left-to-right traversal
            stack.extend(reversed(node))
