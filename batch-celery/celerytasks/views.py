import json
import uuid
from datetime import datetime
from typing import List

import requests
from celery.result import AsyncResult
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django_celery_beat.models import ClockedSchedule, PeriodicTask
from django_celery_results.models import TaskResult
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

from batchbe.celery import app
from batchbe.settings import BASE_URL
from celerytasks.workflow import WorkflowScheduler
from logger import get_logger
from request_entities.schedule_task import SchedulerTaskResponse

from .models import (
    JobSettings,
    TaskDetail,
    TaskWorkflow,
    WorkflowRunDetail,
)
from .utils import (
    check_rrule_run_forever,
    convert_epoch_to_datetime,
    create_workflow,
    datetime_to_epoch,
    get_next_run_date,
    validate_rrule,
    validate_time_stub,
)

logger = get_logger()
tracer = trace.get_tracer(__name__)


def trace_endpoint(func):
    """
    Decorator to add OpenTelemetry tracing to endpoint functions.
    """

    def wrapper(request, *args, **kwargs):
        span_name = f"{func.__module__}.{func.__name__}"

        with tracer.start_as_current_span(span_name) as span:
            # Add request metadata to span
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", request.get_full_path())
            span.set_attribute(
                "http.user_agent", request.META.get("HTTP_USER_AGENT", "")
            )
            span.set_attribute("http.remote_addr", request.META.get("REMOTE_ADDR", ""))

            try:
                # Add request body size if available
                if hasattr(request, "body"):
                    span.set_attribute("http.request.body_size", len(request.body))

                # Execute the original function
                result = func(request, *args, **kwargs)

                # Add response metadata
                if hasattr(result, "status_code"):
                    span.set_attribute("http.status_code", result.status_code)
                    if result.status_code >= 400:
                        span.set_status(Status(StatusCode.ERROR))
                    else:
                        span.set_status(Status(StatusCode.OK))

                return result

            except Exception as e:
                # Record error in span
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                logger.error(f"Error in {span_name}: {e}")
                raise

    return wrapper


class CeleryBeTask:
    """
    Represents a Celery backend task with its name, run date, and next run date.
    """

    def __init__(self, celery_task_name, run_date, next_run_date):
        self.celery_task_name = celery_task_name
        self.run_date = run_date
        self.next_run_date = next_run_date


def log_and_return_json_response(log_func, log_msg, response_data, status=200):
    """
    Helper function to log a message and return a JsonResponse.
    """
    log_func(log_msg)
    return JsonResponse(response_data, status=status)


def get_job_settings_by_id(job_id):
    """
    Retrieve JobSettings object by job_id.
    """
    return JobSettings.objects.filter(job_id=job_id).first()


def get_periodic_task_by_name(task_name):
    """
    Retrieve PeriodicTask object by task_name.
    """
    return PeriodicTask.objects.filter(name=task_name).first()


def get_task_detail_by_name(task_name):
    """
    Retrieve TaskDetail object by task_name.
    """
    return TaskDetail.objects.filter(task_name=task_name).first()


def get_task_result_by_periodic_task_name(periodic_task_name):
    """
    Retrieve TaskResult object by periodic_task_name.
    """
    return TaskResult.objects.filter(periodic_task_name=periodic_task_name).first()


def create_clocked_schedules_and_tasks(next_runs, celery_tasks):
    """
    Create ClockedSchedule and CeleryBeTask objects for each run time.
    """
    clocked_schedules = []
    for i, next_run in enumerate(next_runs):
        clocked_schedule = ClockedSchedule.objects.create(clocked_time=next_run)
        clocked_schedules.append(clocked_schedule)
        next_run_date = next_runs[i + 1] if i + 1 < len(next_runs) else None
        celery_be_task = CeleryBeTask(
            celery_task_name=str(uuid.uuid4()),
            run_date=next_run,
            next_run_date=str(next_run_date),
        )
        celery_tasks.append(celery_be_task)
    return clocked_schedules


def create_periodic_and_task_details(
    clocked_schedules,
    celery_tasks,
    function_name,
    job_id,
    queue_name,
    enable,
    priority,
    run_account,
    job_action,
    job_settings,
):
    """
    Create PeriodicTask and TaskDetail objects for each ClockedSchedule.
    """
    tasks = []
    for i, clocked_schedule in enumerate(clocked_schedules):
        task_name = celery_tasks[i].celery_task_name
        try:
            task, _ = PeriodicTask.objects.get_or_create(
                clocked=clocked_schedule,
                name=task_name,
                task=function_name,
                defaults={"one_off": True},
                description=job_id,
                queue=queue_name,
                exchange=queue_name,
                routing_key=queue_name,
                enabled=enable,
                priority=priority,
                args=json.dumps(
                    [
                        job_action,
                        task_name,
                        job_id,
                        run_account,
                        celery_tasks[i].next_run_date,
                    ]
                ),
            )
            tasks.append(task)
            logger.info(f"Save PeriodicTask: {task} to database successfully")
        except Exception as e:
            logger.error(f"Cannot save PeriodicTask to database error {e}")
            return None, JsonResponse(
                {
                    "status": "error",
                    "message": f"Cannot save PeriodicTask to database exception {e}",
                },
                status=405,
            )
        try:
            task_detail, _ = TaskDetail.objects.get_or_create(
                job=job_settings,
                task_name=task_name,
                run_date=clocked_schedule.clocked_time,
                run_number=i,
            )
            logger.info(f"Save TaskDetail: {task_detail} to database successfully")
        except Exception as e:
            logger.error(f"Cannot save TaskDetail to database error {e}")
            return None, JsonResponse(
                {
                    "status": "error",
                    "message": f"Cannot save TaskDetail to database exception {e}",
                },
                status=405,
            )
    return tasks, None


def revoke_periodic_tasks(periodic_task_names):
    """
    Revoke periodic tasks by their names.
    """
    if not periodic_task_names:
        return

    inspect = app.control.inspect()
    scheduled = inspect.scheduled()
    revoked_tasks = []

    for _, tasks in scheduled.items():
        for task_info in tasks:
            if task_info.get("name") in periodic_task_names:
                revoked_tasks.append(task_info["id"])

    if revoked_tasks:
        app.control.revoke(revoked_tasks, terminate=True, signal="SIGKILL")


@csrf_exempt
@trace_endpoint
@transaction.atomic
def delete_task(request):
    """
    Delete a periodic task by its ID.
    """
    with tracer.start_as_current_span("delete_task_operation") as span:
        required_fields = ["job_id"]
        data = get_request_data(request, required_fields)
        task_id = data.get("job_id")
        span.set_attribute("task.id", task_id)

        if request.method == "DELETE":
            try:
                with tracer.start_as_current_span(
                    "delete_periodic_task"
                ) as delete_span:
                    delete_span.set_attribute("task.id", task_id)
                    # get all periodic task names to revokes
                    periodic_task_names = PeriodicTask.objects.filter(
                        description=task_id
                    ).values_list("name", flat=True)
                    revoke_periodic_tasks(periodic_task_names)

                    PeriodicTask.objects.filter(description=task_id).delete()

                logger.info(f"Task {task_id} deleted successfully.")
                return JsonResponse(
                    {"status": "success", "message": "Task deleted successfully."},
                    status=200,
                )
            except Exception as e:
                span.set_attribute("error.type", "DeleteError")
                span.record_exception(e)
                logger.error(f"Error deleting task {task_id}: {e}")
                return JsonResponse(
                    {"status": "failure", "message": str(e)},
                    status=500,
                )

        logger.error("Invalid request method for delete_task.")
        return JsonResponse(
            {"status": "failure", "message": "Invalid request method."},
            status=405,
        )


