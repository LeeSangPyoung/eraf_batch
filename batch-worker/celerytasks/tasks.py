import ast
import subprocess
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import List

import requests
from celery import chord
from opentelemetry import trace
from requests.adapters import HTTPAdapter
from requests.exceptions import HTTPError
from urllib3.util.retry import Retry

from batchbe.celery import app
from celerytasks.workflow import ScheduledTask
from exceptions.executable_exception import ExecutableError
from logger import get_logger

from .custom_task import RepeatTask
from .models import JobSettings
from .task_group import TaskGroup, WorkflowCache
from .utils import (
    LOCAL_WORKFLOW_DIR,
    call_scheduler_workflow_run_update,
    call_scheduler_workflow_update,
    convert_epoch_to_datetime_millis,
    is_valid_http_method,
    remove_task_from_local,
)

logger = get_logger()
tracer = trace.get_tracer(__name__)

# Create a session with connection pooling for better performance
_session = None


def get_http_session():
    """Get or create an HTTP session with connection pooling."""
    global _session
    if _session is None:
        _session = requests.Session()
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(
            max_retries=retry_strategy, pool_connections=10, pool_maxsize=20
        )
        _session.mount("http://", adapter)
        _session.mount("https://", adapter)
    return _session


@lru_cache(maxsize=128)
def parse_job_action(job_action_str: str):
    """Cache parsed job actions to avoid repeated ast.literal_eval calls."""
    return ast.literal_eval(job_action_str)


def make_http_request(method, url, headers, body, timeout):
    """Make synchronous HTTP request with optimized session and connection pooling."""
    with tracer.start_as_current_span("make_http_request_span") as span:
        method = method.upper()
        session = get_http_session()

        try:
            if method == "GET":
                response = session.get(url, headers=headers, timeout=timeout)
            elif method == "POST":
                response = session.post(
                    url, headers=headers, json=body, timeout=timeout
                )
            elif method == "PUT":
                response = session.put(url, headers=headers, json=body, timeout=timeout)
            elif method == "DELETE":
                response = session.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Invalid HTTP method: {method}")

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.warning(f"HTTP request failed: {e}")
            raise


def execute_command(command, timeout):
    """Execute command synchronously with optimized subprocess settings."""
    with tracer.start_as_current_span("execute_command_span") as span:
        try:
            # Use subprocess.run with optimized settings for better performance
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                # Optimize for performance
                preexec_fn=None,  # Don't set process group
                close_fds=True,  # Close file descriptors
            )
            return result.stdout, result.stderr, result.returncode
        except subprocess.TimeoutExpired:
            raise TimeoutError("Process timed out.")


@app.task(bind=True, base=RepeatTask)
def rest_api(
    self,
    action,
    job_name,
    job_id,
    run_account,
    next_run_date,
    workflow_run_id: int = None,
    manual_run: bool = False,
):
    span = trace.get_current_span()
    span.set_attribute("job.id", job_id)
    span.set_attribute("job.name", job_name)
    span.set_attribute("job.run_account", run_account)
    span.set_attribute("job.workflow_run_id", workflow_run_id or "")
    span.set_attribute("job.manual_run", manual_run)
    logger.debug(
        f"Start execute schedule task id: {job_id} with type REST_API with user :{run_account}"
    )
    try:
        with tracer.start_as_current_span("get_job_settings_span") as db_span:
            # Use select_related to avoid N+1 queries
            job_settings = (
                JobSettings.objects.select_related().filter(job_id=job_id).first()
            )
            if job_settings is None:
                logger.error(f"JobSettings not found for job_id {job_id}.")
                return None

        # Use cached parsing for better performance
        job_action = parse_job_action(job_settings.job_action)
        logger.debug(f"Execute REST_API with action: {job_action}")
        job_duration = job_settings.max_run_duration.total_seconds()

        method = job_action.get("method")
        if not is_valid_http_method(method):
            raise Exception(
                f"Not found or not valid method in job_action: {job_action}"
            )

        url = job_action.get("url")
        if not url:
            raise Exception(f"Not found URL in job_action :{job_action}")

        headers = job_action.get("headers", {})
        body = job_action.get("body", None)

        # Use optimized HTTP request
        result = make_http_request(method, url, headers, body, job_duration)
        logger.debug(f"Successfully execute schedule task id: {job_id}")
        return result

    except requests.Timeout:
        logger.error(f"Timeout occurred for job_id {job_id} with user :{run_account}")
        raise TimeoutError(f"Request timed out after for job_id {job_id}")
    except requests.HTTPError as http_error:
        logger.error(
            f"Request failed with status code: {http_error.response.status_code}"
        )
        raise HTTPError(response=http_error.response)
    except Exception as e:
        logger.error(f"Fail to execute schedule task id: {job_id} with error :{e}")
        raise


