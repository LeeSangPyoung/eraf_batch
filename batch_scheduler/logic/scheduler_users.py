from typing import Optional

import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from models.scheduler_job_groups import SchedulerJobGroups
from models.scheduler_job_servers import SchedulerJobServers
from config import Config
from logger import get_logger
from models.scheduler_jobs import SchedulerJobs
from models.scheduler_related_group_user import SchedulerRelatedGroupUser
from models.scheduler_users import SchedulerUsers
from utils import common_func, secret_helper, validate_helper
from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client

HOUR = 60 * 60

logger = get_logger()


def scheduler_users_mapping(record):
    return {
        "id": record.id,
        "user_id": record.user_id,
        "user_name": record.user_name,
        "celp_tlno": secret_helper.decrypt_data(record.celp_tlno),
        "email_addr": secret_helper.decrypt_data(record.email_addr),
        "frst_reg_date": record.frst_reg_date,
        "last_chg_date": record.last_chg_date,
        "user_type": record.user_type,
        "user_status": record.user_status,
        "last_pwd_chg_date": record.last_pwd_chg_date,
        "last_lgin_timr": record.last_lgin_timr,
        "lgin_fail_ncnt": record.lgin_fail_ncnt,
    }


def login_users_mapping(record):
    return {
        "id": record.id,
        "user_id": record.user_id,
        "user_name": record.user_name,
        "frst_reg_date": record.frst_reg_date,
        "last_chg_date": record.last_chg_date,
        "user_type": record.user_type,
        "user_pwd": record.user_pwd,
        "user_status": record.user_status,
        "last_pwd_chg_date": record.last_pwd_chg_date,
        "lgin_fail_ncnt": record.lgin_fail_ncnt,
    }


def related_group_users_mapping(record):
    return {
        "id": record.id,
        "user_id": record.user_id,
        "group_id": record.group_id,
    }


