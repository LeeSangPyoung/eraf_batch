from sqlalchemy.orm import Session

from logger import get_logger
from logic import scheduler_jobs
from models.scheduler_job_last_log import SchedulerJobLastLog
from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client

logger = get_logger()


def scheduler_job_last_log_mapping(record):
    return {
        "id": record.id,
        "system_id": record.system_id,
        "group_id": record.group_id,
        "job_id": record.job_id,
        "job_name": record.job_name,
        "actual_start_date": record.actual_start_date,
        "log_id": record.log_id,
        "last_state_job": record.last_state_job,
    }


def scheduler_job_last_log_read(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_LAST_LOG_READ ============")
        logger.debug(f"params: {params}")

        postgres_client = get_postgres_client()

        result = postgres_client.get_record(
            session,
            SchedulerJobLastLog,
            params,
            scheduler_job_last_log_mapping,
        )
    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_job_last_log_create(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_LAST_LOG_CREATE ============")
        logger.debug(f"params: {params}")

        postgres_client = get_postgres_client()

        job_data_obj = scheduler_jobs.scheduler_job_get_by_id(
            session, params["job_id"], lambda record: {
                "system_id": record.system_id,
                "group_id": record.group_id,
                "job_name": record.job_name,
            }
        )["data"]
        if not job_data_obj:
            raise ValidationError("Invalid job id")

        params.update(
            {
                "system_id": job_data_obj["system_id"],
                "group_id": job_data_obj["group_id"],
                "job_name": job_data_obj["job_name"],
            }
        )

        result = postgres_client.create_record(session, SchedulerJobLastLog, params)

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_job_last_log_update(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_LAST_LOG_UPDATE ============")
        logger.debug(f"params: {params}")

        log_id = params.pop("id", None)

        if log_id is None:
            raise ValidationError("Invalid log id")

        filter_params = {"id": log_id}

        postgres_client = get_postgres_client()
        result = postgres_client.update_record(
            session, SchedulerJobLastLog, filter_params, params
        )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result