def _parse_rrule_schedule_request(request):
    """
    Parse and validate the incoming request for rrule_schedule_task.
    Returns a dict of validated data or raises ValueError/KeyError.
    """
    required_fields = [
        "job_id",
        "max_run_duration",
        "max_failure",
        "is_enabled",
        "auto_drop",
        "restart_on_failure",
        "restartable",
        "job_type",
        "job_action",
        "repeat_interval",
        "start_date",
        "queue_name",
        "user_name",
        "retry_delay",
        "max_run",
        "timezone",
    ]
    optional_fields = [
        "end_date",
    ]

    data = get_request_data(request, required_fields, optional_fields)
    logger.info(
        f"Received request to create interval task with body {json.loads(request.body)}"
    )
    return data


def _create_job_settings_from_data(
    data, function_name, start_date, end_date, run_forever
):
    """
    Create a JobSettings object from validated data.
    Returns the created JobSettings instance.
    """
    try:
        job_settings = JobSettings.objects.create(
            job_id=data.get("job_id"),
            queue_name=data.get("queue_name"),
            function_name=function_name,
            start_date=start_date,
            end_date=end_date,
            repeat_interval=data["repeat_interval"],
            max_run_duration=data.get("max_run_duration"),
            max_run=data.get("max_run"),
            max_failure=data.get("max_failure"),
            priority=data.get("priority"),
            is_enable=data.get("is_enabled"),
            auto_drop=data.get("auto_drop"),
            restart_on_failure=data.get("restart_on_failure"),
            restartable=data.get("restartable"),
            job_type=data.get("job_type"),
            job_action=data.get("job_action"),
            run_account=data.get("user_name"),
            retry_delay=data.get("retry_delay"),
            job_body=data.get("job_body"),
            run_forever=run_forever,
            timezone=data.get("timezone"),
        )
        logger.info(f"Save job_settings: {job_settings} to database successfully")
        return job_settings
    except Exception as e:
        logger.error(f"Cannot save job_settings to database error: {e}")
        raise


def _orchestrate_rrule_task_creation(
    data, job_settings, function_name, start_date, end_date, run_forever
):
    """
    Orchestrate the creation of schedules and tasks for the rrule_schedule_task endpoint.
    Returns (next_runs, celery_tasks, error_response) tuple.
    """
    logger.info("Start date: %s, End date: %s, Data: %s", start_date, end_date, data)
    max_run_val = 1 if run_forever else data.get("max_run")
    next_run = get_next_run_date(
        rrule_str=data["repeat_interval"],
        current_run_count=job_settings.run_count,
        run_count=max_run_val,
        start_date=start_date,
        end_date=end_date,
        run_forever=run_forever,
        tz=data.get("timezone"),
        run_now=True,
    )
    if not next_run:
        raise ValueError(
            "No next run date could be determined based on the provided parameters."
        )
    celery_tasks = []
    clocked_schedules = create_clocked_schedules_and_tasks(
        [next_run] if next_run else [], celery_tasks
    )
    tasks, error_response = create_periodic_and_task_details(
        clocked_schedules,
        celery_tasks,
        function_name,
        data.get("job_id"),
        data.get("queue_name"),
        data.get("is_enabled"),
        data.get("priority"),
        data.get("user_name"),
        data.get("job_action"),
        job_settings,
    )
    return next_run, celery_tasks, error_response


def _format_rrule_schedule_response(next_runs, celery_tasks):
    """
    Format the response for rrule_schedule_task.
    """
    task_responses = [
        SchedulerTaskResponse(task.celery_task_name, datetime_to_epoch(task.run_date))
        for task in celery_tasks
    ]
    task_dicts = [task_response.to_dict() for task_response in task_responses]
    logger.info(f"Created interval task with tasks {task_dicts}")
    return JsonResponse(
        {
            "status": "success",
            "next_run_date": datetime_to_epoch(next_runs[0]) if next_runs else None,
            "tasks": task_dicts,
        }
    )


@csrf_exempt
@trace_endpoint
def rrule_schedule_task(request):
    """
    Schedule a recurring task using an RRULE string.
    """
    with tracer.start_as_current_span(name="rrule_schedule_task_operation") as span:
        if request.method != "POST":
            span.set_attribute("error.type", "InvalidMethod")
            logger.error("Invalid request method for rrule_schedule_task.")
            return JsonResponse(
                {"status": "error", "message": "Invalid request method"},
                status=405,
            )

        try:
            # Parse request data
            with transaction.atomic():
                with tracer.start_as_current_span("parse_request_data") as parse_span:
                    data = _parse_rrule_schedule_request(request)
                    parse_span.set_attribute("request.data_size", len(str(data)))

                job_id = data.get("job_id")
                job_type = data.get("job_type")
                queue_name = data.get("queue_name")
                rrule_str = data["repeat_interval"]

                # Add job metadata to span
                span.set_attribute("job.id", job_id)
                span.set_attribute("job.type", job_type)
                span.set_attribute("job.queue", queue_name)
                span.set_attribute("job.rrule", rrule_str)

                # Validate job type
                if not job_type:
                    span.set_attribute("error.type", "MissingJobType")
                    logger.error("Job type is required.")
                    return JsonResponse(
                        {"status": "failure", "message": "Job type is required."},
                        status=400,
                    )

                # Validate required fields
                if not job_type or not job_id or not queue_name:
                    span.set_attribute("error.type", "MissingRequiredFields")
                    logger.error("Job function, job name, and queue name are required.")
                    return JsonResponse(
                        {
                            "status": "failure",
                            "message": "Job function and job name and queue name are required.",
                        },
                        status=400,
                    )

                # Validate RRULE
                with tracer.start_as_current_span("validate_rrule") as validate_span:
                    validate_span.set_attribute("rrule.string", rrule_str)
                    validity, rrule_dict = validate_rrule(rrule_str)

                    if not validity:
                        validate_span.set_attribute("error.type", "InvalidRRULE")
                        logger.error(f"Invalid RRULE FORMAT: {rrule_str}")
                        return JsonResponse(
                            {
                                "status": "error",
                                "message": "Invalid Repeat Interval: The value entered does not comply with the allowed format or range.",
                            },
                            status=400,
                        )

                # Process dates
                with tracer.start_as_current_span("process_dates") as date_span:
                    start_date = convert_epoch_to_datetime(data["start_date"])
                    end_date_obj = data.get("end_date")
                    end_date = (
                        convert_epoch_to_datetime(end_date_obj)
                        if end_date_obj
                        else None
                    )

                    date_span.set_attribute("start_date", str(start_date))
                    if end_date:
                        date_span.set_attribute("end_date", str(end_date))

                    # Validate time stub
                    valid_time_stub = validate_time_stub(data, None, "create")
                    if not valid_time_stub:
                        date_span.set_attribute("error.type", "InvalidTimeData")
                        logger.error(
                            f"Invalid time data input: {start_date}, {end_date}"
                        )
                        return JsonResponse(
                            {
                                "status": "error",
                                "message": f"Invalid time data input: {start_date}, {end_date}",
                            },
                            status=400,
                        )

                # Check run forever
                with tracer.start_as_current_span("check_run_forever") as run_span:
                    run_forever = check_rrule_run_forever(
                        rrule_dict=rrule_dict,
                        end_date=end_date,
                        max_run=data.get("max_run"),
                    )
                    run_span.set_attribute("run_forever", run_forever)

                # Create job settings
                with tracer.start_as_current_span(
                    "create_job_settings"
                ) as settings_span:
                    function_name = f"celerytasks.tasks.{job_type.lower()}"
                    settings_span.set_attribute("function_name", function_name)

                    try:
                        job_settings = _create_job_settings_from_data(
                            data, function_name, start_date, end_date, run_forever
                        )
                        settings_span.set_attribute(
                            "job_settings.job_id", job_settings.job_id
                        )
                    except Exception as e:
                        settings_span.set_attribute(
                            "error.type", "JobSettingsCreationError"
                        )
                        settings_span.record_exception(e)
                        logger.error(
                            f"Save job_settings to database with exception {e}"
                        )
                        return JsonResponse(
                            {
                                "status": "error",
                                "message": f"Save job_settings to database with exception {e}",
                            },
                            status=405,
                        )

                # Orchestrate task creation
                with tracer.start_as_current_span(
                    "orchestrate_task_creation"
                ) as orchestrate_span:
                    next_run, celery_tasks, error_response = (
                        _orchestrate_rrule_task_creation(
                            data,
                            job_settings,
                            function_name,
                            start_date,
                            end_date,
                            run_forever,
                        )
                    )
                    orchestrate_span.set_attribute("next_run", str(next_run))
                    orchestrate_span.set_attribute("tasks_count", len(celery_tasks))

                    if error_response:
                        orchestrate_span.set_attribute(
                            "error.type", "TaskCreationError"
                        )
                        return error_response

                # Format response
                with tracer.start_as_current_span("format_response") as format_span:
                    response = _format_rrule_schedule_response([next_run], celery_tasks)
                    format_span.set_attribute("response.status", "success")
                    return response

        except KeyError as e:
            span.set_attribute("error.type", "MissingParameter")
            span.record_exception(e)
            logger.error(f"Missing parameter: {str(e)}")
            return JsonResponse(
                {"status": "error", "message": f"Missing parameter: {str(e)}"},
                status=400,
            )
        except Exception as e:
            span.set_attribute("error.type", "UnexpectedError")
            span.record_exception(e)
            logger.exception(f"Error in creating interval task: {e}")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


