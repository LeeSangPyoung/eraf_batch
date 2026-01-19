from datetime import datetime
import json
from typing import Any, Dict, Optional

from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from logger import get_logger
from logic import scheduler_jobs, scheduler_users
from models.scheduler_job_groups import SchedulerJobGroups
from models.scheduler_job_run_logs import SchedulerJobRunLogs
from models.scheduler_jobs import SchedulerJobs
from models.scheduler_workflow import SchedulerWorkflow
from models.scheduler_workflow_priotiry_group import SchedulerWorkflowPriorityGroup
from models.scheduler_workflow_run import SchedulerWorkflowRun
from schemas.scheduler_workflow import WorkflowBaseSchema, WorkflowUpdateSchema
from utils import common_func
from utils.celery_helper import CeleryClient
from utils.constants import DEFAULT_PAGE_NUMBER, FILTER_DEFAULT_PAGE_SIZE
from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client

logger = get_logger()


def scheduler_workflow_mapping(record, extra_fields=None):
    """
    Mapping for scheduler workflow
    Args:
        record: The record to map
        extra_fields: Optional dict mapping output keys to record attribute names.
                      E.g., {"group": "group_name"} -> "group": record.group_name

    Returns:
        dict: The mapped record
    """
    base = {
        "workflow_id": record.id,
        "workflow_name": record.workflow_name,
        "latest_status": record.latest_status,
        "group_id": record.group_id,
        "start_date": record.start_date,
        "repeat_interval": record.repeat_interval,
        "frst_reg_date": record.frst_reg_date,
        "frst_reg_user_id": record.frst_reg_user_id,
        "last_chg_date": record.last_chg_date,
        "last_reg_user_id": record.last_reg_user_id,
        "last_run_date": record.last_run_date,
        "next_run_date": record.next_run_date
    }

    if isinstance(extra_fields, dict):
        for output_key, attr_name in extra_fields.items():
            base[output_key] = getattr(record, attr_name, None)

    return base


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


def scheduler_job_mapping(record):
    """
    Mapping for scheduler job
    Args:
        record: The record to map

    Returns:
        dict: The mapped record
    """
    return {
        "job_id": record.job_id,
        "job_name": record.job_name,
        "current_state": record.current_state,
        "priority": record.priority,
        "ignore_result": record.ignore_result,
        "priority_group_id": record.priority_group_id,
        "workflow_id": record.workflow_id,
        "duration": str(record.last_run_duration),
        "delay": record.workflow_delay,
    }


def get_workflow_detail(session: Session, params: dict):
    """
    Get workflow detail
    Args:
        session: The session object
        params: The parameters for the workflow

    Returns:
        dict: The workflow detail
    """
    try:
        logger.info("============ SCHEDULER_WORKFLOW_DETAIL ============")
        logger.debug("params: %s", params)

        # Validate workflow_id parameter
        workflow_id = params.get("workflow_id")
        if not workflow_id:
            raise ValidationError("Invalid parameter: workflow_id is required.")

        # Connect to the database
        postgres_client = get_postgres_client()

        outer_joins = [
            (
                SchedulerJobGroups,
                SchedulerJobGroups.group_id == SchedulerWorkflow.group_id,
            ),
        ]

        columns = (
            SchedulerWorkflow.id,
            SchedulerWorkflow.workflow_name,
            SchedulerWorkflow.latest_status,
            SchedulerWorkflow.group_id,
            SchedulerWorkflow.frst_reg_date,
            SchedulerWorkflow.frst_reg_user_id,
            SchedulerWorkflow.last_chg_date,
            SchedulerWorkflow.last_reg_user_id,
            SchedulerJobGroups.group_name,
            SchedulerWorkflow.start_date,
            SchedulerWorkflow.repeat_interval,
            SchedulerWorkflow.last_run_date,
            SchedulerWorkflow.next_run_date
        )

        # Fetch workflow details
        workflow_detail = postgres_client.get_record(
            session,
            SchedulerWorkflow,
            {"id": workflow_id},
            lambda record: scheduler_workflow_mapping(
                record,
                extra_fields={
                    "group": "group_name",
                },
            ),
            outer_joins=outer_joins,
            columns=columns,
        ).get("data")

        if not workflow_detail:
            raise ValidationError(f"Workflow with id {workflow_id} does not exist.")

        # Fetch related priority groups
        workflow_priority_groups = (
                postgres_client.get_records(
                    session,
                    SchedulerWorkflowPriorityGroup,
                    {"workflow_id": workflow_id},
                    scheduler_workflow_priority_group_mapping,
                ).get("data")
                or []
        )

        if not workflow_priority_groups:
            logger.warning("No priority groups found for workflow_id %s.", workflow_id)

        related_priority_group = {}
        group_ids = [
            group.get("priority_group_id") for group in workflow_priority_groups
        ]

        related_jobs = (
                postgres_client.get_records(
                    session,
                    SchedulerJobs,
                    {"priority_group_id": {"in_": group_ids}},
                    scheduler_job_mapping,
                ).get("data")
                or []
        )

        logger.info(
            "Related jobs fetched : %s jobs found.",
            len(related_jobs),
        )

        for scheduler_job in related_jobs:
            priority_group_id = scheduler_job.get("priority_group_id")
            if priority_group_id not in related_priority_group:
                related_priority_group[priority_group_id] = []

            related_priority_group[priority_group_id].append(scheduler_job)

        # Return the final result with workflow detail and related priority groups
        return {
            "success": True,
            "error_msg": None,
            "data": {
                "workflow_detail": workflow_detail,
                "related_priority_group": related_priority_group,
            },
        }

    except Exception as e:
        logger.error("Exception occurred in get_workflow_detail: %s", e)
        raise e