def users_read(session: Session, params: dict):
    try:
        logger.info("============ LOGIN_USERS_READ ============")
        postgres_client = get_postgres_client()
        result = postgres_client.get_records(
            session, SchedulerUsers, params, login_users_mapping
        )
        logger.info(f"result: {result}")

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_users_read(session: Session, params: dict):
    """
    Get scheduler users
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ SCHEDULER_USERS_READ ============")
        logger.debug(f"params: {params}")
        page_size: Optional[int] = params.pop("page_size", None)
        page_number: Optional[int] = params.pop("page_number", None)

        postgres_client = get_postgres_client()

        filter_params = _build_filter_params(params)

        if page_number is not None and page_size is not None:
            result = postgres_client.get_paginated_records(
                session,
                SchedulerUsers,
                filter_params,
                scheduler_users_mapping,
                page_size,
                page_number,
            )
            result["total"] = postgres_client.count(
                session,
                SchedulerUsers,
                filter_params,
            )
        else:
            result = postgres_client.get_records(
                session, SchedulerUsers, filter_params, scheduler_users_mapping
            )

        result_map = {result["id"]: result for result in result["data"]}

        logger.debug("Total data: %s", result["total"])

        related_groups = (
            postgres_client.get_records(
                session,
                SchedulerRelatedGroupUser,
                [SchedulerRelatedGroupUser.user_id.in_(list(result_map.keys()))],
                related_group_users_mapping,
            ).get("data")
            or []
        )

        for related_group in related_groups:
            user_id = related_group["user_id"]
            group_id = related_group["group_id"]

            if "related_scheduler_group" not in result_map[user_id]:
                result_map[user_id]["related_scheduler_group"] = []

            result_map[user_id]["related_scheduler_group"].append(group_id)

        result["data"] = list(result_map.values())

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


def scheduler_user_get_by_id(session: Session, user_id: str):
    """
    Get scheduler user by id
    Args:
        session: The session to use
        user_id: The user id to use
    """
    try:
        logger.info("============ SCHEDULER_USER_GET_BY_ID ============")
        logger.debug("user_id: %s", user_id)
        filter_params = {"id": user_id}
        postgres_client = get_postgres_client()

        result = postgres_client.get_record(
            session, SchedulerUsers, filter_params, scheduler_users_mapping
        )

        return result
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def scheduler_users_create(session: Session, params: dict):
    """
    Create scheduler user
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ SCHEDULER_USERS_CREATE ============")
        logger.debug(f"params: {params}")
        postgres_client = get_postgres_client()
        password = params["password"]
        valid, message = validate_helper.validate_password(password)
        if not valid:
            return {"success": False, "error_msg": message, "data": None}
        user_id = params["user_id"]
        valid_id, message_id = validate_helper.validate_user_id(user_id)
        if not valid_id:
            return {"success": False, "error_msg": message_id, "data": None}

        params["user_pwd"] = common_func.sha256_hash(password)
        params["last_pwd_chg_date"] = common_func.get_current_epoch_time_seconds()

        # Get group_list which is an array of group_id
        group_list = params.get("related_scheduler_group", [])

        result = postgres_client.create_record(
            session, SchedulerUsers, params, flush=True
        )
        user = result.pop("record", None)

        # If user creation was successful, create related group user entries
        if result.get("success") and group_list:
            if not user:
                raise ValidationError("User not existed")

            for group_id in group_list:
                related_group_user = {"group_id": group_id, "user_id": user.id}
                # Create the related SchedulerRelatedGroupUser entry

                postgres_client.create_record(
                    session, SchedulerRelatedGroupUser, related_group_user, flush=True
                )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_users_update(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_USERS_UPDATE ============")
        logger.debug(f"params: {params}")

        filter_params = {"id": params["id"]}
        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)
        params["celp_tlno"] = secret_helper.encrypt_data(params.get("celp_tlno") or "")
        params["email_addr"] = secret_helper.encrypt_data(
            params.get("email_addr") or ""
        )
        input_val = {
            x: params[x]
            for x in params
            if x
            in ["user_name", "last_chg_date", "celp_tlno", "email_addr", "user_type"]
        }

        postgres_client = get_postgres_client()
        related_groups = params["related_scheduler_group"]
        delete_params = {
            "user_id": params["id"],
        }
        postgres_client.delete_record(session, SchedulerRelatedGroupUser, delete_params)

        for group in related_groups:
            new_groups = {"user_id": params["id"], "group_id": group}
            postgres_client.create_record(
                session, SchedulerRelatedGroupUser, new_groups, flush=True
            )

        result = postgres_client.update_record(
            session, SchedulerUsers, filter_params, input_val
        )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_users_delete(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_USER_DELETE ============")
        logger.debug("params: %s", params)

        postgres_client = get_postgres_client()
        user_obj = postgres_client.get_record(
            session, SchedulerUsers, params, scheduler_users_mapping
        ).get("data")
        if not user_obj:
            raise Exception(f"Invalid id: {params.get('id')}")

        jobs_count = postgres_client.count(
            session, SchedulerJobs, {"frst_reg_user_id": params["id"]}
        )
        if jobs_count > 0:
            raise ValidationError(
                "This user cannot be deleted because it is currently associated with one or more jobs"
            )

        postgres_client.update_record(
            session,
            SchedulerJobs,
            {"frst_reg_user_id": params.get("id")},
            {"frst_reg_user_id": None},
            check_record=False,
        )
        postgres_client.update_record(
            session,
            SchedulerJobs,
            {"last_reg_user_id": params.get("id")},
            {"last_reg_user_id": None},
            check_record=False,
        )
        postgres_client.delete_record(
            session, SchedulerRelatedGroupUser, {"user_id": params.get("id")}
        )
        postgres_client.update_record(
            session,
            SchedulerJobGroups,
            {"frst_reg_user_id": params.get("id")},
            {"frst_reg_user_id": None},
            check_record=False,
        )
        postgres_client.update_record(
            session,
            SchedulerJobGroups,
            {"last_reg_user_id": params.get("id")},
            {"last_reg_user_id": None},
            check_record=False,
        )
        postgres_client.update_record(
            session,
            SchedulerJobServers,
            {"frst_reg_user_id": params.get("id")},
            {"frst_reg_user_id": None},
            check_record=False,
        )
        postgres_client.update_record(
            session,
            SchedulerJobServers,
            {"last_reg_user_id": params.get("id")},
            {"last_reg_user_id": None},
            check_record=False,
        )
        postgres_client.delete_record(session, SchedulerUsers, {"id": params.get("id")})
        error_msg = None

    except ValidationError as ve:
        logger.warning("ValidationError: %s", ve)
        raise ve
    except Exception as e:
        logger.error("Exception: %s", e)
        error_msg = str(e.args)

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": None,
    }