def check_celery_worker_availability(queue_name: str) -> bool:
    """
    Check if a worker is available for a given queue name.

    Args:
        queue_name (str): The name of the queue to check for worker availability

    Returns:
        bool: True if at least one worker is available for the queue, False otherwise
    """
    try:
        # Get the list of active queues from all workers
        inspect = app.control.inspect()
        active_workers = inspect.stats()

        if not active_workers:
            logger.warning("No active workers found for queue: %s", queue_name)
            return False

        # Check if any worker is listening to the specified queue
        for worker_name in active_workers.keys():
            worker_name_splits = worker_name.split("@")

            if len(worker_name_splits) == 2 and worker_name_splits[1] == queue_name:
                return True

        logger.warning("No workers found listening to queue: %s", queue_name)
        return False

    except Exception as e:
        logger.error(f"Error checking worker availability for queue {queue_name}: {e}")
        return False


@csrf_exempt
@trace_endpoint
def manually_run(request):
    with tracer.start_as_current_span("manually_run_operation") as span:
        if request.method == "POST":
            manual_run_date = datetime.now()
            span.set_attribute("manual_run_date", str(manual_run_date))

            logger.info(
                "Received request Manually RUN with data=% at %s",
                request.body,
                manual_run_date,
            )

            try:
                # Parse request data
                with tracer.start_as_current_span(
                    "parse_manual_run_request"
                ) as parse_span:
                    required_fields = [
                        "job_id",
                        "job_type",
                        "job_action",
                        "queue_name",
                        "user_name",
                    ]
                    data = get_request_data(request, required_fields)
                    parse_span.set_attribute("request.data_size", len(str(data)))

                job_id = data.get("job_id")
                job_type = data.get("job_type")
                job_action = data.get("job_action")
                queue_name = data.get("queue_name")
                run_account = data.get("user_name")

                # Add job metadata to span
                span.set_attribute("job.id", job_id)
                span.set_attribute("job.type", job_type)
                span.set_attribute("job.action", job_action)
                span.set_attribute("job.queue", queue_name)
                span.set_attribute("job.user", run_account)

                # Validate required fields
                if not job_type or not queue_name or not job_action or not job_id:
                    span.set_attribute("error.type", "MissingRequiredFields")
                    return JsonResponse(
                        {
                            "status": "failure",
                            "message": "Job type, job action, job_id and queue_name are required.",
                        }
                    )

                # Fetch job settings
                with tracer.start_as_current_span("fetch_job_settings") as fetch_span:
                    fetch_span.set_attribute("job.id", job_id)
                    job_settings = JobSettings.objects.filter(job_id=job_id).first()
                    if job_settings:
                        fetch_span.set_attribute(
                            "job_settings.job_id", job_settings.job_id
                        )

                task_name = str(uuid.uuid4())
                span.set_attribute("task.name", task_name)

                # check if worker is available
                with tracer.start_as_current_span(
                    "check_worker_availability"
                ) as check_span:
                    check_span.set_attribute("job.id", job_id)
                    worker_available = check_celery_worker_availability(queue_name)
                    if not worker_available:
                        check_span.set_attribute("error.type", "WorkerNotAvailable")
                        return JsonResponse(
                            {
                                "status": "failure",
                                "message": "Worker not available",
                            },
                            status=500,
                        )

                # Send Celery task
                with tracer.start_as_current_span("send_celery_task") as send_span:
                    send_span.set_attribute("task.name", task_name)
                    send_span.set_attribute("task.type", job_type)
                    send_span.set_attribute("task.queue", queue_name)

                    try:
                        task_name_str = f"celerytasks.tasks.{job_type.lower()}"
                        args = [job_action, task_name, job_id, run_account, None]

                        result = app.send_task(
                            task_name_str,
                            args=args,
                            queue=queue_name,
                            exchange=queue_name,
                            routing_key=queue_name,
                            kwargs={
                                "manual_run": True,
                            },
                        )
                        send_span.set_attribute("celery.task.id", result.id)
                        logger.info(
                            f"Async task {task_name_str} sent with id {result.id}"
                        )

                    except Exception as e:
                        send_span.set_attribute("error.type", "CeleryTaskError")
                        send_span.record_exception(e)
                        logger.error(f"Cannot save PeriodicTask to database error {e}")
                        return JsonResponse(
                            {
                                "status": "error",
                                "message": f"Cannot save PeriodicTask to database exception {e}",
                            },
                            status=405,
                        )

                # Create task detail
                with tracer.start_as_current_span("create_task_detail") as detail_span:
                    detail_span.set_attribute("task.name", task_name)
                    detail_span.set_attribute("task.manually_run", True)

                    try:
                        task_detail, _ = TaskDetail.objects.get_or_create(
                            job=job_settings,
                            task_name=task_name,
                            run_date=manual_run_date,
                            manually_run=True,
                        )
                        detail_span.set_attribute("task_detail.created", True)
                        logger.info(
                            f"Save TaskDetail: {task_detail} to database successfully"
                        )
                    except Exception as e:
                        detail_span.set_attribute(
                            "error.type", "TaskDetailCreationError"
                        )
                        detail_span.record_exception(e)
                        logger.error(f"Cannot save TaskDetail to database error {e}")
                        return JsonResponse(
                            {
                                "status": "error",
                                "message": f"Cannot save TaskDetail to database exception {e}",
                            },
                            status=405,
                        )

                logger.info(
                    f"Success manually run job: {job_id} with celery_task_name: {task_name}"
                )

                return JsonResponse(
                    {"status": "success", "celery_task_name": task_name}
                )

            except KeyError as e:
                span.set_attribute("error.type", "MissingParameter")
                span.record_exception(e)
                return JsonResponse(
                    {"status": "error", "message": f"Missing parameter: {str(e)}"},
                    status=400,
                )
            except Exception as e:
                span.set_attribute("error.type", "UnexpectedError")
                span.record_exception(e)
                return JsonResponse({"status": "error", "message": str(e)}, status=500)
        else:
            span.set_attribute("error.type", "InvalidMethod")
            return JsonResponse(
                {"status": "error", "message": "Invalid request method"}, status=405
            )


