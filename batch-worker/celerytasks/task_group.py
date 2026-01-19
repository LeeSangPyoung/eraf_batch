import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional

from celery import Task
from celery.exceptions import Ignore
from django_celery_beat.models import ClockedSchedule, PeriodicTask

from celerytasks import redis_helper
from celerytasks.models import JobSettings, TaskWorkflow
from celerytasks.utils import (
    LOCAL_WORKFLOW_DIR,
    call_scheduler_workflow_run_create,
    call_scheduler_workflow_update,
    get_next_run_date,
    get_worker_start_time_key,
    save_task_to_local,
)
from celerytasks.workflow import ScheduledTask, WorkflowScheduler
from logger import get_logger

logger = get_logger()


@dataclass
class WorkflowCache:
    workflow_run_id: str = None
    orders: Optional[List[List[ScheduledTask]]] = None


class TaskGroup(Task):
    """
    TaskGroup is a task that groups multiple tasks together and runs them in parallel.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._cache: Dict[str, WorkflowCache] = {}

    def get_cache(self):
        return self._cache.get(self.request.id, None)

    def set_cache(self, cache_obj: WorkflowCache):
        self._cache[self.request.id] = cache_obj

    def get_workflow_orders(self):
        cache = self.get_cache()
        if cache:
            return cache.orders

        return None

    def _get_orders(
        self, workflow_id: str, workflow_start_time_ms: int, worker_start_time: int
    ) -> Optional[List[List[ScheduledTask]]]:
        """
        Get execution order
        """
        job_settings_list: List[JobSettings] = JobSettings.objects.filter(
            workflow_id=workflow_id
        ).all()

        if not job_settings_list:
            return None

        scheduler = WorkflowScheduler()
        for job in job_settings_list:
            if (
                not job.is_enable
                or (job.run_count >= job.max_run and not job.run_forever)
                or (
                    not job.restartable
                    and worker_start_time
                    and worker_start_time > workflow_start_time_ms
                )
            ):
                continue

            scheduler.add_task(
                task_name=job.job_id,
                function_name=job.function_name,
                queue_name=job.queue_name,
                rrule_str=job.repeat_interval,
                priority=job.priority,
                start_dt=job.start_date,
                ignore_result=job.ignore_result,
                delay=job.workflow_delay,
                task_args=(
                    job.job_action,
                    str(uuid.uuid4()),
                    job.job_id,
                    job.run_account,
                    None,
                ),
                task_kwargs={},
                validate=True,
            )

        return scheduler.get_execution_order()

    def before_start(self, task_id, args, kwargs):
        workflow_id = args[0]
        workflow_start_time = (
            args[1]
            if len(args) > 1
            else (self.request.eta or datetime.now(timezone.utc))
        )
        task_workflow: TaskWorkflow = None
        logger.debug(
            "Before start workflow task_id: %s, args: %s, kwargs: %s",
            task_id,
            args,
            kwargs,
        )
        try:
            task_workflow = TaskWorkflow.objects.get(workflow_id=workflow_id)

            if not task_workflow:
                logger.error("Task workflow not found")
                raise Ignore()

            # update task workflow
            task_workflow.last_run_date = workflow_start_time
            task_workflow.save(update_fields=["last_run_date"])

            if workflow_start_time:
                if isinstance(workflow_start_time, str):
                    workflow_start_time = datetime.fromisoformat(workflow_start_time)
                if workflow_start_time.tzinfo is None:
                    workflow_start_time = workflow_start_time.replace(
                        tzinfo=timezone.utc
                    )
            else:
                workflow_start_time = datetime.now(timezone.utc)

            worker_start_time = redis_helper.get_key(get_worker_start_time_key())
            worker_start_time = int(worker_start_time) if worker_start_time else 0
            workflow_start_time_ms = int(workflow_start_time.timestamp() * 1000)

            orders = self._get_orders(
                workflow_id, workflow_start_time_ms, worker_start_time
            )
            if not orders:
                logger.info(
                    "Orders for workflow %s not found, workflow skipped", workflow_id
                )
                raise Ignore()

            workflow_start_time = workflow_start_time.replace(microsecond=0)
            # create workflow run
            response = call_scheduler_workflow_run_create(
                body={
                    "workflow_id": workflow_id,
                    "start_date": int(workflow_start_time.timestamp() * 1000),
                    "status": "RUNNING",
                },
            )
            workflow_run_id = response.get("data", {}).get("workflow_run_id")
            if not workflow_run_id:
                logger.error("Failed to create workflow run")
                raise Ignore()

            self.set_cache(
                WorkflowCache(workflow_run_id=workflow_run_id, orders=orders)
            )
            save_task_to_local(
                str(workflow_run_id),
                body=dict(
                    workflow_id=workflow_id,
                    workflow_run_id=workflow_run_id,
                ),
                base_dir=LOCAL_WORKFLOW_DIR,
            )
        except Ignore:
            self._clear_cache()
            raise
        except Exception as e:
            logger.exception("Failed to get task workflow: %s", e)
            raise e
        finally:
            self._schedule_next_flow(task_workflow)

    def _clear_cache(self):
        self._cache.clear()

    def _schedule_next_flow(self, task_workflow: TaskWorkflow):
        try:
            next_run_date = get_next_run_date(
                task_workflow.start_date,
                None,
                task_workflow.repeat_interval,
                task_workflow.timezone or "UTC",
            )

            if not next_run_date:
                return None

            clocked_schedule = ClockedSchedule.objects.create(
                clocked_time=next_run_date
            )
            # create recurring workflow
            PeriodicTask.objects.create(
                clocked=clocked_schedule,
                name=str(uuid.uuid4()),
                task="celerytasks.tasks.run_workflow",
                one_off=True,
                description=task_workflow.workflow_id,
                queue=task_workflow.queue_name,
                exchange=task_workflow.queue_name,
                routing_key=task_workflow.queue_name,
                enabled=True,
                args=json.dumps([task_workflow.workflow_id, next_run_date.isoformat()]),
            )

            # update next run date
            task_workflow.next_run_date = next_run_date
            task_workflow.save(update_fields=["next_run_date"])

            if not self.get_workflow_orders():
                response = call_scheduler_workflow_update(
                    body={
                        "workflow_id": task_workflow.workflow_id,
                        "next_run_date": None,
                    },
                )
            else:
                response = call_scheduler_workflow_update(
                    body={
                        "workflow_id": task_workflow.workflow_id,
                        "last_run_date": task_workflow.last_run_date
                        if isinstance(task_workflow.last_run_date, str)
                        else task_workflow.last_run_date.isoformat(),
                        "next_run_date": task_workflow.next_run_date
                        if isinstance(task_workflow.next_run_date, str)
                        else task_workflow.next_run_date.isoformat(),
                    },
                )

            logger.info("Workflow update response: %s", response)
        except Exception as e:
            logger.exception("Failed to schedule next flow: %s", e)

    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        try:
            super().after_return(status, retval, task_id, args, kwargs, einfo)
        finally:
            self._clear_cache()