def scheduler_user_get_info(session: Session, user_id: str):
    try:
        logger.info("============ SCHEDULER_USERS_GET_INFO ============")
        logger.debug(f"user_id: {user_id}")
        filter_params = {"user_id": user_id}
        postgres_client = get_postgres_client()

        result = postgres_client.get_records(
            session, SchedulerUsers, filter_params, scheduler_users_mapping
        )
        logger.info(f"result: {result}")

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_users_reset_account(session: Session, user_id: str, params: dict):
    try:
        logger.info("============ SCHEDULER_USERS_RESET_ACCOUNT ============")
        logger.debug(f"params: {params}")
        filter_params = {"user_id": user_id}

        postgres_client = get_postgres_client()

        user = postgres_client.get_record(
            session, SchedulerUsers, filter_params, scheduler_users_mapping
        ).get("data")

        if not user:
            raise ValidationError("User not existed")

        target_params = {"user_id": params["target_user_id"]}

        target_user = postgres_client.get_record(
            session, SchedulerUsers, target_params, scheduler_users_mapping
        ).get("data")

        if not target_user:
            raise ValidationError("Target Reset User not existed")

        logger.debug(f"target_user  {target_user}")

        input_val = {
            "user_pwd": common_func.reset_pass(),
            "last_pwd_chg_date": common_func.get_current_epoch_time_seconds(),
            "last_chg_date": common_func.get_current_epoch_time_seconds(),
            "lgin_fail_ncnt": 0,
        }

        result = postgres_client.update_record(
            session, SchedulerUsers, target_params, input_val
        )
    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def check_password_lock(session: Session, user: dict):
    wrong_pass_count = user["lgin_fail_ncnt"]
    postgres_client = get_postgres_client()

    if wrong_pass_count + 1 > 5:
        input_val = {
            "user_status": False,
        }

        filter_params = {"id": user["id"]}

        postgres_client.update_record(session, SchedulerUsers, filter_params, input_val)
        return "Your account has been locked due to invalid password over 5 times"

    input_val = {
        "lgin_fail_ncnt": wrong_pass_count + 1,
    }

    filter_params = {"id": user["id"]}

    postgres_client.update_record(session, SchedulerUsers, filter_params, input_val)
    return "Invalid password"


def scheduler_users_login(session: Session, params: dict):
    try:
        postgres_client = get_postgres_client()

        user_id = params.get("user_id")
        password = params.get("password")
        if not user_id or not password:
            raise ValidationError("Missing input")

        password = common_func.sha256_hash(password)
        # Get user
        user = postgres_client.get_record(
            session, SchedulerUsers, {"user_id": user_id}, login_users_mapping
        ).get("data")
        if not user:
            raise ValidationError("User not existed")

        if not user["user_status"]:
            raise ValidationError(
                "Account deactivated, Please contact to Administrators to unlock"
            )

        # If the user exists but the password does not match, raise an exception
        if user["user_pwd"] != password:
            message = check_password_lock(session, user)
            raise ValidationError(message)

        expired_date = user["last_pwd_chg_date"] + 90 * 24 * 60 * 60
        if expired_date < common_func.get_current_epoch_time_seconds():
            raise ValidationError("Password is expired, Please update new password")

        secret_key = common_func.read_secret_key(Config.SECRET_KEY_PATH)  # type: ignore

        group_params = {"user_id": user["id"]}

        related_group = (
            postgres_client.get_records(
                session,
                SchedulerRelatedGroupUser,
                group_params,
                related_group_users_mapping,
            ).get("data")
            or []
        )
        # Map the group_id values to related_scheduler_group for each user
        user["related_scheduler_group"] = [group["group_id"] for group in related_group]

        # token should expire after 24 hrs
        token = jwt.encode(
            {
                "id": user["id"],
                "user_id": user["user_id"],
                "user_type": user["user_type"],
                "user_name": user["user_name"],
                "related_group": user["related_scheduler_group"],
            },
            secret_key,
            algorithm="HS256",
        )

        filter_params = {"user_id": user["user_id"]}
        input_val = {
            "last_activity_time": common_func.get_current_epoch_time_seconds(),
            "last_lgin_timr": common_func.get_current_epoch_time_seconds(),
            "lgin_fail_ncnt": 0,
        }

        postgres_client.update_record(session, SchedulerUsers, filter_params, input_val)

        error_msg = None
    except ValidationError as ve:
        logger.warning("ValidationError: %s", ve)
        error_msg = str(ve)
    except Exception as e:
        logger.error(f"Exception: {e}")
        error_msg = str(e)
        raise e

    return {
        "success": True if not error_msg else False,
        "error_msg": error_msg,
        "data": {"token": token} if not error_msg else None,
    }


