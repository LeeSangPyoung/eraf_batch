from enum import Enum

from pydantic import BaseModel


class WorkflowRunStatus(str, Enum):
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    SKIPPED = "SKIPPED"
    FAILED = "FAILED"


class WorkflowRunBaseSchema(BaseModel):
    workflow_id: str
    start_date: int
    end_date: int | None = None
    status: WorkflowRunStatus = WorkflowRunStatus.RUNNING

    class Config:
        use_enum_values = True


class WorkflowRunUpdateSchema(BaseModel):
    workflow_run_id: int
    end_date: int | None = None
    status: WorkflowRunStatus | None = None

    class Config:
        use_enum_values = True


class WorkflowRunFilterSchema(BaseModel):
    workflow_id: str | None = None
    search_text: str | None = None
    group_id: str | None = None
    workflow_run_from: int | None = None
    workflow_run_to: int | None = None
    status: WorkflowRunStatus | None = None
    page_number: int | None = None
    page_size: int | None = None
    related_groups: list[str] | None = None


class WorkflowRunSchema(BaseModel):
    workflow_run_id: int
    workflow_id: str
    workflow_name: str
    start_date: int
    end_date: int | None = None
    status: WorkflowRunStatus = WorkflowRunStatus.RUNNING

    class Config:
        use_enum_values = True


class JobRunLogsSchema(BaseModel):
    log_id: int
    job_name: str
    priority: int
    req_start_date: int
    actual_start_date: int | None = None
    actual_end_date: int | None = None
    errors: str | None = None
    output: str | None = None
    status: str | None = None


class WorkflowRunDetailSchema(BaseModel):
    workflow_run_id: int
    workflow_id: str
    start_date: int
    end_date: int | None = None
    status: WorkflowRunStatus = WorkflowRunStatus.RUNNING
    logs: list[JobRunLogsSchema]

    class Config:
        use_enum_values = True


class WorkflowRunDetailParamsSchema(BaseModel):
    workflow_run_id: int
    related_groups: list[str] | None = None
