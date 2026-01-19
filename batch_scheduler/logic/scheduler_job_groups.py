from functools import partial
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from logger import get_logger
from logic import scheduler_users
from models.scheduler_job_groups import SchedulerJobGroups
from models.scheduler_related_group_user import SchedulerRelatedGroupUser
from utils import common_func
from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client

logger = get_logger()


def scheduler_job_groups_mapping(record, additional_fields: Optional[dict] = None):
    additional_fields = additional_fields or {}

    return {
        "group_id": record.group_id,
        "group_name": record.group_name,
        "group_comments": record.group_comments,
        "frst_reg_date": record.frst_reg_date,
        "frst_reg_user_id": record.frst_reg_user_id,
        "last_chg_date": record.last_chg_date,
        "last_reg_user_id": record.last_reg_user_id,
        # **__get_record_extend_data(record),
        **additional_fields,
    }


def get_group_filter_mapping(record, additional_fields: Optional[dict] = None):
    additional_fields = additional_fields or {}

    return {
        "id": record.group_id,
        "name": record.group_name,
        "frst_reg_user_id": record.frst_reg_user_id,
        "last_reg_user_id": record.last_reg_user_id,
        "group_comments": record.group_comments,
        **additional_fields,
    }


def scheduler_job_groups_read(
        session: Session, params: dict, related_groups: list, first: bool = False
):
    """
    Read scheduler job groups with pagination and filtering.
    """
    try:
        logger.info("============ SCHEDULER_JOB_GROUPS_READ ============")
        logger.debug(f"params: {params}")
        page_number = params.get("page_number")
        page_size = params.get("page_size")
        params.pop("page_number", None)
        params.pop("page_size", None)
        mapping_callback = scheduler_job_groups_mapping

        postgres_client = get_postgres_client()

        if related_groups and "group_id" not in params:
            params.update({"group_id": {"in_": related_groups}})
            mapping_callback = partial(
                scheduler_job_groups_mapping, additional_fields={"related": True}
            )

        if first:
            result = postgres_client.get_record(
                session,
                SchedulerJobGroups,
                params,
                mapping_callback,
            )

            result["data"] = [result["data"]] if result["data"] else []

        if page_number is not None and page_size is not None:
            result = postgres_client.get_paginated_records(
                session,
                SchedulerJobGroups,
                params,
                mapping_callback,
                page_size,
                page_number,
            )
            result["total"] = postgres_client.count(
                session,
                SchedulerJobGroups,
                params
            )
        else:
            result = postgres_client.get_records(
                session,
                SchedulerJobGroups,
                params,
                mapping_callback,
            )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_job_groups_create(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_GROUPS_CREATE ============")
        logger.debug(f"params: {params}")

        check_user = scheduler_users.scheduler_users_read(
            session, {"id": params["frst_reg_user_id"]}
        )["data"]
        if not check_user:
            raise ValidationError("Invalid user")

        postgres_client = get_postgres_client()
        result = postgres_client.create_record(
            session, SchedulerJobGroups, params, flush=True
        )

        group = result.pop("record", None)
        # return ID for created object
        if group:
            result["data"] = {
                "group_id": group.group_id
            }

        if result.get("success"):
            if not group:
                raise ValidationError("Group not existed")

            related_group_params = {
                "user_id": params["frst_reg_user_id"],
                "group_id": group.group_id,
            }

            postgres_client.create_record(
                session, SchedulerRelatedGroupUser, related_group_params
            )
    except IntegrityError as e:
        logger.error(f"UniqueViolation: {e}")
        raise ValidationError("Group name already exists")
    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_job_groups_update(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_JOB_GROUPS_UPDATE ============")
        logger.debug(f"params: {params}")

        check_user = scheduler_users.scheduler_users_read(
            session, {"id": params["last_reg_user_id"]}
        )["data"]
        if not check_user:
            raise ValidationError("Invalid user")

        filter_params = {"group_id": params["group_id"]}
        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)
        input_val = {
            x: params[x]
            for x in params
            if x in ["group_name", "group_comments", "last_chg_date", "last_reg_user_id"]
        }

        postgres_client = get_postgres_client()

        result = postgres_client.update_record(
            session, SchedulerJobGroups, filter_params, input_val
        )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def get_group_filter(session: Session, params: dict, related_groups: list):
    try:
        logger.info("============ GET_GROUP_FILTER ============")
        logger.debug(f"params: {params}")

        postgres_client = get_postgres_client()
        mapping_callback = get_group_filter_mapping

        filter_params = {}

        if related_groups and "group_id" not in params:
            filter_params.update({"group_id": {"in_": related_groups}})
            mapping_callback = partial(
                get_group_filter_mapping, additional_fields={"related": True}
            )
        if params.get("search_text"):
            filter_params.update(
                {
                    "group_name": {"ilike": f"%{params['search_text']}%"}
                }
            )
        if params.get("group_id"):
            filter_params["group_id"] = params.get("group_id")

        result = postgres_client.get_records(
            session,
            SchedulerJobGroups,
            filter_params,
            mapping_callback,
            sort_by=["group_name"],
        )
        result["total"] = postgres_client.count(
            session,
            SchedulerJobGroups,
            filter_params
        )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def get_group_detail(session: Session, params: dict):
    try:
        logger.info("============ GET_GROUP_DETAIL ============")
        logger.debug(f"params: {params}")

        postgres_client = get_postgres_client()
        group = postgres_client.get_record(
            session,
            SchedulerJobGroups,
            {"group_id": params["group_id"]},
            scheduler_job_groups_mapping,
        ).get("data")

        if not group:
            raise ValidationError(f"Group has id '{params['group_id']}' not existed")

        return {"success": True, "error_msg": None, "data": group}

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e


# ================= Support func =================
def __get_record_extend_data(record):
    jobs = []
    for job in record.jobs:
        jobs.append(
            {
                "job_id": job.job_id,
                "current_state": job.current_state,
                "name": job.job_name,
                "server_name": job.server.system_name,
                "priority_group_id": job.priority_group_id,
                "frst_reg_date": job.frst_reg_date,
                "workflow_id": job.workflow_id,
            }
        )

    return {"jobs": jobs}
