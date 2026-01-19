import uuid
from typing import Optional

from sqlalchemy.orm import Session

from config import SSH
from logger import get_logger
from logic import scheduler_users
from models.scheduler_job_last_log import SchedulerJobLastLog
from models.scheduler_job_run_logs import SchedulerJobRunLogs
from models.scheduler_job_servers import SchedulerJobServers
from models.scheduler_jobs import SchedulerJobs
from utils import common_func
from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client
from utils.ssh_helper import SshClient

logger = get_logger()


def scheduler_job_servers_mapping(record):
    """
    Mapping for scheduler_job_servers

    Args:
        record: The record to map

    Returns:
        dict: The mapped record
    """

    return {
        "system_id": record.system_id,
        "system_name": record.system_name,
        "host_name": record.host_name,
        "host_ip_addr": record.host_ip_addr,
        "secondary_host_ip_addr": record.secondary_host_ip_addr,
        "queue_name": record.queue_name,
        "folder_path": record.folder_path,
        "secondary_folder_path": record.secondary_folder_path,
        "ssh_user": record.ssh_user,
        "system_comments": record.system_comments,
        "frst_reg_date": record.frst_reg_date,
        "frst_reg_user_id": record.frst_reg_user_id,
        "last_chg_date": record.last_chg_date,
        "last_reg_user_id": record.last_reg_user_id,
    }


def get_server_filter_mapping(record):
    """
    Mapping for get_server_filter

    Args:
        record: The record to map

    Returns:
        dict: The mapped record
    """

    return {
        "id": record.system_id,
        "name": record.system_name,
        "frst_reg_user_id": record.frst_reg_user_id,
        "last_reg_user_id": record.last_reg_user_id,
        "host_name": record.host_name,
        "host_ip_addr": record.host_ip_addr,
        "secondary_host_ip_addr": record.secondary_host_ip_addr,
        "system_comments": record.system_comments,
        "folder_path": record.folder_path,
        "secondary_folder_path": record.secondary_folder_path,
    }


def scheduler_job_servers_read(session: Session, params: dict):
    """
    Read scheduler_job_servers
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ SCHEDULER_JOB_SERVERS_READ ============")
        logger.debug("params: %s", params)
        page_number: Optional[int] = params.get("page_number")
        page_size: Optional[int] = params.get("page_size")
        params.pop("page_number", None)
        params.pop("page_size", None)

        postgres_client = get_postgres_client()

        if page_number is not None and page_size is not None:
            result = postgres_client.get_paginated_records(
                session,
                SchedulerJobServers,
                params,
                scheduler_job_servers_mapping,
                page_size,
                page_number,
            )
            result["total"] = postgres_client.count(
                session, SchedulerJobServers, params
            )
        else:
            result = postgres_client.get_records(
                session, SchedulerJobServers, params, scheduler_job_servers_mapping
            )

        return result
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def scheduler_job_server_get_by_id(session: Session, system_id: str):
    """
    Get scheduler job server by id
    Args:
        session: The session to use
        system_id: The system id to use
    """
    try:
        logger.info("============ SCHEDULER_JOB_SERVER_GET_BY_ID ============")
        logger.debug("system_id: %s", system_id)
        filter_params = {"system_id": system_id}
        postgres_client = get_postgres_client()

        result = postgres_client.get_record(
            session, SchedulerJobServers, filter_params, scheduler_job_servers_mapping
        )

        return result
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def scheduler_job_servers_create(session: Session, params: dict):
    """
    Create scheduler job servers
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ SCHEDULER_JOB_SERVERS_CREATE ============")
        logger.debug("params: %s", params)

        if not params.get("host_ip_addr") or not params.get("folder_path"):
            raise ValidationError("Missing host_ip_addr or folder_path")

        check_user = scheduler_users.scheduler_user_get_by_id(
            session, params["frst_reg_user_id"]
        )["data"]
        if not check_user:
            raise ValidationError("Invalid user")

        system_id = uuid.uuid4()
        params["system_id"] = str(system_id)
        params["queue_name"] = str(system_id.hex)

        list_host_ip_addr = [
            params.get("host_ip_addr"),
            params.get("secondary_host_ip_addr"),
        ]
        list_folder_path = [
            params.get("folder_path"),
            params.get("secondary_folder_path"),
        ]

        for host_ip_addr, folder_path in zip(list_host_ip_addr, list_folder_path):
            logger.info(
                "===========host_ip_addr: %s, folder_path: %s",
                host_ip_addr,
                folder_path,
            )
            if host_ip_addr and folder_path:
                scheduler_start_worker(host_ip_addr, folder_path, params["queue_name"])

        postgres_client = get_postgres_client()
        result = postgres_client.create_record(
            session, SchedulerJobServers, params, flush=True
        )
        record = result.pop("record", None)

        if record:
            result["data"] = {
                "system_id": record.system_id,
            }

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