@app.task(bind=True, base=RepeatTask)
def executable(
    self,
    action,
    job_name,
    job_id,
    run_account,
    next_run_date,
    workflow_run_id: int = None,
    manual_run: bool = False,
):
    span = trace.get_current_span()
    span.set_attribute("job.id", job_id)
    span.set_attribute("job.name", job_name)
    span.set_attribute("job.run_account", run_account)
    span.set_attribute("job.workflow_run_id", workflow_run_id or "")
    span.set_attribute("job.manual_run", manual_run)
    logger.debug(
        f"Start executing schedule task id: {job_id} with type EXECUTABLE using user: {run_account}"
    )
    try:
        with tracer.start_as_current_span("get_job_settings_span") as db_span:
            # Use select_related to avoid N+1 queries
            job_settings = (
                JobSettings.objects.select_related().filter(job_id=job_id).first()
            )
            if job_settings is None:
                logger.error(f"JobSettings not found for job_id {job_id}.")
                return None

        job_action = job_settings.job_action
        job_duration = job_settings.max_run_duration.total_seconds()

        logger.debug(f"Executing EXECUTABLE with action: {job_action}")

        # Use optimized command execution
        stdout, stderr, returncode = execute_command(job_action, job_duration)

        if returncode != 0:
            logger.error(
                f"Command failed with return code {returncode} for job_id {job_id}."
            )
            raise ExecutableError(
                job_id, job_action, returncode, output=stdout, error_details=stderr
            )

        logger.debug(f"Successfully executed schedule task id: {job_id}.")
        return stdout, stderr, returncode

    except TimeoutError:
        logger.error(f"Timeout occurred for job_id {job_id} using user: {run_account}")
        raise
    except FileNotFoundError as e:
        raise e
    except Exception as e:
        logger.error(
            f"Failed to execute schedule task id: {job_id} due to an error {type(e)}: {e}"
        )
        raise


@app.task(bind=True)
def handle_group_completion(
    self,
    results,
    execution_orders: List[List[dict]],
    queue_name: str,
    workflow_id: str,
    workflow_run_id: int,
    ignore_result: bool = False,
):
    """Handle the completion of the group tasks"""
    logger.debug(
        "Handle group completion with remaining execution orders: %s", execution_orders
    )
    current_time = datetime.now(timezone.utc)
    current_time_ms = int(current_time.timestamp() * 1000)
    encounter_error = False
    workflow_run_status = "SUCCESS"

    with tracer.start_as_current_span("handle_group_completion_span"):
        logger.info("All tasks in execution group completed successfully")

        error_thrown = False
        for task_result in results:
            if isinstance(task_result, dict) and task_result.get("success") is False:
                logger.error(
                    "Task failed with error: %s",
                    task_result.get("error"),
                )

                error_thrown = True

        if error_thrown and not ignore_result:
            encounter_error = True
            workflow_run_status = "FAILED"

        # apply_async the next group
        if not encounter_error and execution_orders:
            logger.info("Applying next group")
            run_priority_group.apply_async(
                args=(
                    execution_orders,
                    queue_name,
                    workflow_id,
                    workflow_run_id,
                    current_time_ms,
                ),
                queue=queue_name,
                exchange=queue_name,
                routing_key=queue_name,
            )

            return

        response = call_scheduler_workflow_update(
            body={
                "workflow_id": workflow_id,
                "latest_status": workflow_run_status,
            },
        )
        logger.info("Workflow update response: %s", response)

        response = call_scheduler_workflow_run_update(
            body={
                "workflow_run_id": workflow_run_id,
                "end_date": current_time_ms,
                "status": workflow_run_status,
            },
        )
        logger.info("Workflow run update response: %s", response)
        remove_task_from_local(str(workflow_run_id), base_dir=LOCAL_WORKFLOW_DIR)


