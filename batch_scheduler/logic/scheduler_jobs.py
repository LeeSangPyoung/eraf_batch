import json
import uuid
from collections import defaultdict
from typing import Callable, Optional

from dateutil.parser import parse
from dateutil.rrule import rrulestr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased, joinedload

from logger import get_logger
from logic import (
    scheduler_job_groups,
    scheduler_job_run_logs,
    scheduler_job_servers,
    scheduler_users,
)
from models.scheduler_job_groups import SchedulerJobGroups
from models.scheduler_job_last_log import SchedulerJobLastLog
from models.scheduler_job_run_logs import SchedulerJobRunLogs
from models.scheduler_job_servers import SchedulerJobServers
from models.scheduler_jobs import SchedulerJobs
from models.scheduler_users import SchedulerUsers
from models.scheduler_workflow_priotiry_group import SchedulerWorkflowPriorityGroup
from utils import common_func, constants
from utils.celery_helper import CeleryClient
from utils.constants import DEFAULT_PAGE_NUMBER, FILTER_DEFAULT_PAGE_SIZE, JobStatus
from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client

RRULE_DATE_FORMAT = "%Y%m%dT%H%M%S"
FREQ_LIST = ["YEARLY", "MONTHLY", "WEEKLY", "DAILY", "HOURLY", "MINUTELY", "SECONDLY"]
UPDATE_PARAMS = {
    "frst_reg_user_id",
    "last_reg_user_id",
    "job_name",
    "start_date",
    "end_date",
    "repeat_interval",
    "retry_delay",
    "max_run_duration",
    "is_enabled",
    "max_run",
    "auto_drop",
    "max_failure",
    "restart_on_failure",
    "priority",
    "restartable",
    "job_comments",
    "job_type",
    "job_action",
    "system_id",
    "group_id",
    "job_id",
    "timezone",
}

logger = get_logger()


def scheduler_workflow_priority_group_mapping(record):
    """
    Mapping for scheduler workflow priority group
    Args:
        record: The record to map

    Returns:
        dict: The mapped record
    """
    return {
        "workflow_id": record.workflow_id,
        "priority_group_id": record.id,
        "latest_status": record.latest_status,
        "priority": record.priority,
        "frst_reg_date": record.frst_reg_date,
        "frst_reg_user_id": record.frst_reg_user_id,
        "last_chg_date": record.last_chg_date,
        "last_reg_user_id": record.last_reg_user_id,
    }


def frontend_mapping_convert(list_data):
    """
    Convert frontend mapping
    Args:
        list_data: The list of data to convert

    Returns:
        list: The converted data
    """
    try:
        final_result = []
        for obj in list_data:
            new_obj = {
                "jobId": obj.get("job_id"),
                "systemId": obj.get("system_id"),
                "system": obj.get("system_name"),
                "groupId": obj.get("group_id"),
                "group": obj.get("group_name"),
                "creator": obj.get("frst_reg_user_name"),
                "jobName": obj.get("job_name"),
                "comment": obj.get("job_comments"),
                "currentState": obj.get("current_state"),
                "schedule": obj.get("schedule_str"),
                "lastStartDate": obj.get("last_start_date"),
                "duration": obj.get("last_run_duration"),
                "lastResult": obj.get("last_result"),
                "startDate": obj.get("start_date"),
                "endDate": obj.get("end_date"),
                "repeatInterval": obj.get("repeat_interval"),
                "nextRunDate": obj.get("next_run_date"),
                "enable": obj.get("is_enabled"),
                "jobType": obj.get("job_type"),
                "jobAction": obj.get("job_action"),
                "jobBody": obj.get("job_body")
                if obj.get("job_body") != "null"
                else None,
                "jobCreateDate": obj.get("frst_reg_date"),
                "retryDelay": obj.get("retry_delay"),
                "maxRunDuration": obj.get("max_run_duration"),
                "maxRun": obj.get("max_run"),
                "maxFailure": obj.get("max_failure"),
                "jobPriority": obj.get("priority"),
                "autoDrop": obj.get("auto_drop"),
                "restartOnFailure": obj.get("restart_on_failure"),
                "restartable": obj.get("restartable"),
                "jobLastChgDate": obj.get("last_chg_date"),
                "runCount": obj.get("run_count"),
                "failureCount": obj.get("failure_count"),
                "retryCount": obj.get("retry_count"),
                "frstRegUserId": obj.get("frst_reg_user_id"),
                "lastRegUserId": obj.get("last_reg_user_id"),
                "workflowId": obj.get("workflow_id"),
            }

            final_result.append(new_obj)
    except Exception as e:
        logger.error("Exception: %s", e)
        final_result = []

    return final_result


