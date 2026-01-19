from sqlalchemy import BigInteger, ForeignKey, Index, Interval
from sqlalchemy.orm import relationship

from database import db
from utils import common_func


class SchedulerJobRunLogs(db.Model):
    __tablename__ = "scheduler_job_run_logs"

    log_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    celery_task_name = db.Column(db.String())
    log_date = db.Column(BigInteger)
    system_id = db.Column(
        db.String(), ForeignKey("scheduler_job_servers.system_id"), nullable=True
    )
    group_id = db.Column(db.String(), ForeignKey("scheduler_job_groups.group_id"))
    job_id = db.Column(db.String(), ForeignKey("scheduler_jobs.job_id"))
    system_name = db.Column(db.String())
    group_name = db.Column(db.String())
    job_name = db.Column(db.String())
    operation = db.Column(db.String())
    batch_type = db.Column(db.String(), default="Auto")
    status = db.Column(db.String())
    retry_count = db.Column(db.Integer)
    user_name = db.Column(db.String())
    error_no = db.Column(db.Integer)
    req_start_date = db.Column(BigInteger)
    actual_start_date = db.Column(BigInteger)
    actual_end_date = db.Column(BigInteger)
    run_duration = db.Column(Interval)
    additional_info = db.Column(db.String())
    errors = db.Column(db.String())
    output = db.Column(db.String())
    workflow_run_id = db.Column(
        db.Integer,
        ForeignKey("scheduler_workflow_run.workflow_run_id", ondelete="SET NULL"),
        nullable=True,  # must allow NULL
    )

    workflow_run = relationship("SchedulerWorkflowRun", back_populates="logs")
    workflow_priority = db.Column(db.Integer)
    last_log = relationship("SchedulerJobLastLog", back_populates="run_log")
    __table_args__ = (
        # Composite index for common filtering patterns
        Index("idx_group_job_system_id", "group_id", "job_id", "system_id"),
        # B-tree index for status equality searches
        Index("idx_status", "status"),
        # GIN indexes for text search optimization (PostgreSQL specific)
        Index(
            "idx_job_name_gin",
            "job_name",
            postgresql_using="gin",
            postgresql_ops={"job_name": "gin_trgm_ops"},
        ),
        Index(
            "idx_operation_gin",
            "operation",
            postgresql_using="gin",
            postgresql_ops={"operation": "gin_trgm_ops"},
        ),
        Index(
            "idx_status_gin",
            "status",
            postgresql_using="gin",
            postgresql_ops={"status": "gin_trgm_ops"},
        ),
        # Index for date range queries
        Index("idx_req_start_date", "req_start_date"),
        Index("idx_actual_start_date", "actual_start_date"),
        # Index for celery task lookups (used in updates)
        Index("idx_celery_task_name", "celery_task_name"),
        Index("idx_workflow_run_id", "workflow_run_id"),
    )

    def __init__(self, params):
        super().__init__(
            log_id=params.get("log_id"),
            celery_task_name=params.get("celery_task_name"),
            log_date=common_func.get_current_epoch_time_millis(),
            system_id=params.get("system_id"),
            group_id=params.get("group_id"),
            job_id=params.get("job_id"),
            system_name=params.get("system_name"),
            group_name=params.get("group_name"),
            job_name=params.get("job_name"),
            operation=params.get("operation"),
            batch_type=params.get("batch_type"),
            status=params.get("status"),
            retry_count=params.get("retry_count"),
            user_name=params.get("user_name"),
            error_no=params.get("error_no"),
            req_start_date=params.get("req_start_date"),
            actual_start_date=params.get("actual_start_date"),
            actual_end_date=params.get("actual_end_date"),
            run_duration=params.get("run_duration"),
            additional_info=params.get("additional_info"),
            errors=params.get("errors"),
            output=params.get("output"),
            workflow_run_id=params.get("workflow_run_id"),
            workflow_priority=params.get("workflow_priority"),
        )

    def __repr__(self):
        return "<id {}>".format(self.log_id)
