import time
from typing import List

from dateutil.rrule import rrulestr
from pydantic import BaseModel, Field, field_validator


class JobSchema(BaseModel):
    job_id: str
    delay: int = 0


class PriorityGroupSchema(BaseModel):
    priority: int
    ignore_result: bool
    list_jobs: List[JobSchema] = Field(default_factory=list)


class JobSettingSchema(BaseModel):
    list_priority_groups: List[PriorityGroupSchema] = Field(default_factory=list)


class WorkflowBaseSchema(BaseModel):
    group_id: str
    job_settings: JobSettingSchema = None
    last_reg_user_id: str
    repeat_interval: str
    start_date: int
    timezone: str
    workflow_name: str

    # validate repeat_interval
    @field_validator("repeat_interval")
    @classmethod
    def validate_repeat_interval(cls, v: str) -> str:
        # validate rrule
        rrulestr(v)

        return v

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: int) -> int:
        if v < int(time.time() * 1000):
            raise ValueError("Start date must be in the future")
        return v


class WorkflowUpdateSchema(WorkflowBaseSchema):
    workflow_id: str

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v: int) -> int:
        return v
