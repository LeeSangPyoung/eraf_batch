import json
import logging
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

# Load environment variables first
from pathlib import Path
from typing import List

from dotenv import load_dotenv

# Load .env file from project root
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# Set the Django settings module before importing Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "batchbe.settings")

# Import Django and setup after environment is loaded
import django

django.setup()

from dateutil.rrule import rrulestr
from django.db import models, transaction
from django_celery_beat.models import ClockedSchedule, PeriodicTask

from batchbe.redis_helper import (
    AcquiredError,
    RedisLock,
    peek_all_items_in_queue,
    redis_client,
)
from celerytasks.models import JobSettings, TaskDetail, TaskWorkflow
from logger import get_logger

logger = get_logger()
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


class TaskScheduler:
    """
    Scheduler for unscheduled tasks.
    """

    INTERVAL = os.getenv("SCHEDULER_INTERVAL", 30.0)
    TASK_CREATION_COOLDOWN = os.getenv("TASK_CREATION_COOLDOWN", 60)

    def __init__(self, interval: float = INTERVAL):
        self.is_running = False
        self.interval = interval

    def get_tasks_in_queue(self, queue_name: str) -> List[str]:
        """
        Get all scheduled tasks in a queue.
        """
        items = peek_all_items_in_queue(queue_name)

        scheduled_tasks = []
        for item_str in items:
            item = json.loads(item_str)
            task_name = item["headers"].get("periodic_task_name")

            if not task_name:
                continue

            scheduled_tasks.append(task_name)

        scheduled_ids = PeriodicTask.objects.filter(
            name__in=scheduled_tasks
        ).values_list("description", flat=True)

        return scheduled_ids

    def _get_missing_workflow_schedules(self, enabled_task_ids: List[str]):
        """
        Find all workflows without any active schedules.
        """
        logger.info("Getting missing workflows")
        # find all workflows without any active schedules in a single query
        missing_schedules = TaskWorkflow.objects.filter().exclude(
            workflow_id__in=enabled_task_ids
        )

        return missing_schedules

    def _get_missing_job_schedules(self, enabled_task_ids: List[str]):
        """
        Find all jobs without any active schedules.
        """
        logger.info("Getting missing schedules")
        current_dt = datetime.now(timezone.utc)

        # find all jobs without any active schedules in a single query
        # also exclude jobs that should be skipped based on run_forever, end_date, and max_run
        missing_schedules = (
            JobSettings.objects.filter(
                is_enable=True,
            )
            .exclude(
                job_id__in=enabled_task_ids,
            )
            .exclude(
                # Exclude jobs that are not run forever AND have conditions that should skip them
                models.Q(run_forever=False)
                & (
                    models.Q(end_date__lt=current_dt)
                    | models.Q(
                        max_run__isnull=False, run_count__gte=models.F("max_run")
                    )
                )
            )
        )

        return missing_schedules

    def reschedule_jobs(self, job_list: List[JobSettings], queued_task_ids: List[str]):
        """
        Reschedule jobs.
        """
        current_dt = datetime.now(timezone.utc)

        # use atomic transaction
        for job_settings in job_list:
            rrule_str = rrulestr(
                job_settings.repeat_interval, dtstart=job_settings.start_date
            )

            if job_settings.job_id in queued_task_ids:
                logger.debug(
                    "Skipping job %s because it is already in queue",
                    job_settings.job_id,
                )
                continue

            try:
                # create schedule according to the last "next run date"
                # lock row to prevent multiple ClockedSchedule being created
                with (
                    RedisLock(
                        redis_client, f"lock_periodic_task_{job_settings.job_id}"
                    ),
                    transaction.atomic(),
                ):
                    last_periodic_task = (
                        PeriodicTask.objects.select_related("clocked")
                        .filter(
                            description=job_settings.job_id,
                        )
                        .order_by("-id")
                        .first()
                    )

                    if last_periodic_task and (
                        last_periodic_task.enabled is True
                        or current_dt - last_periodic_task.clocked.clocked_time
                        <= timedelta(seconds=self.TASK_CREATION_COOLDOWN)
                    ):
                        logger.debug(
                            "Skipping job %s because it is already scheduled",
                            job_settings.job_id,
                        )
                        continue

                    next_run_date = rrule_str.after(current_dt, inc=True)

                    # Use get_or_create with prefetch optimization
                    clocked_schedule = ClockedSchedule.objects.create(
                        clocked_time=next_run_date,
                    )
                    next_run_date_utc = next_run_date.astimezone(timezone.utc)

                    # Create task name for the new schedule
                    task_name = f"{job_settings.job_id}_{next_run_date_utc.strftime('%Y%m%d%H%M%S')}"
                    logger.debug(
                        "Creating schedule for job %s - schedule: %s, task name: %s",
                        job_settings.job_id,
                        next_run_date,
                        task_name,
                    )

                    # Check if task already exists
                    try:
                        periodic_task = PeriodicTask.objects.get(task=task_name)
                        # Update existing task
                        periodic_task.clocked = clocked_schedule
                        periodic_task.save(update_fields=["clocked"])
                    except PeriodicTask.DoesNotExist:
                        # Create new task
                        periodic_task = PeriodicTask.objects.create(
                            clocked=clocked_schedule,
                            name=task_name,
                            task=job_settings.function_name,
                            one_off=True,
                            description=job_settings.job_id,
                            queue=job_settings.queue_name,
                            exchange=job_settings.queue_name,
                            routing_key=job_settings.queue_name,
                            enabled=job_settings.is_enable,
                            priority=job_settings.priority,
                            args=json.dumps(
                                [
                                    job_settings.job_action,
                                    task_name,
                                    job_settings.job_id,
                                    job_settings.run_account,
                                    None,
                                ]
                            ),
                        )

                    task_detail, _ = TaskDetail.objects.get_or_create(
                        job=job_settings,
                        task_name=task_name,
                        run_date=next_run_date,
                        run_number=0,
                    )
                    logger.info("Created schedule for job %s", job_settings.job_id)
            except AcquiredError:
                logger.warning(
                    "Job is being processed by another instance: %s",
                    job_settings.job_id,
                )
                continue
            except Exception as e:
                logger.exception(
                    "Error creating schedule for job %s: %s", job_settings.job_id, e
                )
                continue

    def reschedule_workflows(
        self, workflow_list: List[TaskWorkflow], queued_task_ids: List[str]
    ):
        """
        Reschedule workflows.
        """
        current_dt = datetime.now(timezone.utc)

        for task_workflow in workflow_list:
            if task_workflow.workflow_id in queued_task_ids:
                logger.debug(
                    "Skipping workflow %s because it is already in queue",
                    task_workflow.workflow_id,
                )
                continue
            try:
                # create schedule according to the last "next run date"
                # lock row to prevent multiple ClockedSchedule being created
                with (
                    RedisLock(
                        redis_client,
                        f"lock_periodic_task_{task_workflow.workflow_id}",
                    ),
                    transaction.atomic(),
                ):
                    last_periodic_task: PeriodicTask = (
                        PeriodicTask.objects.filter(
                            description=task_workflow.workflow_id,
                        )
                        .order_by("-id")
                        .first()
                    )
                    if last_periodic_task and (
                        last_periodic_task.enabled is True
                        or current_dt - last_periodic_task.clocked.clocked_time
                        <= timedelta(seconds=self.TASK_CREATION_COOLDOWN)
                    ):
                        logger.debug(
                            "Skipping workflow %s because it is already scheduled",
                            task_workflow.workflow_id,
                        )
                        continue

                    rrule_str = rrulestr(
                        task_workflow.repeat_interval,
                        dtstart=task_workflow.start_date,
                    )
                    next_run_date = rrule_str.after(current_dt, inc=True)
                    if not next_run_date:
                        continue

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
                        args=json.dumps(
                            [task_workflow.workflow_id, next_run_date.isoformat()]
                        ),
                    )

                    logger.info(
                        "Created schedule for workflow %s", task_workflow.workflow_id
                    )

            except AcquiredError:
                logger.warning(
                    "Workflow is being processed by another instance: %s",
                    task_workflow.workflow_id,
                )
                continue

    def start(self):
        """
        Start the scheduler.
        """
        self.is_running = True

        while self.is_running:
            start_time = time.time()
            enabled_task_ids = PeriodicTask.objects.filter(enabled=True).values_list(
                "description", flat=True
            )
            missing_job_schedules: List[JobSettings] = self._get_missing_job_schedules(
                enabled_task_ids
            )
            missing_workflow_schedules: List[TaskWorkflow] = (
                self._get_missing_workflow_schedules(enabled_task_ids)
            )

            queue_names = list(
                set(
                    [job_setting.queue_name for job_setting in missing_job_schedules]
                    + [
                        workflow_setting.queue_name
                        for workflow_setting in missing_workflow_schedules
                    ]
                )
            )
            queued_task_ids = []
            for queue_name in queue_names:
                queued_task_ids.extend(self.get_tasks_in_queue(queue_name))

            logger.info("Missing job schedules: %s", len(missing_job_schedules))
            if missing_job_schedules:
                self.reschedule_jobs(missing_job_schedules, queued_task_ids)
            logger.info(
                "Missing workflow schedules: %s", len(missing_workflow_schedules)
            )
            if missing_workflow_schedules:
                self.reschedule_workflows(missing_workflow_schedules, queued_task_ids)

            # time took
            elapsed_time = time.time() - start_time
            logger.debug("Time took: %s", elapsed_time)

            # sleep time
            time.sleep(max(self.interval - elapsed_time, 0))


if __name__ == "__main__":
    scheduler = TaskScheduler()
    scheduler.start()