def get_schedule_string(repeat_interval: Optional[str]) -> str:
    try:
        my_rrule = rrulestr(str(repeat_interval))
        schedule_str = f"{FREQ_LIST[my_rrule._freq]}({my_rrule._interval})"  # type: ignore
    except Exception:
        schedule_str = repeat_interval

    return schedule_str


def get_scheduler_jobs_query_fields():
    """
    Get scheduler jobs query fields
    Returns:
        list: The query fields, including columns and outer join tables
    """
    first_user_alias: SchedulerUsers = aliased(SchedulerUsers)
    last_user_alias: SchedulerUsers = aliased(SchedulerUsers)

    columns = (
        SchedulerJobs.job_id,
        SchedulerJobs.system_id,
        SchedulerJobServers.system_name,
        SchedulerJobServers.queue_name,
        SchedulerJobs.group_id,
        SchedulerJobGroups.group_name,
        SchedulerJobs.job_name,
        SchedulerJobs.start_date,
        SchedulerJobs.end_date,
        SchedulerJobs.repeat_interval,
        SchedulerJobs.max_run_duration,
        SchedulerJobs.max_run,
        SchedulerJobs.max_failure,
        SchedulerJobs.retry_delay,
        SchedulerJobs.priority,
        SchedulerJobs.is_enabled,
        SchedulerJobs.auto_drop,
        SchedulerJobs.restart_on_failure,
        SchedulerJobs.restartable,
        SchedulerJobs.job_comments,
        SchedulerJobs.job_type,
        SchedulerJobs.job_action,
        SchedulerJobs.job_body,
        SchedulerJobs.frst_reg_date,
        SchedulerJobs.frst_reg_user_id,
        first_user_alias.user_name.label("first_reg_user_name"),
        SchedulerJobs.last_chg_date,
        SchedulerJobs.last_reg_user_id,
        last_user_alias.user_name.label("last_reg_user_name"),
        SchedulerJobs.run_count,
        SchedulerJobs.failure_count,
        SchedulerJobs.retry_count,
        SchedulerJobs.next_run_date,
        SchedulerJobs.current_state,
        SchedulerJobs.last_start_date,
        SchedulerJobs.last_run_duration,
        SchedulerJobs.priority_group_id,
        SchedulerJobs.timezone,
        SchedulerJobs.state_before_disable,
        SchedulerJobs.workflow_id,
    )

    outer_joins = [
        (SchedulerJobServers, SchedulerJobServers.system_id == SchedulerJobs.system_id),
        (SchedulerJobGroups, SchedulerJobGroups.group_id == SchedulerJobs.group_id),
        (first_user_alias, first_user_alias.id == SchedulerJobs.frst_reg_user_id),
        (last_user_alias, last_user_alias.id == SchedulerJobs.last_reg_user_id),
    ]

    return columns, outer_joins


def scheduler_jobs_mapping(record):
    """
    Mapping for scheduler jobs
    Args:
        record: The record to map

    Returns:
        dict: The mapped record
    """
    return {
        "job_id": record.job_id,
        "system_id": record.system_id,
        "system_name": record.system_name,
        "queue_name": record.queue_name,
        "group_id": record.group_id,
        "group_name": record.group_name,
        "job_name": record.job_name,
        "start_date": record.start_date,
        "end_date": record.end_date,
        "repeat_interval": record.repeat_interval,
        "schedule_str": get_schedule_string(record.repeat_interval),
        "max_run_duration": str(record.max_run_duration)
        if record.max_run_duration
        else None,
        "max_run": record.max_run,
        "max_failure": record.max_failure,
        "retry_delay": record.retry_delay,
        "priority": record.priority,
        "is_enabled": record.is_enabled,
        "auto_drop": record.auto_drop,
        "restart_on_failure": record.restart_on_failure,
        "restartable": record.restartable,
        "job_comments": record.job_comments,
        "job_type": record.job_type,
        "job_action": record.job_action,
        "job_body": record.job_body,
        "frst_reg_date": record.frst_reg_date,
        "frst_reg_user_id": record.frst_reg_user_id,
        "frst_reg_user_name": record.first_reg_user_name,
        "last_chg_date": record.last_chg_date,
        "last_reg_user_id": record.last_reg_user_id,
        "last_reg_user_name": record.last_reg_user_name,
        "run_count": record.run_count,
        "failure_count": record.failure_count,
        "retry_count": record.retry_count,
        "next_run_date": record.next_run_date,
        "current_state": record.current_state,
        "last_start_date": record.last_start_date,
        "last_run_duration": str(record.last_run_duration)
        if record.last_run_duration
        else None,
        "priority_group_id": record.priority_group_id,
        "timezone": record.timezone,
        "state_before_disable": record.state_before_disable,
        "workflow_id": record.workflow_id,
    }