def scheduler_start_worker(host_ip_addr: str, folder_path: str, queue_name: str):
    """
    Start worker

    Args:
        host_ip_addr: The host ip address to use
        folder_path: The folder path to use
        queue_name: The queue name to use

    Returns:
        dict: The result
    """
    if host_ip_addr and ("@" in host_ip_addr):
        ssh_user, host_ip_addr = __split_user_host_ip_adr(host_ip_addr)
        logger.info(
            "============ __split_user_host_ip_adr %s@%s", ssh_user, host_ip_addr
        )
    else:
        ssh_user = SSH.DEFAULT_USERNAME

    ssh_client = SshClient(logger)
    ssh_client.copy_celery_worker_code_v2(host_ip_addr, ssh_user, folder_path)
    success, error = ssh_client.start_celery_worker_v2(
        host_ip_addr, ssh_user, folder_path, queue_name
    )
    if not success:
        raise Exception(f"Worker start failed: {error}")


def scheduler_job_servers_update(session: Session, params: dict):
    """
    Update scheduler job servers
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ SCHEDULER_JOB_SERVERS_UPDATE ============")
        logger.debug("params: %s", params)

        check_user = scheduler_users.scheduler_user_get_by_id(
            session, params["last_reg_user_id"]
        )["data"]
        if not check_user:
            raise ValidationError("Invalid user")

        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)
        if params.get("host_ip_addr") and ("@" in params["host_ip_addr"]):
            __split_user_host(params)

        old_record = scheduler_job_server_get_by_id(session, params["system_id"])[
            "data"
        ]
        if not old_record:
            raise ValidationError("Server not existed")

        ssh_client = SshClient(logger)

        if (
            params.get("host_ip_addr")
            and old_record.get("host_ip_addr") != params["host_ip_addr"]
        ):
            logger.info("============ Host ip address change")
            __process_update_celery_worker(
                ssh_client, params["host_ip_addr"], params, old_record
            )

        elif (
            params.get("folder_path")
            and old_record.get("folder_path") != params["folder_path"]
        ):
            logger.info("============ Folder path change")
            __process_update_celery_worker(
                ssh_client, old_record.get("host_ip_addr"), params, old_record
            )
            ssh_client.clean_old_worker_folder(old_record)

        input_val = {
            x: params[x]
            for x in params
            if x
            in [
                "system_name",
                "host_name",
                "host_ip_addr",
                "system_comments",
                "folder_path",
                "ssh_user",
                "last_chg_date",
                "last_reg_user_id",
            ]
        }
        postgres_client = get_postgres_client()
        result = postgres_client.update_record(
            session,
            SchedulerJobServers,
            {"system_id": params["system_id"]},
            input_val,
        )

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


def scheduler_job_servers_restart(session: Session, params: dict):
    """
    Restart scheduler job servers
    Args:
        session: The session to use
        params: The parameters to use
    """
    postgres_client = get_postgres_client()
    ssh_client = SshClient(logger)

    filters = {}
    redeploy = params.get("redeploy", False)

    if params.get("system_name"):
        logger.info(
            "============ Restart scheduler job servers by system name: %s",
            params["system_name"],
        )
        filters["system_name"] = params["system_name"]
    else:
        logger.info("============ Restart all scheduler job servers")

    count = postgres_client.count(
        session,
        SchedulerJobServers,
        filters,
    )

    if count == 0:
        raise ValidationError("Record not existed")

    # get records by batch:
    batch_size = 10
    page_number = 1

    while ((page_number - 1) * batch_size) < count:
        records = postgres_client.get_paginated_records(
            session,
            SchedulerJobServers,
            filters,
            lambda record: {
                "host_ip_addr": record.host_ip_addr,
                "folder_path": record.folder_path,
                "ssh_user": record.ssh_user,
                "queue_name": record.queue_name,
            },
            columns=[
                SchedulerJobServers.host_ip_addr,
                SchedulerJobServers.folder_path,
                SchedulerJobServers.ssh_user,
                SchedulerJobServers.queue_name,
            ],
            page_size=batch_size,
            page_number=page_number,
        )
        for record in records["data"]:
            try:
                ssh_user = record["ssh_user"]
                host_ip_addr = record["host_ip_addr"]
                folder_path = record["folder_path"]
                queue_name = record["queue_name"]

                logger.info(
                    "============ Stop celery worker for %s@%s",
                    ssh_user,
                    host_ip_addr,
                )
                ssh_client.stop_celery_worker(
                    {
                        "host_ip_addr": host_ip_addr,
                        "ssh_user": ssh_user,
                        "folder_path": folder_path,
                        "queue_name": queue_name,
                    }
                )

                if redeploy:
                    logger.info(
                        "============ Redeploy celery worker code for %s@%s",
                        ssh_user,
                        host_ip_addr,
                    )
                    ssh_client.copy_celery_worker_code_v2(
                        host_ip_addr, ssh_user, folder_path
                    )
                    ssh_client.start_celery_worker_v2(
                        host_ip_addr, ssh_user, folder_path, queue_name
                    )
                else:
                    logger.info(
                        "============ Start celery worker for %s@%s",
                        ssh_user,
                        host_ip_addr,
                    )
                    ssh_client.restart_celery_worker_v2(
                        host_ip_addr, ssh_user, folder_path
                    )
            except Exception as e:
                logger.error("Exception: %s", e)
                continue

        page_number += 1


def scheduler_job_servers_delete(session: Session, params: dict):
    """
    Delete scheduler job servers
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ SCHEDULER_JOB_SERVERS_DELETE ============")
        logger.debug("params: %s", params)

        server = scheduler_job_server_get_by_id(session, params["system_id"])["data"]
        if not server:
            raise ValidationError("Server not existed")

        # Check for assigned jobs
        postgres_client = get_postgres_client()
        jobs_count = postgres_client.count(
            session, SchedulerJobs, {"system_id": params["system_id"]}
        )
        if jobs_count > 0:
            raise ValidationError(
                "This system cannot be deleted because it is currently associated with one or more jobs."
            )

        ssh_client = SshClient(logger)
        list_host_ip_addr = [
            server.get("host_ip_addr"),
            server.get("secondary_host_ip_addr"),
        ]
        list_folder_path = [
            server.get("folder_path"),
            server.get("secondary_folder_path"),
        ]
        for host_ip_addr, folder_path in zip(list_host_ip_addr, list_folder_path):
            logger.info(
                "===========host_ip_addr: %s, folder_path: %s",
                host_ip_addr,
                folder_path,
            )
            if host_ip_addr and ("@" in host_ip_addr):
                ssh_user, host_ip_addr = __split_user_host_ip_adr(host_ip_addr)
                logger.info(
                    "============ __split_user_host_ip_adr %s@%s",
                    ssh_user,
                    host_ip_addr,
                )
            else:
                ssh_user = SSH.DEFAULT_USERNAME
            if host_ip_addr and folder_path:
                # Stop workers
                ssh_client.stop_celery_worker(
                    {
                        "host_ip_addr": host_ip_addr,
                        "ssh_user": ssh_user,
                        "folder_path": folder_path,
                        "queue_name": server.get("queue_name"),
                    }
                )
                # Delete files in server paths
                ssh_client.clean_old_worker_folder(
                    {
                        "host_ip_addr": host_ip_addr,
                        "ssh_user": ssh_user,
                        "folder_path": folder_path,
                    }
                )

        # Before deleting, set system_id to null in related last log and run logs
        postgres_client.update_record(
            session,
            SchedulerJobLastLog,
            {"system_id": params["system_id"]},
            {"system_id": None},
            check_record=False,
        )
        postgres_client.update_record(
            session,
            SchedulerJobRunLogs,
            {"system_id": params["system_id"]},
            {"system_id": None},
            check_record=False,
        )

        # Delete from database
        postgres_client.delete_record(
            session, SchedulerJobServers, {"system_id": params["system_id"]}
        )
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