def scheduler_users_update_status(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_USERS_UPDATE_STATUS ============")
        logger.debug(f"params: %s", params)

        filter_params = {"id": params["target_user_id"]}
        input_val = {
            "user_status": params["user_status"],
            "last_chg_date": common_func.get_current_epoch_time_seconds(),
        }

        postgres_client = get_postgres_client()
        result = postgres_client.update_record(
            session, SchedulerUsers, filter_params, input_val
        )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def scheduler_users_update_password(session: Session, params: dict):
    try:
        logger.info("============ SCHEDULER_USERS_UPDATE_STATUS ============")
        postgres_client = get_postgres_client()
        logger.debug(f"params: {params}")
        user_id = params["user_id"]
        old_password = params["old_pwd"]
        if not user_id or not old_password:
            raise ValidationError("Missing input")
        password = params["user_pwd"]

        if password == old_password:
            raise ValidationError(
                "New password can not be the same with old password, Please choose another password"
            )

        old_pwd = common_func.sha256_hash(old_password)

        user = postgres_client.get_record(
            session, SchedulerUsers, {"user_id": user_id}, login_users_mapping
        )
        if not user:
            raise ValidationError("User not existed")

        expired_date = user["last_pwd_chg_date"] + 90 * 24 * 60 * 60
        if expired_date > common_func.get_current_epoch_time_seconds():
            raise ValidationError("Password is not expired")

        if not user["user_status"]:
            raise ValidationError(
                "Account deactivated, Please contact to Administrators to unlock"
            )

        # If the user exists but the password does not match, raise an exception
        if user["user_pwd"] != old_pwd:
            raise ValidationError("Wrong old password, Please check again")

        filter_params = {"user_id": user_id}

        valid, message = validate_helper.validate_password(password)
        if not valid:
            return {"success": False, "error_msg": message, "data": None}

        input_val = {
            "user_pwd": common_func.sha256_hash(password),
            "last_chg_date": common_func.get_current_epoch_time_seconds(),
            "last_pwd_chg_date": common_func.get_current_epoch_time_seconds(),
        }

        result = postgres_client.update_record(
            session, SchedulerUsers, filter_params, input_val
        )

    except Exception as e:
        logger.error(f"Exception: {e}")
        raise e

    return result


def _build_filter_params(params: dict):
    """
    Build filter params for scheduler users
    Args:
        params: The parameters to use

    Returns:
        dict: The filter params
    """

    filter_group_id = params.pop("group_id", None)
    text_search = params.pop("text_search", None)

    if text_search:
        params.update(
            {
                "or_": {
                    "user_name": {"ilike": f"%{text_search}%"},
                    "email_addr": {"ilike": f"%{text_search}%"},
                }
            }
        )

    if filter_group_id:
        params.update(
            {
                "id": {
                    "in_": select(SchedulerRelatedGroupUser.user_id).where(
                        SchedulerRelatedGroupUser.group_id == filter_group_id
                    )
                }
            }
        )

    return params