@app.task(bind=True)
def run_priority_group(
    self,
    execution_orders: List[List[dict]],
    queue_name: str,
    workflow_id: str,
    workflow_run_id: int,
    group_start_time: int,
):
    """
    Task that schedules two payload tasks at their designated times (:01 and :30 seconds)
    and waits for both to complete.

    Args:
        execution_orders: A list of lists, where each inner list contains task definitions
        queue_name: The name of the queue to which the tasks will be sent
        workflow_id: The id of the workflow
        workflow_run_id: The id of the workflow run
        group_start_time: The start time of the group, in milliseconds
    """
    with tracer.start_as_current_span("run_priority_group_span"):
        group_tasks = execution_orders[0]
        execution_group = []
        ignore_result = None

        logger.debug(
            "Group tasks: %s; Workflow ID: %s, Queue name: %s",
            group_tasks,
            workflow_id,
            queue_name,
        )

        for task in group_tasks:
            task_ignore_result = task.get("ignore_result", False)
            if ignore_result is None:
                ignore_result = task_ignore_result
            else:
                ignore_result &= task_ignore_result

            task_function = globals()[
                task["function_name"].split(".")[-1]
            ]  # Get the function from globals
            queue_name = task["queue_name"]

            if not task_function:
                logger.error(
                    "Task function not found for task: %s", task["function_name"]
                )
                continue

            queue_name = task["queue_name"]
            run_datetime = convert_epoch_to_datetime_millis(
                group_start_time
            ) + timedelta(seconds=task.get("delay", 0))

            execution_group.append(
                task_function.s(
                    *task["args"],
                    **task["kwargs"],
                    workflow_run_id=workflow_run_id,
                ).set(
                    task_id=task["task_id"],
                    queue=queue_name,
                    exchange=queue_name,
                    routing_key=queue_name,
                    eta=run_datetime,
                )
            )

            # Schedule both tasks at their designated times

        # Chain the group with the completion handler
        workflow = chord(
            execution_group,
            handle_group_completion.s(
                execution_orders[1:],
                queue_name=queue_name,
                workflow_id=workflow_id,
                workflow_run_id=workflow_run_id,
                ignore_result=ignore_result,
            ).set(
                queue=queue_name,
                exchange=queue_name,
                routing_key=queue_name,
            ),
        )

        result = workflow.apply_async(
            queue=queue_name,
            exchange=queue_name,
            routing_key=queue_name,
        )

        logger.info(
            "Group tasks scheduled, workflow ID: %s, workflow rund ID: %s",
            workflow_id,
            workflow_run_id,
        )

        return result.id


@app.task(bind=True, base=TaskGroup)
def run_workflow(self, workflow_id: str, workflow_start_time: str = None):
    logger.info("Running workflow with workflow ID: %s", workflow_id)
    task_cache: WorkflowCache = self.get_cache()
    orders: List[List[ScheduledTask]] = task_cache.orders

    if not orders:
        logger.info("Orders for workflow %s not found, workflow skipped", workflow_id)

        return

    workflow_run_id = task_cache.workflow_run_id

    logger.info(
        "Workflow start time: %s, workflow run id: %s",
        workflow_start_time,
        workflow_run_id,
    )

    queue_name = orders[0][0].queue_name
    orders_json = []

    if workflow_start_time:
        workflow_start_time = datetime.fromisoformat(workflow_start_time)
        if workflow_start_time.tzinfo is None:
            workflow_start_time = workflow_start_time.replace(tzinfo=timezone.utc)
    else:
        workflow_start_time = datetime.now(timezone.utc)

    for priority_group in orders:
        group_json = []
        for task in priority_group:
            group_json.append(task.next_run_json(after=workflow_start_time))
        orders_json.append(group_json)

    run_priority_group.apply_async(
        args=[
            orders_json,
            queue_name,
            workflow_id,
            workflow_run_id,
            int(workflow_start_time.timestamp() * 1000),
        ],
        queue=queue_name,
        exchange=queue_name,
        routing_key=queue_name,
    )

    logger.debug("Workflow scheduled, workflow_id=%s", workflow_id)