@csrf_exempt
@trace_endpoint
def force_terminate_task(request):
    with tracer.start_as_current_span("force_terminate_task_operation") as span:
        if request.method == "POST":
            try:
                # Parse request data
                with tracer.start_as_current_span(
                    "parse_terminate_request"
                ) as parse_span:
                    data = json.loads(request.body)
                    job_id = data.get("job_id")
                    parse_span.set_attribute("job.id", job_id)

                span.set_attribute("job.id", job_id)

                # Get latest running task
                with tracer.start_as_current_span(
                    "get_latest_running_task"
                ) as get_span:
                    get_span.set_attribute("job.id", job_id)
                    running_tasks = get_running_tasks(job_id)

                    if not running_tasks:
                        get_span.set_attribute("error.type", "NoRunningTask")
                        return JsonResponse(
                            {
                                "status": "error",
                                "message": f"No running jobs found for job_id {job_id}",
                            },
                            status=404,
                        )

                with transaction.atomic():
                    for latest_task in running_tasks:
                        task_id = latest_task.celery_task_id
                        latest_task.update_last_result("REVOKED")
                        span.set_attribute("task.id", task_id)

                        # Revoke Celery task
                        with tracer.start_as_current_span(
                            "revoke_celery_task"
                        ) as revoke_span:
                            revoke_span.set_attribute("task.id", task_id)
                            revoke_span.set_attribute("terminate", True)
                            revoke_span.set_attribute("signal", "SIGKILL")

                            inspecting_tasks = [task_id]
                            seen = set()

                            while len(inspecting_tasks) > 0:
                                current_task_id = inspecting_tasks.pop()
                                seen.add(current_task_id)
                                result = AsyncResult(current_task_id, app=app)
                                list_task = walk_results(result.children or [])
                                inspecting_tasks.extend(
                                    list(set(list_task).difference(seen))
                                )

                                logger.info("Revoked task id: %s", current_task_id)
                                app.control.revoke(
                                    current_task_id, terminate=True, signal="SIGKILL"
                                )

                            PeriodicTask.objects.filter(
                                name=latest_task.task_name
                            ).delete()

                            revoke_span.set_attribute("revoke.success", True)

                            # Update task status
                            with tracer.start_as_current_span(
                                "update_task_status"
                            ) as status_span:
                                status_span.set_attribute("task.id", task_id)
                                status_span.set_attribute(
                                    "new_status", TaskDetail.STATUS_STOPPED
                                )

                                latest_task.save_status(TaskDetail.STATUS_STOPPED)
                                status_span.set_attribute("status_update.success", True)

                        # Update scheduler log
                        with tracer.start_as_current_span(
                            "update_scheduler_log"
                        ) as log_span:
                            log_span.set_attribute("operation", "BLOCKED")

                            request_body = convert_scheduler_log_update_body(
                                task_detail=latest_task,
                                operation="BLOCKED",
                                job_settings=None,
                                result=None,
                                status=TaskDetail.STATUS_STOPPED,
                            )

                            if request_body is not None:
                                success = call_scheduler_run_log(
                                    request_body, "update"
                                )
                                log_span.set_attribute(
                                    "log_update.success", success
                                )

                                if success:
                                    logger.info(
                                        "Successfully update scheduler run log for force stop %s",
                                        job_id,
                                    )
                                else:
                                    logger.error(
                                        "Failed to update scheduler run log for force stop %s",
                                        job_id,
                                    )
                            else:
                                log_span.set_attribute("log_update.skipped", True)

                        logger.info(
                            "Job %s force terminated with task_id %s.",
                            job_id,
                            task_id,
                        )
                return JsonResponse(
                    {
                        "status": "success",
                        "message": f"Job {job_id} force terminated with task_id {task_id}.",
                    }
                )

            except Exception as e:
                span.set_attribute("error.type", "TerminateError")
                span.record_exception(e)
                logger.error("Error force terminating task: %s", e)
                return JsonResponse(
                    {"status": "error", "message": str(e)},
                    status=500,
                )

        span.set_attribute("error.type", "InvalidMethod")
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


def change_periodic_tasks(data, periodic_tasks):
    for task in periodic_tasks:
        for key, value in data.items():
            if key == "is_enabled":
                setattr(task, "enabled", value)
            elif key == "queue_name":
                task.exchange = value
                task.routing_key = value
                task.queue = value
            elif key == "job_type":
                function_name = f"celerytasks.tasks.{value.lower()}"
                setattr(task, "task", function_name)
            task.save()


def _parse_update_job_request(request):
    """
    Parse and validate the incoming request for update_job_function.
    Returns (data, job_id, job_settings) or returns a JsonResponse on error.
    """
    try:
        data = json.loads(request.body)
        logger.info(f"Received request to update job with body {data}")
        if data.get("status") is not None:
            data["is_enabled"] = data.pop("status")

        job_id = data.get("job_id")
        if not job_id:
            return (
                None,
                None,
                JsonResponse(
                    {"status": "error", "message": "job_id parameter is required"},
                    status=400,
                ),
            )
        job_settings = JobSettings.objects.filter(job_id=job_id).first()
        logger.info(f"Start update job settings for job_id:{job_id}")
        logger.info(f"Typeof {type(job_settings)} obj:{job_settings}")
        if not job_settings:
            return (
                None,
                None,
                JsonResponse(
                    {
                        "status": "error",
                        "message": f"Cannot find JobSettings with job_id={job_id}",
                    },
                    status=400,
                ),
            )
        return data, job_id, job_settings
    except Exception as e:
        return (
            None,
            None,
            JsonResponse({"status": "error", "message": str(e)}, status=500),
        )


def _prepare_job_settings_update(data, job_settings):
    """
    Prepare new values for job settings, using request data or defaults from job_settings.
    Returns a dict of all relevant values.
    """
    return {
        "max_run_duration": data.get("max_run_duration", job_settings.max_run_duration),
        "max_failures": data.get("max_failure", job_settings.max_failure),
        "enable": data.get("is_enabled", job_settings.is_enable),
        "auto_drop": data.get("auto_drop", job_settings.auto_drop),
        "restart_on_fail": data.get(
            "restart_on_failure", job_settings.restart_on_failure
        ),
        "restartable": data.get("restartable", job_settings.restartable),
        "priority": data.get("priority", job_settings.priority),
        "job_type": data.get("job_type", job_settings.job_type),
        "job_action": data.get("job_action", job_settings.job_action),
        "job_body": data.get("job_body", job_settings.job_body),
        "rrule_str": data.get("repeat_interval", job_settings.repeat_interval),
        "max_run": data.get("max_run", job_settings.max_run),
        "timezone": job_settings.timezone,
        "start_date_obj": data.get(
            "start_date", int(job_settings.start_date.timestamp() * 1000)
        ),
        "end_date_obj": data.get(
            "end_date",
            int(job_settings.end_date.timestamp() * 1000)
            if job_settings.end_date
            else 0,
        ),
        "queue_name": data.get("queue_name", job_settings.queue_name),
        "run_account": data.get("user_name", job_settings.run_account),
        "retry_delay": data.get("retry_delay", job_settings.retry_delay),
    }