def get_workflow_dropdown_filter(session: Session, params: dict, related_groups: list):
    """
    Get workflow dropdown filter
    Args:
        session: SQLAlchemy session
        params: Parameters for getting workflow dropdown filter
        related_groups: List of related groups
    Returns:
        Dictionary containing the result of the operation
    """
    try:
        logger.info("============ GET_WORKFLOW_DROPDOWN_FILTER ============")
        logger.debug("params: %s", params)

        page_size: int = int(params.pop("page_size", FILTER_DEFAULT_PAGE_SIZE))
        page_number: int = int(params.pop("page_number", DEFAULT_PAGE_NUMBER))

        postgres_client = get_postgres_client()
        filter_params = {}

        if related_groups:
            filter_params["group_id"] = {"in_": related_groups}
        if params.get("search_text"):
            filter_params["workflow_name"] = {"ilike": f"%{params.get('search_text')}%"}

        result = postgres_client.get_paginated_records(
            session,
            SchedulerWorkflow,
            filter_params,
            lambda record: {
                "id": record.id,
                "name": record.workflow_name,
            },
            page_size=page_size,
            page_number=page_number,
            columns=[
                SchedulerWorkflow.id,
                SchedulerWorkflow.workflow_name,
            ],
        )
        result["total"] = postgres_client.count(
            session, SchedulerWorkflow, filter_params
        )

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e

    return result