def scheduler_job_get_by_id(
    session: Session, job_id: str, mapping: Optional[Callable] = None
):
    """
    Get scheduler job by id
    Args:
        session: SQLAlchemy session
        job_id: Job ID
        mapping: Data mapping

    Returns:
        Scheduler job object
    """
    try:
        columns = None
        outer_joins = None
        if not mapping:
            mapping = scheduler_jobs_mapping
            columns, outer_joins = get_scheduler_jobs_query_fields()

        postgres_client = get_postgres_client()

        return postgres_client.get_record(
            session,
            SchedulerJobs,
            {"job_id": job_id},
            mapping,
            columns=columns,
            outer_joins=outer_joins,
        )
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def scheduler_jobs_read(session: Session, params: dict, related_groups: list):
    """
    Read scheduler jobs with pagination and filtering.
    Args:
        session: SQLAlchemy session
        params: Parameters for filtering and pagination
        related_groups: List of related groups
    Returns:
        Dictionary containing the result of the operation

    """
    try:
        logger.info("============ SCHEDULER_JOBS_READ ============")
        logger.debug("params: {params}")

        page_number: Optional[int] = params.pop("page_number", None)
        page_size: Optional[int] = params.pop("page_size", None)

        filter_params, filter_outer_joins = _parse_params_to_filters(
            params, related_groups
        )

        columns, outer_joins = get_scheduler_jobs_query_fields()
        outer_joins.extend(filter_outer_joins)

        postgres_client = get_postgres_client()

        if page_number is not None and page_size is not None:
            result = postgres_client.get_paginated_records(
                session,
                SchedulerJobs,
                filter_params,
                scheduler_jobs_mapping,
                page_size,
                page_number,
                sort_by=["job_name"],
                columns=columns,
                outer_joins=outer_joins,
            )
            # count total data
            result["total"] = postgres_client.count(
                session,
                SchedulerJobs,
                filter_params,
                filter_outer_joins,
            )
        else:
            result = postgres_client.get_records(
                session,
                SchedulerJobs,
                filter_params,
                scheduler_jobs_mapping,
                sort_by=["job_name"],
                columns=columns,
                outer_joins=outer_joins,
            )

        logger.debug("original len: %s", result["total"])

        # # fetch last results
        job_dict = {record.get("job_id"): record for record in result.get("data")}
        if not job_dict:
            return result

        last_logs_result = postgres_client.get_records(
            session,
            SchedulerJobLastLog,
            {
                "job_id": {"in_": job_dict.keys()},
            },
            lambda record: {
                "job_id": record.job_id,
                "status": record.run_log.status if record.run_log else None,
            },
            query_options=[joinedload(SchedulerJobLastLog.run_log)],
        )

        for last_log in last_logs_result.get("data"):
            job_dict[last_log["job_id"]].update(last_result=last_log["status"])

        result["data"] = job_dict.values()

    except Exception as e:
        logger.exception("Exception: %s", e)
        raise e

    return result


