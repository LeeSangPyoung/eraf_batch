from collections import defaultdict
from typing import Optional

import paramiko.pipe
from sqlalchemy.orm import Session

from logger import get_logger
from logic import scheduler_job_last_log, scheduler_jobs
from models.scheduler_job_run_logs import SchedulerJobRunLogs
from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client

logger = get_logger()

CURRENT_STATE_MAPPING = {
    "CREATE": "READY TO RUN",
    "RUNNING": "RUNNING",
    "SCHEDULED": "SCHEDULED",
    "READY_TO_RUN": "READY TO RUN",
    "RETRY_SCHEDULED": "RETRY SCHEDULED",
    "BLOCKED": "BLOCKED",
    "BROKEN": "BROKEN",
    "COMPLETED": "COMPLETED",
    "DISABLED": "DISABLED",
    "FAILED": "FAILED",
    "DELETED": "DELETED",
}

# operation which does not change the state of the job when update log
OPERATION_NOT_CHANGE_STATE = ["UPDATE"]
MANUAL_BATCH_TYPE = "manual"
AUTO_BATCH_TYPE = "auto"


def scheduler_job_run_logs_mapping(record):
    return {
        "log_id": record.log_id,
        "celery_task_name": record.celery_task_name,
        "log_date": record.log_date,
        "system_id": record.system_id,
        "group_id": record.group_id,
        "job_id": record.job_id,
        "system_name": record.system_name,
        "group_name": record.group_name,
        "job_name": record.job_name,
        "operation": record.operation,
        "batch_type": record.batch_type,
        "status": record.status.upper() if record.status else None,
        "retry_count": record.retry_count,
        "user_name": record.user_name,
        "error_no": record.error_no,
        "req_start_date": record.req_start_date,
        "actual_start_date": record.actual_start_date,
        "actual_end_date": record.actual_end_date,
        "run_duration": str(record.run_duration) if record.run_duration else None,
        "additional_info": record.additional_info,
        "errors": record.errors,
        "output": record.output,
    }