def scheduler_workflow_read(
        session: Session, params: dict, related_groups: Optional[list]
):
    """
    Read scheduler workflow
    Args:
        session: The session object
        params: The parameters for the workflow
        related_groups: The related groups

    Returns:
        dict: The workflow detail
    """
    try:
        logger.info("============ SCHEDULER_WORKFLOW_READ ============")
        logger.debug("params: %s", params)
        page_number: Optional[int] = params.pop("page_number", None)
        page_size: Optional[int] = params.pop("page_size", None)

        postgres_client = get_postgres_client()
        filters = {}
        if related_groups and "group_id" not in params:
            filters["group_id"] = {"in_": related_groups}

        if params.get("group_id"):
            filters["group_id"] = params.get("group_id")

        if page_number is not None and page_size is not None:
            result = postgres_client.get_paginated_records(
                session,
                SchedulerWorkflow,
                filters,
                scheduler_workflow_mapping,
                page_size,
                page_number,
            )
            result["total"] = postgres_client.count(
                session,
                SchedulerWorkflow,
                filters,
            )
        else:
            result = postgres_client.get_records(
                session,
                SchedulerWorkflow,
                filters,
                scheduler_workflow_mapping,
            )

        return result
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def scheduler_workflow_create(session: Session, params: dict, create_user_id: str):
    """
    Create scheduler workflow
    Args:
        session: The session object
        params: The parameters for the workflow
        create_user_id: The user id of the creator

    Returns:
        dict: The workflow detail
    """
    try:
        logger.info("============ SCHEDULER_WORKFLOW_CREATE ============")
        logger.debug("params: %s", params)
        # validate params
        WorkflowBaseSchema.model_validate(params)

        job_settings = params.pop("job_settings", {})

        check_user = scheduler_users.scheduler_user_get_by_id(
            session, create_user_id
        ).get("data")

        if not check_user:
            raise ValidationError("Invalid user")

        new_params = {
            **params,
            "frst_reg_user_id": create_user_id,
            "latest_status": "CREATED",
        }

        postgres_client = get_postgres_client()
        create_result = postgres_client.create_record(
            session, SchedulerWorkflow, new_params, flush=True
        )

        if job_settings:
            record = create_result.get("record", None)
            job_settings.update(
                {
                    "workflow_id": record.id,
                    "start_date": params.get("start_date"),
                    "repeat_interval": params.get("repeat_interval"),
                    "timezone": params.get("timezone"),
                }
            )
            assign_job_to_workflow(session, job_settings)

        assert create_result.get("success"), "Failed to create workflow"

        transformed_record = scheduler_workflow_mapping(record)
        logger.info("record: %s", transformed_record)

        return {"success": True, "error_msg": None, "data": transformed_record}
    except IntegrityError as e:
        logger.error("UniqueViolation: %s", e)
        raise ValidationError("Workflow name already exists") from e
    except PydanticValidationError as e:
        logger.error("PydanticValidationError: %s", e)
        raise ValidationError(str(e)) from e
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def assign_job_to_workflow(session: Session, params: dict):
    """
    Assign job to workflow
    Args:
        session: The session object
        params: The parameters for the workflow

    Returns:
        dict: The workflow detail
    """
    try:
        logger.info("============ SCHEDULER_WORKFLOW_ASSIGN_JOB ============")
        logger.debug("params: %s", params)

        if not params.get("workflow_id") or "list_priority_groups" not in params:
            raise ValidationError(
                "Invalid parameters: workflow_id and list_priority_groups are required."
            )

        workflow_id = params["workflow_id"]
        list_priority_groups = params["list_priority_groups"]
        if not list_priority_groups:
            list_priority_groups = []

        postgres_client = get_postgres_client()

        workflow = postgres_client.get_record(
            session,
            SchedulerWorkflow,
            {"id": workflow_id},
            scheduler_workflow_mapping,
        ).get("data")

        if not workflow:
            raise ValidationError(f"Invalid workflow_id: {workflow_id}")

        updated_jobs = []
        new_priority_groups = []
        new_job_ids = []

        for group in list_priority_groups:
            updated_jobs = []

            list_jobs = group.get("list_jobs")
            priority = group.get("priority")
            ignore_result = group.get("ignore_result", False)

            if not list_jobs or priority is None:
                raise ValidationError(
                    f"Invalid job entry: list_jobs and priority are required. Entry: {list_jobs}"
                )

            # Create workflow_priority_group
            result = postgres_client.create_record(
                session,
                SchedulerWorkflowPriorityGroup,
                {
                    "workflow_id": workflow_id,
                    "priority": priority,
                    "ignore_result": ignore_result,
                    "latest_status": "CREATED",
                },
                flush=True,
            )

            assert result.get("success"), "Failed to create workflow priority group"

            new_workflow_priority_group = result.get("record", None)
            priority_group = scheduler_workflow_priority_group_mapping(
                new_workflow_priority_group
            )
            new_priority_groups.append(priority_group["priority_group_id"])

            logger.info(
                "new new_workflow_priority_group: %s", new_workflow_priority_group
            )

            for job in list_jobs:
                if isinstance(job, str):
                    job_id = job
                    workflow_delay = 0
                else:
                    job_id = job.get("job_id")
                    workflow_delay = job.get("delay") or 0

                new_job_ids.append(job_id)
                updated_jobs.append(
                    {
                        "job_id": job_id,
                        "priority_group_id": priority_group["priority_group_id"],
                        "priority": priority,
                        "ignore_result": ignore_result,
                        "workflow_id": workflow_id,
                        "workflow_delay": workflow_delay,
                    }
                )

            for update_params in updated_jobs:
                job_id = update_params.pop("job_id")
                updated_result = postgres_client.update_record(
                    session,
                    SchedulerJobs,
                    {"job_id": job_id},
                    update_params,
                    check_record=False,
                )

                assert updated_result.get("success"), f"Failed to update job {job_id}"
                assert updated_result.get("total_updated_records") == 1, (
                    f"Failed to update job {job_id}"
                )

        logger.info("Updated jobs: %s", updated_jobs)

        # unset workflow details for jobs that are not in the new list
        unset_result = postgres_client.update_record(
            session,
            SchedulerJobs,
            {
                "job_id": {"not_in": new_job_ids},
                "workflow_id": workflow_id,
            },
            {
                "priority_group_id": None,
                # default priority is 3
                "priority": 3,
                "ignore_result": False,
                "workflow_id": None,
                "workflow_delay": 0,
            },
            check_record=False,
        )

        logger.info("Unset result: %s", unset_result.get("total_updated_records"))

        # clean up old unused priority groups
        delete_result = postgres_client.delete_record(
            session,
            SchedulerWorkflowPriorityGroup,
            {
                "workflow_id": workflow_id,
                "id": {
                    "not_in": new_priority_groups,
                },
            },
        )
        logger.info(
            "Clean up %s unlinked priority groups",
            delete_result.get("total_deleted_records"),
        )

        # Call to batch celery update worker
        # TODO: Check response before save
        celery_client = CeleryClient(logger)
        response = celery_client.celery_assign_workflow_jobs(params)
        response_data = json.loads(response.data)

        input_val = {
            "latest_status": "CREATED"
            if len(list_priority_groups) == 0
            else "ASSIGNED"
        }
        input_val["next_run_date"] = datetime.fromisoformat(response_data.get("next_run_date")).timestamp() * 1000
        result = postgres_client.update_record(
            session,
            SchedulerWorkflow,
            {"id": workflow_id},
            input_val,
            check_record=False,
        )

        assert result.get("success"), "Failed to update workflow"

        return {"success": True, "error_msg": None, "data": updated_jobs}

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def scheduler_workflow_update(session: Session, params: dict):
    """
    Update scheduler workflow
    Args:
        session: The session object
        params: The parameters for the workflow

    Returns:
        dict: The workflow detail
    """
    result = None
    try:
        logger.info("============ SCHEDULER_WORKFLOW_UPDATE ============")
        logger.debug("params: %s", params)

        # validate params
        WorkflowUpdateSchema.model_validate(params)

        check_user = scheduler_users.scheduler_user_get_by_id(
            session, params["last_reg_user_id"]
        ).get("data")
        if not check_user:
            raise ValidationError("Invalid user")

        filter_params = {"id": params["workflow_id"]}
        params["last_chg_date"] = common_func.get_current_utc_time(in_epoch=True)
        input_val = {
            x: params[x]
            for x in params
            if x
               in [
                   "workflow_name",
                   "last_chg_date",
                   "last_reg_user_id",
                   "group_id",
                   "repeat_interval",
                   "start_date",
                   "timezone",
               ]
        }

        postgres_client = get_postgres_client()
        result = postgres_client.update_record(
            session,
            SchedulerWorkflow,
            filter_params,
            input_val,
            check_record=False,
        )

        assert result.get("success"), "Failed to update workflow"

        # assign jobs
        job_settings = params.pop("job_settings", {})
        if job_settings:
            job_settings.update(
                {
                    "workflow_id": params["workflow_id"],
                    "start_date": params.get("start_date"),
                    "repeat_interval": params.get("repeat_interval"),
                    "timezone": params.get("timezone"),
                }
            )
            assign_job_to_workflow(session, job_settings)

        return result
    except IntegrityError as e:
        logger.error("UniqueViolation: %s", e)
        raise ValidationError("Workflow name already exists") from e
    except PydanticValidationError as e:
        logger.error("PydanticValidationError: %s", e)
        raise ValidationError(str(e)) from e
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def delete_workflow_and_update_jobs(session: Session, params: dict):
    """
    Delete workflow and update jobs
    Args:
        session: The session object
        params: The parameters for the workflow

    Returns:
        dict: The workflow detail
    """
    try:
        logger.info("============ SCHEDULER_WORKFLOW_DELETE ============")
        logger.debug("params: %s", params)

        workflow_id = params.get("workflow_id")

        if not workflow_id:
            raise ValidationError("Invalid parameter: workflow_id is required.")

        postgres_client = get_postgres_client()

        # delete workflow runs
        log_delete_result = postgres_client.delete_record(
            session, SchedulerWorkflowRun, {"workflow_id": workflow_id}
        )
        assert log_delete_result.get("success"), "Failed to delete workflow runs"

        # Delete the workflow
        delete_result = postgres_client.delete_record(
            session, SchedulerWorkflow, {"id": workflow_id}
        )

        assert delete_result.get("success"), "Failed to delete workflow"

        logger.info("Workflow with id %s has been deleted.", workflow_id)
        scheduler_jobs.scheduler_delete_workflow(session, workflow_id)
        logger.info(
            "Jobs related to workflow_id %s have been updated to null.", workflow_id
        )

        return {"success": True, "error_msg": None, "data": None}

    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def get_workflow_filter(session: Session, params: dict, related_groups: list):
    """
    Get workflow filter
    Args:
        session: The session object
        params: The parameters for the workflow
        related_groups: The related groups
    """
    try:
        logger.info("============ GET_WORKFLOW_FILTER ============")
        logger.debug("params: %s", params)
        page_number: Optional[int] = params.pop("page_number", None)
        page_size: Optional[int] = params.pop("page_size", None)

        transformable_params = ["text_search", "latest_status"]
        for param_name in transformable_params:
            param_value = params.pop(param_name, None)

            if param_value is None:
                continue

            match param_name:
                case "text_search":
                    params["workflow_name"] = {"ilike": f"%{param_value}%"}
                case "latest_status":
                    params["latest_status"] = param_value

        if related_groups and "group_id" not in params:
            params["group_id"] = {"in_": related_groups}

        postgres_client = get_postgres_client()

        outer_joins = [
            (
                SchedulerJobGroups,
                SchedulerJobGroups.group_id == SchedulerWorkflow.group_id,
            ),
        ]

        columns = (
            SchedulerWorkflow.id,
            SchedulerWorkflow.workflow_name,
            SchedulerWorkflow.latest_status,
            SchedulerWorkflow.group_id,
            SchedulerWorkflow.frst_reg_date,
            SchedulerWorkflow.frst_reg_user_id,
            SchedulerWorkflow.last_chg_date,
            SchedulerWorkflow.last_reg_user_id,
            SchedulerJobGroups.group_name,
            SchedulerWorkflow.start_date,
            SchedulerWorkflow.repeat_interval,
            SchedulerWorkflow.last_run_date,
            SchedulerWorkflow.next_run_date
        )

        if page_number is not None and page_size is not None:
            result = postgres_client.get_paginated_records(
                session,
                SchedulerWorkflow,
                params,
                lambda record: scheduler_workflow_mapping(
                    record,
                    extra_fields={
                        "group": "group_name",
                    },
                ),
                page_size,
                page_number,
                sort_by=[func.lower(SchedulerWorkflow.workflow_name).desc()],
                outer_joins=outer_joins,
                columns=columns,
            )
            result["total"] = postgres_client.count(session, SchedulerWorkflow, params)
        else:
            result = postgres_client.get_records(
                session,
                SchedulerWorkflow,
                params,
                lambda record: scheduler_workflow_mapping(
                    record,
                    extra_fields={
                        "group": "group_name",
                    },
                ),
                sort_by=[func.lower(SchedulerWorkflow.workflow_name).desc()],
                outer_joins=outer_joins,
                columns=columns,
            )

        logger.debug("original len: %s", result["total"])
        return result
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