def _delete_old_tasks(task_details):
    """
    Delete old IndexedPeriodicTasks and mark TaskDetails as soft deleted.
    Returns a list of SchedulerTaskResponse for outdated tasks.
    Optimized to avoid N+1 queries.
    """
    # Batch fetch all periodic tasks in one query
    task_names = [task.task_name for task in task_details]
    periodic_tasks = {
        pt.name: pt for pt in PeriodicTask.objects.filter(name__in=task_names)
    }
    outdated_tasks_responses = []
    for task in task_details:
        periodic_task = periodic_tasks.get(task.task_name)
        if periodic_task:
            periodic_task.delete()
            logger.info(f"Delete success related periodic task: {periodic_task}")
        task.soft_delete_func()
        outdated_tasks_responses.append(
            SchedulerTaskResponse(task.task_name, datetime_to_epoch(task.run_date))
        )
    return outdated_tasks_responses


def _create_new_schedules_and_tasks(
    next_runs,
    function_name,
    job_id,
    job_action,
    queue_name,
    enable,
    priority,
    run_account,
    job_settings,
):
    """
    Create new ClockedSchedules, CeleryBeTasks, PeriodicTasks, and TaskDetails for the updated job.
    Returns (celery_tasks, error_response)
    """
    celery_tasks = []
    clocked_schedules = []
    for i, next_run in enumerate(next_runs):
        clocked_schedule = ClockedSchedule.objects.create(clocked_time=next_run)
        clocked_schedules.append(clocked_schedule)
        next_run_date = next_runs[i + 1] if i + 1 < len(next_runs) else None
        celery_be_task = CeleryBeTask(
            celery_task_name=str(uuid.uuid4()),
            run_date=next_run,
            next_run_date=str(next_run_date),
        )
        celery_tasks.append(celery_be_task)
    tasks = []
    for i, clocked_schedule in enumerate(clocked_schedules):
        task_name = celery_tasks[i].celery_task_name
        try:
            task, _ = PeriodicTask.objects.get_or_create(
                clocked=clocked_schedule,
                name=task_name,
                task=function_name,
                defaults={"one_off": True},
                description=job_id,
                queue=queue_name,
                exchange=queue_name,
                routing_key=queue_name,
                enabled=enable,
                priority=priority,
                args=json.dumps(
                    [
                        job_action,
                        task_name,
                        job_id,
                        run_account,
                        celery_tasks[i].next_run_date,
                    ]
                ),
            )
            tasks.append(task)
            logger.info(f"Save PeriodicTask: {task} to database successfully")
        except Exception as e:
            logger.error(f"Cannot save PeriodicTask to database error {e}")
            return None, JsonResponse(
                {
                    "status": "error",
                    "message": f"Cannot save PeriodicTask to database exception {e}",
                },
                status=405,
            )
        try:
            task_detail, _ = TaskDetail.objects.get_or_create(
                job=job_settings,
                task_name=task_name,
                run_date=clocked_schedule.clocked_time,
            )
            logger.info(f"Save TaskDetail: {task_detail} to database successfully")
        except Exception as e:
            logger.error(f"Cannot save TaskDetail to database error {e}")
            return None, JsonResponse(
                {
                    "status": "error",
                    "message": f"Cannot save TaskDetail to database exception {e}",
                },
                status=405,
            )
    return celery_tasks, None


def _format_update_job_response(outdated_tasks_responses, celery_tasks):
    """
    Format the response for update_job_function.
    """
    updated_tasks = [
        SchedulerTaskResponse(
            task.celery_task_name, datetime_to_epoch(task.run_date)
        ).to_dict()
        for task in celery_tasks
    ]
    outdated_tasks = [
        task_response.to_dict() for task_response in outdated_tasks_responses
    ]
    logger.info(f"Updated tasks: {updated_tasks}, Outdated tasks: {outdated_tasks}")
    return JsonResponse(
        {
            "status": "success",
            "outdated_tasks": outdated_tasks,
            "updated_tasks": updated_tasks,
        }
    )