def scheduler_jobs_create(session: Session, params: dict):
    """
    Create scheduler job
    Args:
        session: SQLAlchemy session
        params: Parameters for creating a job
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ SCHEDULER_JOBS_CREATE ============")
        logger.debug("params: %s", params)

        check_system, check_user = __validate_jobs_create_input(session, params)

        job_id = str(uuid.uuid4())
        user_name = check_user.get("user_name")
        if params.get("auto_drop") is not None:
            auto_drop = params.get("auto_drop")
            params["max_run"] = params.get("max_run") if not auto_drop else 1
        params["job_id"] = job_id
        params["user_name"] = user_name

        celery_client = CeleryClient(logger)
        response = celery_client.celery_create_jobs(
            {**params, "queue_name": check_system.get("queue_name")}
        )
        response_data = json.loads(response.data)

        params["next_run_date"] = response_data.get("next_run_date")
        params["job_body"] = json.dumps(params.get("job_body"))
        postgres_client = get_postgres_client()
        postgres_client.create_record(session, SchedulerJobs, params)

        __create_log_record(session, job_id, user_name, "CREATE")

        error_msg = None
    except IntegrityError as e:
        logger.error(f"UniqueViolation: {e}")
        raise ValidationError("Job name already exists")
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


def __update_log_record(session: Session, params: dict, job_obj: dict):
    old_enable_state = job_obj["is_enabled"]
    new_enable_state = params["is_enabled"]
    old_max_run = job_obj["max_run"]
    new_max_run = params["max_run"]
    if old_enable_state != new_enable_state or old_max_run != new_max_run:
        input_val = {
            "is_enabled": params["is_enabled"],
            "current_state": "DISABLED" if not params["is_enabled"] else "READY TO RUN",
        }
        postgres_client = get_postgres_client()

        postgres_client.update_record(
            session,
            SchedulerJobs,
            {"job_id": params["job_id"]},
            input_val,
            check_record=False,
        )


def scheduler_jobs_update(session: Session, params: dict):
    """
    Update scheduler job
    Args:
        session: SQLAlchemy session
        params: Parameters for updating a job
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ SCHEDULER_JOBS_UPDATE ============")
        logger.debug("params: %s", params)

        job_obj = __check_valid_job(session, params, "update")
        logger.debug("old job obj: %s", job_obj)
        __check_valid_input(session, params)
        params = {key: val for key, val in params.items() if key in UPDATE_PARAMS}

        celery_update_input = {}
        start_date_changed = False
        for key in params:
            if key in {"job_type", "job_action", "job_body", "system_id"}:
                celery_update_input[key] = params[key]

            elif params[key] != job_obj[key]:
                if key == "start_date":
                    start_date_changed = True

                celery_update_input[key] = params[key]

        check_system, check_user = __validate_jobs_update_input(
            session,
            {
                **celery_update_input,
                "start_date": params.get("start_date"),
                "start_date_changed": start_date_changed,
                "last_reg_user_id": params.get("last_reg_user_id"),
            },
        )

        celery_update_input.update(
            {
                "job_id": params["job_id"],
                "user_name": check_user.get("user_name"),
                "queue_name": str(check_system.get("queue_name")),
            }
        )

        celery_client = CeleryClient(logger)
        response = celery_client.celery_update_jobs(celery_update_input)
        response_data = json.loads(response.data)

        if response_data.get("status") == "success":
            updated_tasks = response_data.get("updated_tasks")
            if updated_tasks:  # Check if the list is not empty
                next_run_date = updated_tasks[0].get(
                    "req_start_date"
                )  # Access the first element safely
                logger.info("next_run_date: %s", next_run_date)
                params["next_run_date"] = next_run_date

        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)
        params["job_body"] = json.dumps(params.get("job_body"))

        input_val = {
            x: params[x]
            for x in params
            if x not in ["job_id", "frst_reg_user_id", "frst_reg_date"]
        }

        postgres_client = get_postgres_client()
        postgres_client.update_record(
            session,
            SchedulerJobs,
            {"job_id": params["job_id"]},
            input_val,
            check_record=False,
        )

        __create_log_record(
            session, params["job_id"], check_user.get("user_name"), "UPDATE"
        )

        __update_log_record(session, params, job_obj)

        error_msg = None

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