def scheduler_job_run_logs_read(session: Session, params: dict, related_group: list):
    try:
        logger.info("============ SCHEDULER_JOB_RUN_LOGS_READ ============")
        logger.debug(f"params: {params}")

        postgres_client = get_postgres_client()

        tranform_param_names = [
            "req_start_date_from",
            "req_start_date_to",
            "text_search",
        ]

        page_size: Optional[int] = params.pop("page_size", None)
        page_number: Optional[int] = params.pop("page_number", None)
        transformable_params = {
            key: params.pop(key, None) for key in tranform_param_names
        }

        # params.update({"operation": {"ne": "OUTDATED"}})

        transformed_params = defaultdict(dict)
        for filter_key, filter_value in transformable_params.items():
            if not filter_value:
                continue

            match filter_key:
                case "req_start_date_from":
                    transformed_params["req_start_date"].update({"gte": filter_value})
                case "req_start_date_to":
                    transformed_params["req_start_date"].update({"lte": filter_value})
                case "text_search":
                    transformed_params["or_"].update(
                        {
                            "job_name": {"ilike": f"%{filter_value}%"},
                            "operation": {"ilike": f"%{filter_value}%"},
                            "status": {"ilike": f"%{filter_value}%"},
                        }
                    )

        if related_group and "group_id" not in params:
            params["group_id"] = {"in_": related_group}

        params.update(transformed_params)

        if page_size is not None and page_number is not None:
            result = postgres_client.get_paginated_records(
                session,
                SchedulerJobRunLogs,
                params,
                scheduler_job_run_logs_mapping,
                page_size,
                page_number,
                sort_by=[("log_id", "desc")],
            )
            result["total"] = postgres_client.count(
                session, SchedulerJobRunLogs, params
            )
        else:
            result = postgres_client.get_records(
                session,
                SchedulerJobRunLogs,
                params,
                scheduler_job_run_logs_mapping,
                sort_by=[("log_id", "desc")],
            )

        logger.debug(f"original len: {result['total']}")
    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_job_run_logs_create(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_RUN_LOGS_CREATE ============")
        logger.debug(f"params: {params}")

        job_data_obj = scheduler_jobs.scheduler_job_get_by_id(
            session, params["job_id"], None
        )["data"]
        if not job_data_obj:
            raise ValidationError("Invalid job id")

        postgres_client = get_postgres_client()
        if "tasks" in params:
            result = __create_multiple_run_logs(
                session, postgres_client, params, job_data_obj
            )
        else:
            result = __create_single_run_logs(
                session, postgres_client, params, job_data_obj
            )

        __update_job_info(session, postgres_client, params, job_data_obj)

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_job_run_logs_update(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_RUN_LOGS_UPDATE ============")
        logger.debug(f"params: {params}")

        filter_params = {"celery_task_name": params["celery_task_name"]}
        log_id: Optional[int] = params.pop("log_id", None)
        if log_id:
            filter_params = {
                "log_id": log_id
            }

        input_val = {
            x: params[x]
            for x in params
            if x
               not in {
                   "log_id",
                   "job_id",
                   "celery_task_name",
                   "run_count",
                   "failure_count",
                   "job_retry_count",
                   "next_run_date"
               }
        }
        postgres_client = get_postgres_client()
        result = postgres_client.update_record(
            session, SchedulerJobRunLogs, filter_params, input_val
        )

        job_data_obj = scheduler_jobs.scheduler_job_get_by_id(
            session, params["job_id"], None
        )["data"]
        if not job_data_obj:
            raise ValidationError("Invalid job id")

        params_new = {
            "job_id": params.get("job_id"),
            "run_count": params.get("run_count")
            if params.get("run_count")
            else job_data_obj.get("run_count"),
            "failure_count": params.get("failure_count")
            if params.get("failure_count")
            else job_data_obj.get("failure_count"),
            "retry_count": params.get("retry_count")
            if params.get("retry_count") is not None
            else job_data_obj.get("retry_count"),
            "batch_type": params.get("batch_type"),
            "current_state": job_data_obj.get("current_state"),
            "status": params.get("status"),
            "operation": params.get("operation"),
        }

        if (
                params.get("next_run_date")
                and params.get("next_run_date") is not None
                and params.get("next_run_date") > 0
        ):
            params_new["next_run_date"] = params.get("next_run_date")

        if params.get("actual_start_date"):
            params_new["actual_start_date"] = params.get("actual_start_date")

        __update_job_info(session, postgres_client, params_new, job_data_obj)

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


# ================= Support func =================
def __create_multiple_run_logs(session: Session, postgres_client, params, job_data_obj):
    logger.info("============ Create multiple run logs")
    tasks = params.get("tasks") or []
    if not tasks:
        raise ValidationError("Missing tasks")
    obj_list = [
        {
            **task,
            "job_id": job_data_obj["job_id"],
            "system_id": job_data_obj["system_id"],
            "group_id": job_data_obj["group_id"],
            "job_name": job_data_obj["job_name"],
            "system_name": job_data_obj["system_name"],
            "group_name": job_data_obj["group_name"],
        }
        for task in tasks
    ]
    logger.debug(f"run logs object list: {obj_list}")
    result = postgres_client.create_multiple_record(
        session, SchedulerJobRunLogs, obj_list
    )

    return result


def __create_single_run_logs(session: Session, postgres_client, params, job_data_obj):
    logger.info("============ Create single run log")
    params.update(
        {
            "system_id": job_data_obj["system_id"],
            "group_id": job_data_obj["group_id"],
            "job_name": job_data_obj["job_name"],
            "system_name": job_data_obj["system_name"],
            "group_name": job_data_obj["group_name"],
        }
    )
    logger.debug(f"run logs object: {params}")

    response = postgres_client.create_record(
        session,
        SchedulerJobRunLogs,
        params,
        flush=True,
    )
    assert response.get("success"), "Failed to create job run logs"
    record: SchedulerJobRunLogs = response.pop("record", None)
    response["data"] = {
        "job_run_id": record.log_id,
    }
    logger.debug("Log created, log ID: %s", record.log_id)

    return response


def __update_job_info(session: Session, postgres_client, params, job_data_obj):
    latest_log = postgres_client.get_record(
        session,
        SchedulerJobRunLogs,
        {
            "job_id": params["job_id"],
            "operation": {"ne": "OUTDATED"},
            "or_": {
                "status": {"isnot": None},
                "actual_start_date": {"isnot": None}
            }
        },
        scheduler_job_run_logs_mapping,
        sort_by=[("log_id", "desc")],
    )["data"] or {}

    logger.debug(
        f"latest_log job {latest_log.get('job_id')}- log_id {latest_log.get('log_id')}: {latest_log}"
    )

    __process_last_log(session, params, latest_log)

    __update_job_data(session, params, job_data_obj, latest_log)


def __process_last_log(session: Session, params, latest_log):
    last_log_obj = scheduler_job_last_log.scheduler_job_last_log_read(
        session, {"job_id": params["job_id"]}
    )["data"]
    if not last_log_obj:
        logger.info("============ Create last log")
        actual_start_date = params.get("actual_start_date")
        params_create = {
            "job_id": params.get("job_id"),
            "actual_start_date": actual_start_date,
            "log_id": latest_log.get("log_id"),
            "last_state_job": "SCHEDULED",
        }
        scheduler_job_last_log.scheduler_job_last_log_create(session, params_create)
    else:
        params_update = {
            "id": last_log_obj.get("id"),
            "log_id": latest_log.get("log_id"),
        }

        if params.get("actual_start_date"):
            params_update["actual_start_date"] = params.get("actual_start_date")

        logger.info(f"============ Update last log: {params_update}")

        scheduler_job_last_log.scheduler_job_last_log_update(session, params_update)


def __update_job_data(session: Session, params, job_data_obj, latest_log):
    logger.info(
        f"============ Update job data with state: {job_data_obj.get('current_state')}"
    )
    actual_start_date = params.get("actual_start_date") or latest_log.get(
        "actual_start_date"
    )
    current_state, is_enabled = __get_job_current_state(
        session, job_data_obj, latest_log, params
    )
    params_new = {
        "job_id": params["job_id"],
        "run_count": params.get("run_count")
        if params.get("run_count")
        else job_data_obj.get("run_count"),
        "failure_count": params.get("failure_count")
        if params.get("failure_count")
        else job_data_obj.get("failure_count"),
        "retry_count": params.get("retry_count")
        if params.get("retry_count") is not None
        else job_data_obj.get("retry_count"),
        "last_start_date": actual_start_date,
        "last_run_duration": latest_log.get("run_duration"),
        "current_state": current_state,
        "is_enabled": is_enabled,
    }

    if params.get("next_run_date") is not None:
        params_new["next_run_date"] = params.get("next_run_date")

    if params.get("batch_type") is None or (
            __check_batch_type(params.get("batch_type"), AUTO_BATCH_TYPE)
            and params.get("operation") not in OPERATION_NOT_CHANGE_STATE
    ):
        logger.debug(
            f"=== Update State Job when Manual Job with state: {job_data_obj.get('current_state')}"
        )
        last_log_obj = scheduler_job_last_log.scheduler_job_last_log_read(
            session, {"job_id": params["job_id"]}
        )["data"] or {}
        params_update = {
            "id": last_log_obj.get("id"),
            "last_state_job": current_state,
        }
        scheduler_job_last_log.scheduler_job_last_log_update(session, params_update)

    logger.info(f"params_new: {params_new}")

    scheduler_jobs.scheduler_jobs_update_data(session, params_new)

    logger.info(f"============ Update Workflow for job {params['job_id']}")
    # postgres_client = get_postgres_client()
    # job_data = (
    #     postgres_client.get_record(
    #         session, SchedulerJobs, {"job_id": params["job_id"]}, lambda record: record
    #     ).get("data")
    #     or None
    # )
    #
    # if job_data and job_data.priority_group_id:
    #     latest_status = None
    #     if job_data.current_state in ("RUNNING", "RETRY SCHEDULED"):
    #         latest_status = "RUNNING"
    #     if job_data.current_state == "COMPLETED":
    #         latest_status = "SUCCESS"
    #     if job_data.current_state in ("FAILED", "BLOCKED", "DISABLED", "BROKEN"):
    #         latest_status = "FAILED"
    #
    #     logger.info(
    #         f"Update Status for Workflow: {job_data.priority_group_id} to status {latest_status}"
    #     )
    #     scheduler_workflow.update_workflow_status(
    #         session,
    #         {
    #             "priority_group_id": job_data.priority_group_id,
    #             "latest_status": latest_status,
    #             "current_job_id": job_data.job_id,
    #         },
    #     )
    # else:
    #     logger.info(f"Job {params['job_id']}not have any workflow")


def __get_job_current_state(
        session: Session, job_data_obj: dict, latest_log: dict, params: dict
):
    log_status = (latest_log.get("status") or "").upper()
    log_operation = (latest_log.get("operation") or "").upper()
    max_run = str(job_data_obj.get("max_run"))
    is_enabled = job_data_obj.get("is_enabled")
    batch_type = (params.get("batch_type") or "").lower()

    if __check_batch_type(batch_type, MANUAL_BATCH_TYPE):
        return __logic_state_manual_run(session, params, latest_log, job_data_obj)

    if not is_enabled:
        current_state = CURRENT_STATE_MAPPING["DISABLED"]

    elif log_operation != "BROKEN" and log_status == "FAILED":
        current_state = CURRENT_STATE_MAPPING["FAILED"]

    elif log_operation in {"COMPLETED", "BROKEN"} and job_data_obj.get("auto_drop"):
        current_state = CURRENT_STATE_MAPPING["DELETED"]

    elif log_operation == "ENABLED":
        mapping_value = "SCHEDULED" if max_run == "1" else "RETRY_SCHEDULED"
        current_state = CURRENT_STATE_MAPPING[mapping_value]

    elif log_operation in {"RUN", "RETRY_RUN", "RECOVERY_RUN"}:
        if not log_status:
            current_state = CURRENT_STATE_MAPPING["RUNNING"]
        else:
            mapping_value = "SCHEDULED" if max_run == "1" else "RETRY_SCHEDULED"
            current_state = CURRENT_STATE_MAPPING[mapping_value]
    else:
        current_state = CURRENT_STATE_MAPPING.get(log_operation) or job_data_obj.get(
            "current_state"
        )

    if current_state in {"COMPLETED", "DELETED"}:
        is_enabled = False

    return current_state, is_enabled


def __logic_state_manual_run(
        session: Session, params: dict, latest_log: dict, job_data_obj: dict
):
    logger.debug(
        f"Manual run {job_data_obj.get('job_id')} logic: {params.get('status')} - {latest_log}"
    )
    # operation = 'RUNNING' if latest_log.get('operation') == 'RUN' else latest_log.get('operation')
    if params.get("status"):
        if params.get("status").lower() in ["succeed"]:
            if latest_log.get("operation") == "COMPLETED":
                operation = "COMPLETED"
            else:
                if job_data_obj.get('max_run') == 0 or job_data_obj.get('max_run') > params.get('run_count'):
                    operation = "READY_TO_RUN"
                else:
                    last_log_obj = scheduler_job_last_log.scheduler_job_last_log_read(
                        session, {"job_id": params["job_id"]}
                    )["data"] or {}
                    operation = last_log_obj.get("last_state_job")
        else:
            if params.get("status").lower() in ["failed"]:
                if latest_log.get("operation") == "BROKEN":
                    operation = "BROKEN"
                else:
                    operation = "FAILED"
            elif params.get("status").lower() in ["created"]:
                operation = "CREATE"
            else:
                if latest_log.get("status").lower() == "stopped":
                    operation = "BLOCKED"
                if latest_log.get("status").lower() == "created":
                    operation = "CREATE"
    else:
        operation = "RUNNING"

    logger.debug(f"Manual run: {params.get('status')} - {operation}")
    return CURRENT_STATE_MAPPING[operation], job_data_obj.get("is_enabled")


# constant_type is lower case.
def __check_batch_type(batch_type, constants_type):
    return (batch_type or "").lower() == constants_type