def get_server_filter(session: Session, params: dict):
    """
    Get server filter
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ GET_SERVER_FILTER ============")
        logger.debug("params: %s", params)

        filters = {}
        if params.get("search_text"):
            filters["system_name"] = {"ilike": f"%{params['search_text']}%"}

        postgres_client = get_postgres_client()
        result = postgres_client.get_records(
            session,
            SchedulerJobServers,
            filters,
            get_server_filter_mapping,
            sort_by=[("system_name", "asc")],
        )

        return result

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def get_server_detail(session: Session, params: dict):
    """
    Get server detail
    Args:
        session: The session to use
        params: The parameters to use

    Returns:
        dict: The result
    """
    try:
        logger.info("============ GET_SERVER_DETAIL ============")
        logger.debug("params: %s", params)

        if not params.get("job_id"):
            raise ValidationError("Missing job_id")

        postgres_client = get_postgres_client()

        job_data = postgres_client.get_record(
            session,
            SchedulerJobs,
            {"job_id": params["job_id"]},
            lambda record: {"system_id": record.system_id},
            columns=[SchedulerJobs.system_id],
        ).get("data")

        if not job_data:
            raise ValidationError("Invalid job_id")

        result = postgres_client.get_records(
            session,
            SchedulerJobServers,
            {"system_id": job_data["system_id"]},
            scheduler_job_servers_mapping,
        )

        return result

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


# ================= Support func =================
def __split_user_host(params: dict):
    """
    Split user host
    Args:
        params: The parameters to use
    """
    host_ip_addr_split = params["host_ip_addr"].strip().split("@")
    if len(host_ip_addr_split) != 2:
        raise ValidationError("Invalid host_ip_addr")

    params["ssh_user"] = host_ip_addr_split[0]
    params["host_ip_addr"] = host_ip_addr_split[1]


# ================= Support func =================
def __split_user_host_ip_adr(host_ip_addr: str):
    """
    Split user host ip address
    Args:
        host_ip_addr: The host ip address to use
    """
    host_ip_addr_split = host_ip_addr.strip().split("@")
    if len(host_ip_addr_split) != 2:
        raise ValidationError("Invalid host_ip_addr")

    ssh_user = host_ip_addr_split[0]
    host_ip_addr = host_ip_addr_split[1]
    return ssh_user, host_ip_addr


def __process_update_celery_worker(
    ssh_client: SshClient,
    host_ip_addr: str,
    params: dict,
    old_record: dict,
):
    """
    Process update celery worker
    Args:
        session: The session to use
        ssh_client: The ssh client to use
        host_ip_addr: The host ip address to use
        params: The parameters to use
        old_record: The old record to use

    Returns:
        dict: The result
    """
    try:
        __stop_old_celery_worker(ssh_client, old_record)

        ssh_user = params.get("ssh_user") or old_record.get("ssh_user")
        ssh_client.copy_celery_worker_code(
            host_ip_addr, ssh_user, {"folder_path": params["folder_path"]}
        )
        success, error = ssh_client.start_celery_worker(
            host_ip_addr,
            ssh_user,
            {
                "queue_name": old_record.get("queue_name"),
                "folder_path": params["folder_path"],
            },
        )
        if not success:
            __restart_old_celery_worker(ssh_client, error, old_record)

    except Exception as e:
        logger.error("Exception create celery worker: %s", e)
        raise e


def __stop_old_celery_worker(ssh_client, old_record):
    ssh_client.stop_celery_worker(
        {
            "host_ip_addr": old_record.get("host_ip_addr"),
            "ssh_user": old_record.get("ssh_user"),
            "folder_path": old_record.get("folder_path"),
            "queue_name": old_record.get("queue_name"),
        }
    )


def __restart_old_celery_worker(
    ssh_client: SshClient, error: Optional[str], old_record: dict
):
    logger.info("============ Restart old celery worker")
    ssh_client.start_celery_worker(
        old_record.get("host_ip_addr"),
        old_record.get("ssh_user"),
        {
            "queue_name": old_record.get("queue_name"),
            "folder_path": old_record.get("folder_path"),
        },
    )
    logger.error("error: %s", error)
    raise Exception(f"New worker start failed: {error}")