def scheduler_jobs_update_workflow(session: Session, params: dict):
    """
    Update scheduler job workflow
    Args:
        session: SQLAlchemy session
        params: Parameters for updating a job workflow
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ SCHEDULER_JOBS_UPDATE ============")
        logger.debug("params: %s", params)

        postgres_client = get_postgres_client()
        job_obj = __check_valid_job(session, params)
        logger.debug("old job obj: %s", job_obj)
        __check_valid_input(session, params)
        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)

        input_val = {x: params[x] for x in params if x not in ["job_id"]}
        result = postgres_client.update_record(
            session,
            SchedulerJobs,
            {"job_id": params["job_id"]},
            input_val,
            check_record=False,
        )
        # TODO: Update to batch-celery

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


def scheduler_delete_workflow(session: Session, workflow_id: str):
    """
    Delete scheduler job workflow
    Args:
        session: SQLAlchemy session
        workflow_id: ID of the workflow to delete
    Returns:
        Dictionary containing the result of the operation
    """
    logger.info("============ SCHEDULER_JOBS_DELETE_WORKFLOW ============")
    logger.debug("workflow_id: %s", workflow_id)

    try:
        postgres_client = get_postgres_client()

        # Fetch workflow priority groups related to the workflow ID
        workflow_priority_groups_detail = postgres_client.get_records(
            session,
            SchedulerWorkflowPriorityGroup,
            {"workflow_id": workflow_id},
            scheduler_workflow_priority_group_mapping,
        )

        workflow_priority_groups = workflow_priority_groups_detail["data"]

        if not workflow_priority_groups:
            logger.warning("No priority groups found for workflow_id: %s", workflow_id)
            return {"status": "No records found", "workflow_id": workflow_id}

        logger.info("workflow_priority_groups: %s", workflow_priority_groups)

        input_val = {
            "last_chg_date": common_func.get_current_utc_time(in_epoch=True),
            "priority": None,
            "priority_group_id": None,
            "workflow_id": None,
        }

        priority_group_ids = [
            group["priority_group_id"] for group in workflow_priority_groups
        ]

        update_result = postgres_client.update_record(
            session,
            SchedulerJobs,
            {"priority_group_id": {"in_": priority_group_ids}},
            input_val,
            check_record=False,
        )

        assert update_result.get("success"), "Failed to update jobs"
        delete_result = postgres_client.delete_record(
            session, SchedulerWorkflowPriorityGroup, {"workflow_id": workflow_id}
        )

        assert delete_result.get("success"), "Failed to delete workflow priority groups"
        assert delete_result.get("total_deleted_records") == len(
            workflow_priority_groups
        ), "Failed to delete all workflow priority groups"

        celery_client = CeleryClient(logger)
        celery_client.celery_delete_workflow({"workflow_id": workflow_id})

        logger.info("Successfully deleted workflow_id: %s", workflow_id)
        return {"success": True, "error_msg": None, "data": None}

    except Exception as e:
        logger.error(
            "Exception occurred while deleting workflow_id: %s, Exception: %s",
            workflow_id,
            e,
        )
        raise e


def scheduler_jobs_update_data(session: Session, params: dict):
    """
    Update job data
    Args:
        session: The session object
        params: The parameters for the job

    Returns:
        dict: The job detail
    """
    try:
        logger.info("============ SCHEDULER_JOBS_UPDATE_DATA ============")
        logger.debug("params: %s", params)

        filter_params = {"job_id": params["job_id"]}
        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)
        postgres_client = get_postgres_client()
        result = postgres_client.update_record(
            session, SchedulerJobs, filter_params, params, check_record=False
        )

        assert result.get("success"), "Failed to update job"
        assert result.get("total_updated_records") == 1, "Failed to update job"

        # todo enhancement by using socket with FE for realtime data
        # socket_client = SocketClient(logger)
        # socket_client.socket_send('Job updated data', params)

        error_msg = None

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


def __check_valid_input(session: Session, params: dict):
    """
    Check valid input
    Args:
        session: SQLAlchemy session
        params: Parameters for checking valid input
    Returns:
        Dictionary containing the result of the operation
    """
    postgres_client = get_postgres_client()
    job_obj = (
        postgres_client.get_record(
            session,
            SchedulerJobs,
            {"job_id": params.get("job_id")},
            lambda record: {
                "is_enabled": record.is_enabled,
            },
            columns=[SchedulerJobs.is_enabled],
        )["data"]
        or {}
    )

    fields_to_check = ["start_date", "end_date", "repeat_interval", "max_run"]
    logger.info(
        "Check valid for job update id=%s params=%s", params.get("job_id"), params
    )

    if job_obj.get("is_enabled") is False and params.get("is_enabled") is False:
        if any(field in params for field in fields_to_check):
            logger.error(
                "Job is disable, Please update state to change those settings: %s",
                job_obj,
            )
            raise ValidationError(
                "Job is disable, Please update state to change those settings"
            )

    return job_obj


def update_job_status(session: Session, params: dict):
    """
    Update job status
    Args:
        session: SQLAlchemy session
        params: Parameters for updating job status
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ UPDATE_JOB_STATUS ============")
        logger.debug("params: %s", params)

        check_user = scheduler_users.scheduler_user_get_by_id(
            session, params["last_reg_user_id"]
        )["data"]
        if not check_user:
            raise ValidationError("Invalid user")

        postgres_client = get_postgres_client()
        job_obj = __check_valid_job(session, params)
        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)
        input_val = {x: params[x] for x in params if x not in ["job_id"]}

        celery_client = CeleryClient(logger)
        response = celery_client.celery_update_job_status(
            {"job_id": params.get("job_id"), "status": params.get("is_enabled")}
        )
        response_data = json.loads(response.data)

        if response_data.get("status") == "success":
            updated_tasks = response_data.get("updated_tasks")
            if updated_tasks:  # Check if the list is not empty
                next_run_date = updated_tasks[0].get(
                    "req_start_date"
                )  # Access the first element safely
                logger.info("next_run_date: %s", next_run_date)
                input_val["next_run_date"] = next_run_date

        if not params.get("is_enabled"):
            input_val["state_before_disable"] = job_obj.get("current_state")
            input_val["current_state"] = "DISABLED"
        else:
            input_val["state_before_disable"] = None
            input_val["current_state"] = job_obj.get("state_before_disable")
        postgres_client.update_record(
            session,
            SchedulerJobs,
            {"job_id": params["job_id"]},
            input_val,
            check_record=False,
        )

        operation = "ENABLED" if params.get("is_enabled") else "DISABLED"
        __create_log_record(
            session, params["job_id"], check_user.get("user_name"), operation
        )

        error_msg = None

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