def _update_job(request, span):
    try:
        # Parse update request
        with transaction.atomic():
            with tracer.start_as_current_span("parse_update_request") as parse_span:
                data, job_id, job_settings_or_response = _parse_update_job_request(
                    request
                )
                parse_span.set_attribute("job.id", job_id)

                if job_settings_or_response is not None and not isinstance(
                    job_settings_or_response, JobSettings
                ):
                    parse_span.set_attribute("error.type", "ParseError")
                    return job_settings_or_response

                job_settings = job_settings_or_response
                parse_span.set_attribute("job_settings.job_id", job_settings.job_id)

            span.set_attribute("job.id", job_id)
            span.set_attribute("job_settings.job_id", job_settings.job_id)

            # Prepare job settings update
            with tracer.start_as_current_span("prepare_job_settings") as prepare_span:
                values = _prepare_job_settings_update(data, job_settings)
                prepare_span.set_attribute("update_fields_count", len(values))

                rrule_str = values["rrule_str"]
                prepare_span.set_attribute("rrule.string", rrule_str)

            # Validate RRULE
            with tracer.start_as_current_span("validate_rrule") as validate_span:
                validate_span.set_attribute("rrule.string", rrule_str)
                validity, rrule_dict = validate_rrule(rrule_str)

                if not validity:
                    validate_span.set_attribute("error.type", "InvalidRRULE")
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": "Invalid Repeat Interval: The value entered does not comply with the allowed format or range.",
                        },
                        status=400,
                    )

            # Check run forever
            with tracer.start_as_current_span("check_run_forever") as run_span:
                run_forever = check_rrule_run_forever(
                    rrule_dict=rrule_dict,
                    end_date=convert_epoch_to_datetime(values["end_date_obj"])
                    if values["end_date_obj"]
                    else None,
                    max_run=values["max_run"],
                )
                run_span.set_attribute("run_forever", run_forever)

            function_name = f"celerytasks.tasks.{values['job_type'].lower()}"
            span.set_attribute("function.name", function_name)

            # Get existing tasks
            with tracer.start_as_current_span("get_existing_tasks") as tasks_span:
                task_details = TaskDetail.objects.filter(
                    job=job_settings, already_run=False, soft_delete=False
                )
                periodic_tasks = PeriodicTask.objects.filter(
                    description=job_id, enabled=True
                )
                tasks_span.set_attribute("task_details.count", task_details.count())
                tasks_span.set_attribute("periodic_tasks.count", periodic_tasks.count())

                logger.info("task_details: %s", task_details)

            # Check if schedule fields are being updated
            fields_to_check = [
                "start_date",
                "end_date",
                "repeat_interval",
                "max_run",
            ]
            schedule_update_needed = data and any(
                field in data for field in fields_to_check
            )
            span.set_attribute("schedule_update_needed", schedule_update_needed)

            if not (schedule_update_needed or data.get("enabled", True)):
                # Simple update without schedule changes
                with tracer.start_as_current_span("simple_job_update") as simple_span:
                    change_job_settings(data, job_settings, run_forever)
                    change_periodic_tasks(data, periodic_tasks)
                    simple_span.set_attribute("update.success", True)

                    return JsonResponse(
                        {
                            "status": "success",
                            "outdated_tasks": [],
                            "updated_tasks": [],
                        }
                    )

            # Validate time stub for schedule update
            with tracer.start_as_current_span("validate_time_stub") as time_span:
                valid_time_stub = validate_time_stub(data, job_settings, "update")
                if not valid_time_stub:
                    time_span.set_attribute("error.type", "InvalidTimeData")
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": f"Invalid datetime start_date: {convert_epoch_to_datetime(values['start_date_obj'])}, end_date: {convert_epoch_to_datetime(values['end_date_obj']) if values['end_date_obj'] else None}",
                        },
                        status=400,
                    )

            # Delete old tasks
            with tracer.start_as_current_span("delete_old_tasks") as delete_span:
                outdated_tasks_responses = (
                    _delete_old_tasks(task_details) if task_details else []
                )
                delete_span.set_attribute(
                    "deleted_tasks.count", len(outdated_tasks_responses)
                )

            # Calculate next run
            with tracer.start_as_current_span("calculate_next_run") as calc_span:
                max_run_val = 1 if run_forever else values["max_run"]
                new_start_date = convert_epoch_to_datetime(values["start_date_obj"])
                run_now = job_settings.run_count == 0

                calc_span.set_attribute("max_run", max_run_val)
                calc_span.set_attribute("run_now", run_now)

                next_run = get_next_run_date(
                    rrule_str=rrule_str,
                    current_run_count=job_settings.run_count,
                    run_count=max_run_val,
                    start_date=new_start_date,
                    end_date=convert_epoch_to_datetime(values["end_date_obj"])
                    if values["end_date_obj"]
                    else None,
                    run_forever=run_forever,
                    tz=values["timezone"],
                    run_now=run_now,
                )

                calc_span.set_attribute("next_run", str(next_run))
                logger.info("Next runs %s", next_run)

            # Create new schedules and tasks
            with tracer.start_as_current_span("create_new_schedules") as create_span:
                celery_tasks, error_response = _create_new_schedules_and_tasks(
                    [next_run] if next_run else [],
                    function_name,
                    job_id,
                    values["job_action"],
                    values["queue_name"],
                    values["enable"],
                    values["priority"],
                    values["run_account"],
                    job_settings,
                )
                create_span.set_attribute(
                    "new_tasks.count", len(celery_tasks) if celery_tasks else 0
                )

                if error_response:
                    create_span.set_attribute("error.type", "TaskCreationError")
                    return error_response

            # Update job settings
            with tracer.start_as_current_span("update_job_settings") as update_span:
                job_settings = JobSettings.objects.filter(job_id=job_id).first()
                if job_settings is None:
                    update_span.set_attribute("error.type", "JobNotFound")
                    return JsonResponse(
                        {
                            "status": "error",
                            "message": f"No job found for job_id {job_id}",
                        },
                        status=404,
                    )

                data["next_run_date"] = next_run
                change_job_settings(data, job_settings, run_forever)
                update_span.set_attribute("update.success", True)

            # Format response
            with tracer.start_as_current_span("format_update_response") as format_span:
                response = _format_update_job_response(
                    outdated_tasks_responses, celery_tasks
                )
                format_span.set_attribute("response.status", "success")
                return response

    except Exception as e:
        span.set_attribute("error.type", "UnexpectedError")
        span.record_exception(e)
        logger.error("Error updating job function: %s", e)
        return JsonResponse(
            {"status": "error", "message": str(e)},
            status=500,
        )


@csrf_exempt
@trace_endpoint
@transaction.atomic
def update_job_function(request):
    """
    Update an existing job's function, schedule, and related tasks.
    """
    with tracer.start_as_current_span("update_job_function_operation") as span:
        if request.method != "POST":
            span.set_attribute("error.type", "InvalidMethod")
            return JsonResponse(
                {
                    "status": "error",
                    "message": "Invalid HTTP Method for function Update Job",
                },
                status=500,
            )

        return _update_job(request, span)


def change_job_settings(data, job_settings, run_forever):
    for key, value in data.items():
        if job_settings.run_forever != run_forever:
            setattr(job_settings, "run_forever", run_forever)
        if key == "is_enabled":
            setattr(job_settings, "is_enable", value)
        elif key == "start_date":
            setattr(job_settings, "start_date", convert_epoch_to_datetime(value))
        elif key == "end_date":
            setattr(job_settings, "end_date", convert_epoch_to_datetime(value))
        elif key == "next_run_date":
            setattr(job_settings, "next_run_date", value)
        elif key in JOB_SETTINGS_ONLY_FIELDS:
            setattr(job_settings, key, value)
    job_settings.save()


def get_running_tasks(job_id):
    running_jobs = TaskDetail.objects.filter(
        job__job_id=job_id,
        status=TaskDetail.STATUS_NONE
    ).all()

    return running_jobs


@csrf_exempt
@trace_endpoint
def update_state_job(request):
    with tracer.start_as_current_span("update_state_job_operation") as span:
        if request.method == "POST":
            try:
                # Parse request data
                with transaction.atomic():
                    with tracer.start_as_current_span(
                        "parse_state_request"
                    ) as parse_span:
                        data = json.loads(request.body)
                        parse_span.set_attribute("request.data_size", len(str(data)))
                        logger.info(
                            "Received request to update status job with body %s", data
                        )

                        # Get job_id from the request data
                        job_id = data.get("job_id")
                        if not job_id:
                            parse_span.set_attribute("error.type", "MissingJobId")
                            return JsonResponse(
                                {
                                    "status": "error",
                                    "message": "job_id parameter is required",
                                },
                                status=400,
                            )

                        # Get status from the request data
                        status = data.get("status")
                        if status is None:
                            parse_span.set_attribute("error.type", "MissingStatus")
                            return JsonResponse(
                                {
                                    "status": "error",
                                    "message": "status parameter is required",
                                },
                                status=400,
                            )

                        # Check if status is a boolean
                        if not isinstance(status, bool):
                            parse_span.set_attribute("error.type", "InvalidStatusType")
                            return JsonResponse(
                                {
                                    "status": "error",
                                    "message": "status parameter must be a boolean",
                                },
                                status=400,
                            )

                        parse_span.set_attribute("job.id", job_id)
                        parse_span.set_attribute("status", status)

                    span.set_attribute("job.id", job_id)
                    span.set_attribute("status", status)

                    return _update_job(request, span)

            except Exception as e:
                span.set_attribute("error.type", "UnexpectedError")
                span.record_exception(e)
                logger.error("Error updating job status: %s", str(e))
                return JsonResponse({"status": "error", "message": str(e)}, status=500)

        span.set_attribute("error.type", "InvalidMethod")
        return JsonResponse(
            {"status": "error", "message": "Invalid request method"}, status=405
        )


def get_request_data(request, required_fields, optional_fields: list = None):
    optional_fields = optional_fields or []

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format")
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

    opt_fields = [field for field in optional_fields if field in data]
    all_fields = list(set(required_fields + opt_fields))

    return {field: data[field] for field in all_fields}