# Constants for better readability and maintainability
JOB_STATES_NOT_FINISHED = [
    "RUNNING",
    "WAITING",
]
JOB_WAITING_STATE = "WAITING"


def get_priority_group_id(session: Session, current_job_id: str):
    """
    Get priority group id
    Args:
        session: The session object
        current_job_id: The current job id

    Returns:
        dict: The priority group id
    """
    postgres_client = get_postgres_client()
    job_info = postgres_client.get_record(
        session, SchedulerJobs, {"job_id": current_job_id}, scheduler_job_mapping
    ).get("data")

    if not job_info:
        raise ValidationError(f"Invalid job_id: {current_job_id}")

    return job_info.get("priority_group_id")


def update_workflow_status(session: Session, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update the workflow status based on the provided parameters.

    Args:
        session: The session object
        params: Dictionary containing workflow update parameters.

    Returns:
        A dictionary indicating success or failure of the operation.
    """
    try:
        logger.info("============ UPDATE_WORKFLOW_STATUS ============")
        logger.debug("params: %s", params)

        workflow_id: Optional[str] = params.get("workflow_id")
        # current_job_id: Optional[str] = params.get("current_job_id")
        # priority_group_id = get_priority_group_id(session, current_job_id)

        # Check for unfinished jobs in workflow
        # if latest_status in ("SUCCESS", "FAILED"):
        #     incomplete_check = check_unfinished_jobs(session, priority_group_id)
        #     if incomplete_check:
        #         return incomplete_check

        # Update the workflow record
        update_workflow_record(session, workflow_id, params)

        # Update the current job state, if applicable
        # if current_job_id:
        #     update_job_state(session, current_job_id, latest_status)

        return {"success": True, "error_msg": None, "data": None}

    except Exception as e:
        logger.error("Exception occurred: %s", e)
        raise e


def check_unfinished_jobs(
        session: Session, priority_group_id: Optional[str]
) -> Optional[Dict[str, Any]]:
    """
    Check if there are unfinished jobs for the given priority group.

    Args:
        session: The session object
        priority_group_id: ID of the priority group.

    Returns:
        None if no unfinished jobs are found, otherwise a failure response dictionary.
    """
    logger.info("============ CHECK_UNFINISHED_JOBS ============")
    logger.debug("priority_group_id: %s", priority_group_id)

    if not priority_group_id:
        logger.debug("Priority group ID is missing, skipping unfinished jobs check.")
        return None

    postgres_client = get_postgres_client()
    # You only need to get 1 finished job to check if the workflow is finished
    result = postgres_client.get_record(
        session,
        SchedulerJobs,
        {
            "priority_group_id": priority_group_id,
            "current_state": {"in_": JOB_STATES_NOT_FINISHED},
        },
        lambda x: x,
    )

    unfinished_job = result.get("data")

    if unfinished_job:
        logger.warning(
            "Not Completed Workflow %s because a job is not finished",
            priority_group_id,
        )
        return {
            "success": False,
            "error_msg": f"Not Completed Workflow {priority_group_id} due to unfinished jobs",
            "data": None,
        }

    logger.info("No unfinished jobs found for priority group ID: %s", priority_group_id)
    return None


def handle_missing_status() -> Dict[str, Any]:
    """
    Handle the case where the latest_status parameter is missing.

    Returns:
        A success response dictionary indicating no update was made.
    """
    logger.debug("latest_status is None => Not updating workflow")
    return {
        "success": True,
        "error_msg": "latest_status is None",
        "data": None,
    }


def update_workflow_record(
        session: Session, workflow_id: Optional[str], params: Dict[str, Any]
) -> None:
    """
    Update the workflow record with the latest status.

    Args:
        session: The session object
        workflow_id: ID of the workflow to update.
        params: Dictionary containing workflow update parameters.
    """
    if not workflow_id:
        return

    logger.info(
        "Updating workflow ID %s with params: %s", workflow_id, params
    )
    if "last_run_date" in params and params["last_run_date"] is not None:
        params["last_run_date"] = datetime.fromisoformat(params["last_run_date"]).timestamp() * 1000
    if "next_run_date" in params:
        if params["next_run_date"] is not None:
            params["next_run_date"] = datetime.fromisoformat(params["next_run_date"]).timestamp() * 1000
        else:
            params["next_run_date"] = None
    postgres_client = get_postgres_client()
    input_val = {
        x: params[x]
        for x in params
        if x in ["latest_status", "last_run_date", "next_run_date"]
    }
    postgres_client.update_record(
        session, SchedulerWorkflow, {"id": workflow_id}, input_val, check_record=False
    )


def update_job_state(
        session: Session, job_id: Optional[str], latest_status: str
) -> None:
    """
    Update the current job state to 'WAITING'.

    Args:
        session: The session object
        job_id: ID of the current job to update.
        latest_status: latest status of workflow
    """
    logger.info("Checking job state for job ID: %s", job_id)
    postgres_client = get_postgres_client()
    if not job_id:
        return

    current_state = JOB_WAITING_STATE if latest_status == "RUNNING" else None

    if current_state:
        logger.info("Updating job ID %s state to %s", job_id, JOB_WAITING_STATE)
        postgres_client.update_record(
            session,
            SchedulerJobs,
            {"job_id": job_id},
            {"current_state": current_state},
            check_record=False,
        )