def get_repeat_interval_sample(params: dict):
    """
    Get repeat interval sample
    Args:
        params: Parameters for getting repeat interval sample
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ GET_REPEAT_INTERVAL_SAMPLE ============")
        logger.debug("params: %s", params)

        repeat_interval = params.get("repeat_interval") or ""
        start_date = params.get("start_date") or ""
        have_limit = ("UNTIL" in repeat_interval) or ("COUNT" in repeat_interval)
        timezone = params.get("timezone") or ""

        if not repeat_interval:
            return "Missing repeat interval"

        if not timezone:
            return "Missing timezone"

        if not common_func.validate_rrule(repeat_interval):
            return "Invalid Repeat Interval: The value entered does not comply with the allowed format or range."

        repeat_interval_split = repeat_interval.split(";")
        repeat_interval_split = [
            i for i in repeat_interval_split if i and i != "\u200b"
        ]
        if not have_limit:
            repeat_interval_split.append("COUNT=30")
        repeat_interval_value = ";".join(repeat_interval_split)

        if start_date:
            dt_start = common_func.convert_date_str_to_format_with_timezone(
                str(start_date), RRULE_DATE_FORMAT, timezone
            )
            if not dt_start:
                return {
                    "success": False,
                    "error_msg": "Invalid start date",
                    "data": None,
                }
            repeat_interval_sample = list(
                rrulestr(repeat_interval_value, dtstart=parse(dt_start))
            )
        else:
            repeat_interval_sample = list(rrulestr(repeat_interval_value))

        repeat_interval_sample = [
            x.strftime(constants.DATETIME_FORMAT).replace(" ", " 오후 ")
            for x in repeat_interval_sample
        ]

        result = {"success": True, "error_msg": None, "data": repeat_interval_sample}

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


def manually_run(session: Session, params: dict):
    """
    Manually run job
    Args:
        session: SQLAlchemy session
        params: Parameters for manually running a job
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ MANUALLY_RUN ============")
        logger.debug("params: %s", params)

        job_obj = __check_valid_job(session, params, "manuallyRun")

        check_user = scheduler_users.scheduler_user_get_by_id(
            session, params["user_id"]
        )["data"]
        if not check_user:
            raise ValidationError("Invalid user")

        celery_client = CeleryClient(logger)
        result = celery_client.celery_manually_run(
            {
                "job_id": job_obj.get("job_id"),
                "job_type": job_obj.get("job_type"),
                "job_action": job_obj.get("job_action"),
                "job_body": job_obj.get("job_body"),
                "queue_name": job_obj.get("queue_name"),
                "user_name": check_user.get("user_name"),
            }
        )
        error_msg = None
        try:
            payload = json.loads(result.data) or {}
        except (ValueError, TypeError):
            payload = {}

        logger.debug("response payload: %s", payload)

        if payload.get("status") != "success":
            error_msg = (
                "Cannot manually run job. Worker not available"
                if payload.get("message") == "Worker not available"
                else "Cannot manually run job. Please try again later"
            )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


def force_stop(session: Session, params: dict):
    """
    Force stop job
    Args:
        session: SQLAlchemy session
        params: Parameters for force stopping a job
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ FORCE_STOP ============")
        logger.debug(f"params: {params}")

        params["function_check"] = "FORCE_STOP"
        __check_valid_job(session, params)

        celery_client = CeleryClient(logger)
        response = celery_client.celery_force_stop({"job_id": params.get("job_id")})
        error_msg = None

        if response.status == 404:
            # Update current state
            # set job status to ERROR
            postgres_client = get_postgres_client()
            postgres_client.update_record(
                session,
                SchedulerJobs,
                {"job_id": params.get("job_id")},
                {"current_state": JobStatus.STATUS_FAILURE.value},
                check_record=False,
            )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


def get_job_filter(session: Session, params: dict, related_groups: list):
    """
    Get job filter
    Args:
        session: SQLAlchemy session
        params: Parameters for getting job filter
        related_groups: List of related groups
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ GET_JOB_FILTER ============")
        logger.debug("params: %s", params)

        page_size: int = params.pop("page_size", FILTER_DEFAULT_PAGE_SIZE)
        page_number: int = params.pop("page_number", DEFAULT_PAGE_NUMBER)

        postgres_client = get_postgres_client()
        filter_params = {}

        if related_groups and "group_id" not in params:
            filter_params["group_id"] = {"in_": related_groups}
        if params.get("search_text"):
            filter_params["job_name"] = {"ilike": f"%{params.get('search_text')}%"}
        if params.get("group_id"):
            filter_params["group_id"] = params.get("group_id")

        result = postgres_client.get_paginated_records(
            session,
            SchedulerJobs,
            filter_params,
            lambda record: {
                "job_id": record.job_id,
                "job_name": record.job_name,
                "frst_reg_date": record.frst_reg_date,
                "current_state": record.current_state,
                "workflow_id": record.workflow_id,
            },
            page_size=page_size,
            page_number=page_number,
            columns=[
                SchedulerJobs.job_name,
                SchedulerJobs.job_id,
                SchedulerJobs.frst_reg_date,
                SchedulerJobs.current_state,
                SchedulerJobs.workflow_id,
            ],
        )
        result["total"] = postgres_client.count(session, SchedulerJobs, filter_params)

        result["status_list"] = [
            status.value for status in JobStatus.__members__.values()
        ]

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


