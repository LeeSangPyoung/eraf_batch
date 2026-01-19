from pydantic import ValidationError
from sqlalchemy.orm import Session

from logger import get_logger
from models.scheduler_job_run_logs import SchedulerJobRunLogs
from models.scheduler_workflow import SchedulerWorkflow
from models.scheduler_workflow_run import SchedulerWorkflowRun
from schemas.scheduler_workflow_run import (
    WorkflowRunBaseSchema,
    WorkflowRunDetailParamsSchema,
    WorkflowRunFilterSchema,
    WorkflowRunSchema,
    WorkflowRunStatus,
    WorkflowRunUpdateSchema,
)
from utils.exception import ValidationError as CustomValidationError
from utils.postgres_helper import get_postgres_client

logger = get_logger()


def _get_workflow_runs_query_fields():
    """
    Get workflow runs query fields

    Returns:
        List of query fields
    """
    return [
        SchedulerWorkflowRun.workflow_run_id,
        SchedulerWorkflowRun.workflow_id,
        SchedulerWorkflow.workflow_name,
        SchedulerWorkflowRun.start_date,
        SchedulerWorkflowRun.end_date,
        SchedulerWorkflowRun.status,
    ]


def _get_workflow_runs_filters(schema: WorkflowRunFilterSchema):
    """
    Get workflow runs filters

    Args:
        schema: Workflow run filter schema

    Returns:
        List of filters
    """
    filters = []

    if schema.workflow_id:
        filters.append(SchedulerWorkflowRun.workflow_id == schema.workflow_id)

    if schema.search_text:
        filters.append(SchedulerWorkflow.workflow_name.ilike(f"%{schema.search_text}%"))

    if schema.group_id:
        filters.append(SchedulerWorkflow.group_id == schema.group_id)

    if schema.related_groups and not schema.group_id:
        filters.append(SchedulerWorkflow.group_id.in_(schema.related_groups))

    if schema.workflow_run_from:
        filters.append(SchedulerWorkflowRun.start_date >= schema.workflow_run_from)

    if schema.workflow_run_to:
        filters.append(SchedulerWorkflowRun.start_date <= schema.workflow_run_to)

    if schema.status:
        filters.append(SchedulerWorkflowRun.status == schema.status)
    else:
        filters.append(SchedulerWorkflowRun.status != WorkflowRunStatus.SKIPPED.value)

    return filters


def get_workflow_runs(session: Session, params: dict):
    """
    Get workflow runs

    Args:
        session: SQLAlchemy session
        params: Parameters for getting workflow runs

    Returns:
        Dictionary containing the result of the operation
    """
    try:
        filter_schema = WorkflowRunFilterSchema.model_validate(params)
        logger.info("Schema: %s", filter_schema)

        client = get_postgres_client()
        filter_params = _get_workflow_runs_filters(filter_schema)
        query_fields = _get_workflow_runs_query_fields()
        outer_joins = [
            (
                SchedulerWorkflow,
                SchedulerWorkflow.id == SchedulerWorkflowRun.workflow_id,
            )
        ]
        sort_by = [
            SchedulerWorkflowRun.workflow_run_id.desc(),
            SchedulerWorkflow.workflow_name.asc(),
        ]

        if (
            filter_schema.page_number is not None
            and filter_schema.page_size is not None
        ):
            total = client.count(
                session,
                SchedulerWorkflowRun,
                filter_params,
                outer_joins=outer_joins,
            )

            result = client.get_paginated_records(
                session,
                SchedulerWorkflowRun,
                filter_params,
                mapping=lambda x: {
                    "workflow_run_id": x.workflow_run_id,
                    "workflow_id": x.workflow_id,
                    "workflow_name": x.workflow_name,
                    "start_date": x.start_date,
                    "end_date": x.end_date,
                    "status": x.status,
                },
                page_number=filter_schema.page_number,
                page_size=filter_schema.page_size,
                columns=query_fields,
                sort_by=sort_by,
                outer_joins=outer_joins,
            )

            result["total"] = total
        else:
            result = client.get_records(
                session,
                SchedulerWorkflowRun,
                filter_params,
                mapping=lambda x: WorkflowRunSchema.model_validate(x).model_dump(
                    mode="json"
                ),
                columns=query_fields,
                sort_by=sort_by,
                outer_joins=outer_joins,
            )

        return result
    except ValidationError as ve:
        raise CustomValidationError(ve.errors()) from ve
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def create_workflow_run(session: Session, params: dict):
    """
    Create workflow run

    Args:
        session: SQLAlchemy session
        params: Parameters for creating workflow run

    Returns:
        Dictionary containing the result of the operation
    """
    try:
        schema = WorkflowRunBaseSchema.model_validate(params)
        logger.info("Schema: %s", schema)

        postgres_client = get_postgres_client()
        response = postgres_client.create_record(
            session,
            SchedulerWorkflowRun,
            schema.model_dump(
                mode="json",
                exclude_none=True,
            ),
            flush=True,
        )
        assert response.get("success"), "Failed to create workflow run"
        record: SchedulerWorkflowRun = response.pop("record", None)
        response["data"] = {
            "workflow_run_id": record.workflow_run_id,
        }

        return response
    except ValidationError as ve:
        raise CustomValidationError(ve.errors()) from ve
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def update_workflow_run(session: Session, params: dict):
    """
    Update workflow run

    Args:
        session: SQLAlchemy session
        params: Parameters for updating workflow run

    Returns:
        Dictionary containing the result of the operation
    """
    try:
        schema = WorkflowRunUpdateSchema.model_validate(params)
        logger.info("Schema: %s", schema)

        postgres_client = get_postgres_client()
        # get number of associated job run logs

        job_run_logs_count = postgres_client.count(
            session,
            SchedulerJobRunLogs,
            {"workflow_run_id": schema.workflow_run_id},
        )
        if job_run_logs_count == 0 and schema.status in [
            WorkflowRunStatus.FAILED,
            WorkflowRunStatus.SUCCESS,
        ]:
            schema.status = WorkflowRunStatus.SKIPPED

        response = postgres_client.update_record(
            session,
            SchedulerWorkflowRun,
            [SchedulerWorkflowRun.workflow_run_id == schema.workflow_run_id],
            schema.model_dump(
                mode="json",
                exclude_none=True,
                exclude={"workflow_run_id"},
            ),
        )
        assert response.get("success"), "Failed to update workflow run"

        return response
    except ValidationError as ve:
        raise CustomValidationError(ve.errors()) from ve
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def get_workflow_run_status(session: Session, workflow_run_id: int):
    """
    Get workflow run status
    """
    try:
        client = get_postgres_client()
        result = client.get_record(
            session,
            SchedulerWorkflowRun,
            {"workflow_run_id": workflow_run_id},
            lambda x: {"workflow_run_id": x.workflow_run_id, "status": x.status},
            columns=[
                SchedulerWorkflowRun.workflow_run_id,
                SchedulerWorkflowRun.status,
            ],
        )

        assert result.get("success"), "Failed to get workflow run status"
        return result
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e