@trace_endpoint
def health_check(request):
    """
    Health check endpoint with OpenTelemetry custom span for demonstration.
    """
    with tracer.start_as_current_span("health_check_operation") as span:
        # Add health check specific attributes
        span.set_attribute("health.check.type", "application")
        span.set_attribute("health.check.component", "django")

        # Log a message with trace context
        logger.info("Health check endpoint called.")

        # Return the health status
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
        logger.info(f"Success push task result to scheduler with body {body}")
        return True
    except requests.RequestException as e:
        logger.error("Error in pushing task result to scheduler: %s", e)
        return False


def convert_scheduler_log_update_body(
    task_detail, job_settings, result, operation, status: str
):
    try:
        log_body = {
            # Task detail attributes
            "job_id": task_detail.job.job_id,
            "operation": operation,
            "user_name": task_detail.run_account,
            "actual_start_date": int(task_detail.run_date.timestamp() * 1000),
            "run_duration": str(task_detail.run_duration)
            if task_detail.run_duration
            else None,
            "additional_info": None,
            "celery_task_name": f"{task_detail.task_name}_{task_detail.retry_count}",
            "batch_type": "Manual" if task_detail.manually_run else "Auto",
            "status": status,
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


@csrf_exempt
@trace_endpoint
def get_task_detail(request):
    """
    Optimized: Batch fetch related objects to avoid N+1 queries.
    """
    with tracer.start_as_current_span("get_task_detail_operation") as span:
        try:
            # Parse request data
            with tracer.start_as_current_span(
                "parse_task_detail_request"
            ) as parse_span:
                data = json.loads(request.body)
                parse_span.set_attribute("request.data_size", len(str(data)))
                logger.info("Received request to get task details with body %s", data)

                task_list = data.get("tasks")
                parse_span.set_attribute(
                    "tasks.count", len(task_list) if task_list else 0
                )

            span.set_attribute("tasks.count", len(task_list) if task_list else 0)

            result = []
            if not task_list:
                span.set_attribute("response.empty", True)
                return JsonResponse({"status": "success", "tasks": result})

            # Batch fetch TaskDetails
            with tracer.start_as_current_span("fetch_task_details") as fetch_span:
                task_details = list(
                    TaskDetail.objects.filter(task_name__in=task_list).select_related(
                        "job"
                    )
                )
                task_details_by_name = {td.task_name: td for td in task_details}
                fetch_span.set_attribute("task_details.found", len(task_details))

                # Batch fetch JobSettings
                job_ids = {td.job_id for td in task_details if hasattr(td, "job_id")}
                job_settings_map = {
                    js.job_id: js
                    for js in JobSettings.objects.filter(job_id__in=job_ids)
                }
                fetch_span.set_attribute("job_settings.found", len(job_settings_map))

                # Batch fetch PeriodicTasks
                periodic_tasks = {
                    pt.name: pt
                    for pt in PeriodicTask.objects.filter(name__in=task_list)
                }
                fetch_span.set_attribute("periodic_tasks.found", len(periodic_tasks))

                # Batch fetch TaskResults
                periodic_task_names = [pt.name for pt in periodic_tasks.values()]
                task_results = {
                    tr.periodic_task_name: tr
                    for tr in TaskResult.objects.filter(
                        periodic_task_name__in=periodic_task_names
                    )
                }
                fetch_span.set_attribute("task_results.found", len(task_results))

            # Process each task
            with tracer.start_as_current_span("process_task_details") as process_span:
                processed_count = 0
                for celery_task_name in task_list:
                    try:
                        with tracer.start_as_current_span(
                            "process_single_task"
                        ) as single_span:
                            single_span.set_attribute("task.name", celery_task_name)

                            task_detail = task_details_by_name.get(celery_task_name)
                            single_span.set_attribute(
                                "task_detail.found", task_detail is not None
                            )

                            if task_detail:
                                job_settings = job_settings_map.get(
                                    getattr(task_detail, "job_id", None)
                                )
                                periodic_task = periodic_tasks.get(
                                    task_detail.task_name
                                )
                                task_result = (
                                    task_results.get(periodic_task.name)
                                    if periodic_task
                                    else None
                                )

                                # Only fetch latest_tasks if needed
                                list_tasks = (
                                    TaskDetail.objects.filter(
                                        job=job_settings,
                                        soft_delete=False,
                                        manually_run=False,
                                    ).order_by("-created_at")
                                    if job_settings
                                    else []
                                )
                                latest_tasks = list_tasks[0] if list_tasks else None

                                operation = "RUN"
                                if latest_tasks and latest_tasks.status not in (
                                    TaskDetail.STATUS_CREATED,
                                    TaskDetail.STATUS_NONE,
                                ):
                                    operation = (
                                        "BROKEN"
                                        if task_detail.status
                                        == TaskDetail.STATUS_FAILURE
                                        else "COMPLETED"
                                    )

                                single_span.set_attribute("task.operation", operation)
                                single_span.set_attribute(
                                    "task.status", task_detail.status
                                )

                                result.append(
                                    {
                                        "celery_task_name": celery_task_name,
                                        "operation": operation,
                                        "status": task_detail.status,
                                        "error_no": job_settings.failure_count
                                        if job_settings
                                        else None,
                                        "req_start_date": datetime_to_epoch(
                                            task_detail.run_date
                                        ),
                                        "actual_start_date": datetime_to_epoch(
                                            task_detail.run_date
                                        ),
                                        "run_duration": task_detail.run_duration,
                                        "errors": task_result.traceback
                                        if task_result
                                        else None,
                                        "output": task_result.result
                                        if task_result
                                        else None,
                                    }
                                )
                                processed_count += 1

                    except Exception as e:
                        single_span.set_attribute("error.type", "TaskProcessingError")
                        single_span.record_exception(e)
                        logger.error(f"Get latest status of task throw exception: {e}")
                        return JsonResponse(
                            {"status": "error", "message": str(e)}, status=500
                        )

                process_span.set_attribute("processed_tasks.count", processed_count)

            span.set_attribute("response.tasks.count", len(result))
            return JsonResponse({"status": "success", "tasks": result})

        except Exception as e:
            span.set_attribute("error.type", "UnexpectedError")
            span.record_exception(e)
            logger.error(f"Error getting task details: {e}")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


def parse_request_body(request):
    """Parses and validates the request body."""
    try:
        data = json.loads(request.body)
        logger.debug("Request body: %s", data)
        workflow_id = data.get("workflow_id")
        start_date = data.get("start_date")
        repeat_interval = data.get("repeat_interval")
        list_priority_groups = data.get("list_priority_groups", [])
        tz = data.get("timezone", "UTC")
        if not workflow_id:
            return None, JsonResponse(
                {"status": "error", "message": "workflow_id is required"}, status=400
            )
        return {
            "workflow_id": workflow_id,
            "list_priority_groups": list_priority_groups,
            "start_date": start_date,
            "repeat_interval": repeat_interval,
            "timezone": tz,
        }, None
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return None, JsonResponse(
            {"status": "error", "message": "Invalid JSON payload"}, status=400
        )


def process_jobs(list_priority_groups, workflow_id, start_date, repeat_interval, tz):
    """Processes jobs, validates them, and organizes tasks by priority."""
    # Delete existing WorkflowRunDetail records
    WorkflowRunDetail.objects.filter(workflow_id=workflow_id).delete()
    scheduler = WorkflowScheduler()

    workflow_job_ids = []
    for group in list_priority_groups:
        list_jobs = group.get("list_jobs")
        priority = group.get("priority")
        ignore_result = group.get("ignore_result")

        # Validate the presence of required fields
        if not list_jobs or not priority:
            return None, JsonResponse(
                {
                    "status": "error",
                    "message": "Each dependency must include list_jobs, priority",
                },
                status=400,
            )

        # backward compatibility
        job_wf_delays = {}
        for job in list_jobs:
            if isinstance(job, str):
                job_wf_delays[job] = 0
            else:
                job_wf_delays[job["job_id"]] = job.get("delay", 0)

        list_jobs = list(job_wf_delays.keys())
        logger.debug("Job workflow delays: %s", job_wf_delays)

        # find all job settings in list_jobs, update workflow_id, priority, ignore_result
        job_settings_list: List[JobSettings] = JobSettings.objects.filter(
            job_id__in=list_jobs
        ).all()

        if len(job_settings_list) != len(list_jobs):
            # Find which job_ids were not found
            existing_job_ids = [job.job_id for job in job_settings_list]
            missing_job_ids = set(list_jobs) - set(existing_job_ids)
            return None, JsonResponse(
                {
                    "status": "error",
                    "message": f"Invalid job_id: {missing_job_ids}",
                },
                status=404,
            )

        for job_settings in job_settings_list:
            workflow_job_ids.append(job_settings.job_id)

            # Update workflow and priority
            job_settings.update_workflow(
                workflow_id,
                priority,
                ignore_result,
                job_wf_delays.get(job_settings.job_id, 0),
            )

            WorkflowRunDetail.objects.create(
                job_id=job_settings.job_id,
                workflow_id=workflow_id,
                run_forever=job_settings.run_forever,
                priority=priority,
            )
            scheduler.add_task(
                task_name=job_settings.job_id,
                function_name=job_settings.function_name,
                queue_name=job_settings.queue_name,
                rrule_str=job_settings.repeat_interval,
                priority=priority,
                start_dt=job_settings.start_date,
            )

    JobSettings.objects.filter(workflow_id=workflow_id).exclude(
        job_id__in=workflow_job_ids
    ).update(
        workflow_id=None,
        priority=None,
        ignore_result=False,
        workflow_delay=0,
    )

    start_date = convert_epoch_to_datetime(start_date)

    if len(list_priority_groups) > 0:
        task_workflow = create_workflow(
            workflow_id, start_date, repeat_interval, scheduler, tz
        )
        _create_celery_workflow_schedule(task_workflow, start_date)


def _create_celery_workflow_schedule(task_workflow: TaskWorkflow, start_dt: datetime):
    """
    Create a celery workflow schedule with the given workflow_id and start_dt.
    """
    next_run_date = get_next_run_date(
        rrule_str=task_workflow.repeat_interval,
        current_run_count=None,
        run_count=None,
        start_date=start_dt,
        end_date=None,
        run_forever=True,
        tz=task_workflow.timezone,
        run_now=False,
    )
    clocked_schedule = ClockedSchedule.objects.create(clocked_time=next_run_date)

    # delete old periodic task
    PeriodicTask.objects.filter(description=task_workflow.workflow_id).delete()

    PeriodicTask.objects.get_or_create(
        clocked=clocked_schedule,
        name=task_workflow.workflow_id,
        task="celerytasks.tasks.run_workflow",
        defaults={"one_off": True},
        description=task_workflow.workflow_id,
        queue=task_workflow.queue_name,
        exchange=task_workflow.queue_name,
        routing_key=task_workflow.queue_name,
        enabled=True,
        priority=None,
        args=json.dumps([task_workflow.workflow_id]),
    )


@csrf_exempt
@trace_endpoint
def assign_job_to_workflow(request):
    with tracer.start_as_current_span("assign_job_to_workflow_operation") as span:
        if request.method != "POST":
            span.set_attribute("error.type", "InvalidMethod")
            return JsonResponse(
                {"status": "error", "message": "Invalid request method"}, status=405
            )

        try:
            # Parse the request body
            with transaction.atomic():
                with tracer.start_as_current_span(
                    "parse_workflow_request"
                ) as parse_span:
                    parsed_data, error_response = parse_request_body(request)
                    if error_response:
                        parse_span.set_attribute("error.type", "ParseError")
                        return error_response

                    if parsed_data is None:
                        parse_span.set_attribute("error.type", "InvalidData")
                        return JsonResponse(
                            {"status": "error", "message": "Invalid request data"},
                            status=400,
                        )

                    workflow_id = parsed_data["workflow_id"]
                    list_priority_groups = parsed_data["list_priority_groups"]

                    parse_span.set_attribute("workflow.id", workflow_id)
                    parse_span.set_attribute(
                        "priority_groups.count", len(list_priority_groups)
                    )

                span.set_attribute("workflow.id", workflow_id)
                span.set_attribute("priority_groups.count", len(list_priority_groups))

                # Process jobs
                with tracer.start_as_current_span("process_jobs") as process_span:
                    process_span.set_attribute("workflow.id", workflow_id)
                    process_span.set_attribute(
                        "priority_groups.count", len(list_priority_groups)
                    )

                    # Insert WorkflowRunDetail records with correct logic
                    process_jobs(
                        list_priority_groups,
                        workflow_id,
                        parsed_data["start_date"],
                        parsed_data["repeat_interval"],
                        parsed_data.get("timezone", "UTC"),
                    )
                    process_span.set_attribute("process.success", True)

                logger.info("Successfully assigned jobs to workflow %s", workflow_id)
                start_date = convert_epoch_to_datetime(parsed_data["start_date"])
                next_run_date = get_next_run_date(
                    rrule_str=parsed_data["repeat_interval"],
                    current_run_count=None,
                    run_count=None,
                    start_date=start_date,
                    end_date=None,
                    run_forever=True,
                    tz=parsed_data.get("timezone", "UTC"),
                    run_now=False,
                )
                return JsonResponse(
                    {
                        "status": "success",
                        "workflow_id": workflow_id,
                        "next_run_date": next_run_date.isoformat(),
                    },
                    status=200,
                )

        except Exception as e:
            span.set_attribute("error.type", "UnexpectedError")
            span.record_exception(e)
            logger.exception("Error creating workflow: %s", e)
            return JsonResponse({"status": "error", "message": str(e)}, status=500)


@csrf_exempt
@trace_endpoint
@transaction.atomic
def delete_workflow(request):
    """
    Delete a workflow and all its associated tasks.
    """
    with tracer.start_as_current_span("delete_workflow_operation") as span:
        if request.method != "POST":
            span.set_attribute("error.type", "InvalidMethod")
            return JsonResponse(
                {"status": "error", "message": "Invalid request method"}, status=405
            )

        data = json.loads(request.body)
        workflow_id = data.get("workflow_id")

        if not workflow_id:
            span.set_attribute("error.type", "InvalidData")
            return JsonResponse(
                {"status": "error", "message": "workflow_id is required"}, status=400
            )

        # Delete the workflow and all its associated tasks
        WorkflowRunDetail.objects.filter(workflow_id=workflow_id).delete()
        TaskWorkflow.objects.filter(workflow_id=workflow_id).delete()
        JobSettings.objects.filter(workflow_id=workflow_id).update(
            workflow_id=None, priority=None, ignore_result=False
        )

        # delete periodic task
        PeriodicTask.objects.filter(description=workflow_id).delete()

        return JsonResponse(
            {"status": "success", "message": "Workflow deleted successfully"},
            status=200,
        )


def walk_results(obj):
    seen, out = set(), []

    def walk(item):
        if isinstance(item, list):
            for child in item:
                walk(child)

        elif item not in seen and item is not None:
            seen.add(item)
            out.append(item)

    walk(obj)
    return out