def scheduler_jobs_delete(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_DELETE =============")
        logger.debug("params: %s", params)

        postgres_client = get_postgres_client()
        job_obj = postgres_client.get_record(
            session,
            SchedulerJobs,
            {"job_id": params.get("job_id")},
            lambda record: {
                "id": record.job_id,
                "current_state": record.current_state,
            },
        )["data"]
        if not job_obj:
            raise ValidationError(f"Invalid job_id: {params.get('job_id')}")

        if job_obj.get("current_state") in {"WAITING", "RUNNING"}:
            logger.error(
                f"Invalid job state: {job_obj} due to job in state: {job_obj.get('current_state')}"
            )
            raise ValidationError(
                f"Cant delete job due to job in state: {job_obj.get('current_state')}"
            )

        celery_client = CeleryClient(logger)
        celery_client.celery_delete_jobs({"job_id": params.get("job_id")})

        postgres_client.delete_record(
            session, SchedulerJobLastLog, {"job_id": params.get("job_id")}
        )
        postgres_client.delete_record(
            session, SchedulerJobRunLogs, {"job_id": params.get("job_id")}
        )
        postgres_client.delete_record(
            session, SchedulerJobs, {"job_id": params.get("job_id")}
        )
        error_msg = None

    except Exception as e:
        logger.error(f"Exception: {e}")
        error_msg = str(e.args)

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


# ================= Support func =================


def __validate_jobs_create_input(session: Session, params: dict):
    """
    Validate jobs create input
    Args:
        session: SQLAlchemy session
        params: Parameters for validating jobs create input
    Returns:
        Dictionary containing the result of the operation
    """
    logger.debug("check params: %s", params)
    if not params.get("system_id") or not params.get("group_id"):
        raise ValidationError("Invalid system or group")

    if params.get("job_type") not in ("REST_API", "EXECUTABLE"):
        raise ValidationError("Invalid job type")

    current_time = str(common_func.get_current_epoch_time_millis())
    logger.debug(f"current_time: {current_time}")
    start_date = str(params.get("start_date") or "")
    end_date = str(params.get("end_date") or "")

    if not start_date or start_date < current_time:
        raise ValidationError(
            "Start Date cannot be in the past. Please select a valid future date."
        )

    if end_date and start_date > end_date:
        raise ValidationError("Invalid end date")

    check_group_result = scheduler_job_groups.scheduler_job_groups_read(
        session, {"group_id": params["group_id"]}, []
    )
    if not isinstance(check_group_result, dict) or not check_group_result.get("data"):
        raise ValidationError("Group not existed")

    check_system = scheduler_job_servers.scheduler_job_server_get_by_id(
        session, params["system_id"]
    )["data"]

    if not check_system:
        raise ValidationError("Server not existed")

    check_user = None
    if params.get("frst_reg_user_id"):
        check_user = (
            scheduler_users.scheduler_user_get_by_id(
                session, params["frst_reg_user_id"]
            )["data"]
            or {}
        )

    if not check_user:
        raise ValidationError("Invalid user")

    return check_system, check_user


def __validate_jobs_update_input(session: Session, params: dict):
    """
    Validate jobs update input
    Args:
        session: SQLAlchemy session
        params: Parameters for validating jobs update input
    Returns:
        Dictionary containing the result of the operation
    """
    logger.debug("check params: %s", params)

    if params.get("job_type") not in ("REST_API", "EXECUTABLE"):
        raise ValidationError("Invalid job type")

    check_user = scheduler_users.scheduler_user_get_by_id(
        session, params["last_reg_user_id"]
    )["data"]

    if not check_user:
        raise ValidationError("Invalid user")

    if params.get("group_id"):
        check_group_result = scheduler_job_groups.scheduler_job_groups_read(
            session, {"group_id": params["group_id"]}, [], first=True
        )
        if not isinstance(check_group_result, dict) or not check_group_result.get(
            "data"
        ):
            raise ValidationError("Group not existed")

    check_system = scheduler_job_servers.scheduler_job_server_get_by_id(
        session, params["system_id"]
    ).get("data")
    if not check_system:
        raise ValidationError("Server not existed")

    current_time = str(common_func.get_current_epoch_time_millis())
    logger.debug("current_time: %s", current_time)
    start_date = str(params.get("start_date") or "")
    end_date = str(params.get("end_date") or "")
    start_date_changed = params.get("start_date_changed")
    logger.debug("start_date_changed: %s", start_date_changed)

    if start_date_changed:
        if not start_date or start_date < current_time:
            raise ValidationError("Invalid start date")

    if end_date:
        if start_date > end_date:
            raise ValidationError("Invalid end date")

    return check_system, check_user


def __check_valid_job(session: Session, params: dict, action: str = ""):
    """
    Check valid job
    Args:
        session: SQLAlchemy session
        params: Parameters for checking valid job
        action: Action which is the caller
    Returns:
        Dictionary containing the result of the operation
    """
    postgres_client = get_postgres_client()
    function_check = params.get("function_check", None)

    columns, outer_joins = get_scheduler_jobs_query_fields()
    job_obj = postgres_client.get_record(
        session,
        SchedulerJobs,
        {"job_id": params.get("job_id")},
        scheduler_jobs_mapping,
        columns=columns,
        outer_joins=outer_joins,
    ).get("data")

    if not job_obj:
        logger.error("Invalid job: %s", job_obj)
        raise ValidationError("Invalid job")

    if (
        action == "manuallyRun"
        and job_obj.get("max_run") != 0
        and job_obj.get("run_count") == job_obj.get("max_run")
    ):
        raise ValidationError(
            f"The batch run has reached the maximum limit ({job_obj.get('max_run')}). Please check and adjust the max run value if you wish to continue running the batch."
        )

    if (
        action == "update"
        and params.get("max_run")
        and job_obj.get("run_count") > params.get("max_run")
    ):
        raise ValidationError("Max Run must not be less than current Run Count")

    if function_check != "FORCE_STOP" and job_obj.get("current_state") in {
        "DELETED",
        "RUNNING",
    }:
        logger.error(
            "Invalid job state: %s due to job in state: %s",
            job_obj,
            job_obj.get("current_state"),
        )
        raise ValidationError(
            "Cant update job due to job in state: %s", job_obj.get("current_state")
        )

    return job_obj


def __create_log_record(session: Session, job_id, user_name, operation):
    scheduler_job_run_logs.scheduler_job_run_logs_create(
        session,
        {
            "job_id": job_id,
            "celery_task_name": None,
            "operation": operation,
            "status": None,
            "user_name": user_name,
            "error_no": 0,
            "req_start_date": None,
            "actual_start_date": None,
            "run_duration": None,
            "additional_info": None,
            "errors": None,
            "output": None,
        },
    )


def _parse_params_to_filters(params, related_groups: list):
    """
    Parse params to filters
    """
    outer_joins = []
    transformable_params = [
        "last_start_date_from",
        "last_start_date_to",
        "text_search",
        "last_result",
        "wf_registered",
    ]

    transformed_params = defaultdict(dict)
    for param_name in transformable_params:
        if param_name not in params:
            continue

        filter_value = params.pop(param_name, None)
        if not filter_value and param_name != "wf_registered":
            continue

        match param_name:
            case "last_start_date_from":
                transformed_params["last_start_date"].update(
                    {
                        "gte": filter_value,
                    }
                )
            case "last_start_date_to":
                transformed_params["last_start_date"].update(
                    {
                        "lte": filter_value,
                    }
                )
            case "text_search":
                transformed_params["or_"].update(
                    {
                        "job_name": {
                            "ilike": f"%{filter_value}%",
                        },
                        "job_comments": {
                            "ilike": f"%{filter_value}%",
                        },
                        "repeat_interval": {
                            "ilike": f"%{filter_value}%",
                        },
                    },
                )
            case "last_result":
                outer_joins.extend(
                    [
                        (
                            SchedulerJobLastLog,
                            SchedulerJobLastLog.job_id == SchedulerJobs.job_id,
                        ),
                        (
                            SchedulerJobRunLogs,
                            SchedulerJobRunLogs.log_id == SchedulerJobLastLog.log_id,
                        ),
                    ]
                )
                transformed_params[SchedulerJobRunLogs.status] = filter_value
            case "wf_registered":
                if filter_value:
                    transformed_params["workflow_id"] = {"ne": None}
                else:
                    transformed_params["workflow_id"] = {"eq": None}

    if related_groups and "group_id" not in params:
        transformed_params["group_id"] = {"in_": related_groups}

    params.update(transformed_params)

    return params, outer_joins