def get_workflow_run_details(session: Session, params: dict):
    """
    Get workflow run details

    Args:
        session: SQLAlchemy session
        params: Parameters for getting workflow run details

    Returns:
        Dictionary containing the result of the operation
    """
    try:
        client = get_postgres_client()
        params_schema = WorkflowRunDetailParamsSchema.model_validate(params)
        filter_params = [
            SchedulerWorkflowRun.workflow_run_id == params_schema.workflow_run_id
        ]

        if params_schema.related_groups:
            filter_params.append(
                SchedulerWorkflow.group_id.in_(params_schema.related_groups)
            )

        result = client.get_record(
            session=session,
            entity=SchedulerWorkflowRun,
            params=filter_params,
            mapping=lambda x: {
                "workflow_run_id": x.workflow_run_id,
                "workflow_id": x.workflow_id,
                "workflow_name": x.workflow_name,
                "start_date": x.start_date,
                "end_date": x.end_date,
                "status": x.status,
            },
            columns=[
                SchedulerWorkflowRun.workflow_run_id,
                SchedulerWorkflowRun.workflow_id,
                SchedulerWorkflow.workflow_name,
                SchedulerWorkflowRun.start_date,
                SchedulerWorkflowRun.end_date,
                SchedulerWorkflowRun.status,
            ],
            outer_joins=[
                (
                    SchedulerWorkflow,
                    SchedulerWorkflow.id == SchedulerWorkflowRun.workflow_id,
                )
            ],
        )

        assert result.get("success"), "Failed to get workflow run details"

        log_result = client.get_records(
            session=session,
            entity=SchedulerJobRunLogs,
            params={"workflow_run_id": params_schema.workflow_run_id},
            mapping=lambda x: {
                "log_id": x.log_id,
                "job_name": x.job_name,
                "priority": x.workflow_priority,
                "req_start_date": x.req_start_date,
                "actual_start_date": x.actual_start_date,
                "actual_end_date": x.actual_end_date,
                "errors": x.errors,
                "output": x.output,
                "status": x.status,
            },
            columns=[
                SchedulerJobRunLogs.log_id,
                SchedulerJobRunLogs.job_name,
                SchedulerJobRunLogs.workflow_priority,
                SchedulerJobRunLogs.req_start_date,
                SchedulerJobRunLogs.actual_start_date,
                SchedulerJobRunLogs.actual_end_date,
                SchedulerJobRunLogs.errors,
                SchedulerJobRunLogs.output,
                SchedulerJobRunLogs.status,
            ],
            sort_by=[
                SchedulerJobRunLogs.workflow_priority.desc(),
                SchedulerJobRunLogs.log_id.desc(),
            ],
        )

        assert log_result.get("success"), "Failed to get workflow run logs"
        result["data"]["logs"] = log_result.pop("data", [])

        return result
    except Exception as e:
        logger.error("Exception: %s", e)
        raise e
