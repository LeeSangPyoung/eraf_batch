from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Index,
    Integer,
    Interval,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import relationship

from database import db
from utils import common_func


class SchedulerJobs(db.Model):
    __tablename__ = "scheduler_jobs"

    job_id = db.Column(db.String(), primary_key=True)
    system_id = db.Column(db.String(), ForeignKey("scheduler_job_servers.system_id"))
    group_id = db.Column(db.String(), ForeignKey("scheduler_job_groups.group_id"))
    job_name = db.Column(db.String(128))
    start_date = db.Column(BigInteger)
    end_date = db.Column(BigInteger)
    repeat_interval = db.Column(db.String(4000))
    max_run_duration = db.Column(Interval)
    max_run = db.Column(Integer, default=0)
    max_failure = db.Column(Integer, default=0)
    retry_delay = db.Column(Integer, default=30)
    priority = db.Column(Integer, default=3)
    is_enabled = db.Column(Boolean, default=True)
    auto_drop = db.Column(Boolean, default=False)
    restart_on_failure = db.Column(Boolean, default=False)
    restartable = db.Column(Boolean, default=False)
    job_comments = db.Column(db.String(4000))
    job_type = db.Column(db.String(16))
    job_action = db.Column(db.String(4000))
    job_body = db.Column(db.String())
    timezone = db.Column(db.String())
    last_start_date = db.Column(BigInteger)
    next_run_date = db.Column(BigInteger)
    last_run_duration = db.Column(Interval)
    current_state = db.Column(db.String(20), default="SCHEDULED")
    run_count = db.Column(Integer, default=0)
    failure_count = db.Column(Integer, default=0)
    retry_count = db.Column(Integer, default=0)
    priority_group_id = db.Column(
        db.String(), ForeignKey("scheduler_workflow_priority_group.id")
    )
    workflow_id = db.Column(db.String())
    ignore_result = db.Column(Boolean, default=False)
    frst_reg_date = db.Column(BigInteger)
    frst_reg_user_id = db.Column(db.String(), ForeignKey("scheduler_users.id"))
    last_chg_date = db.Column(BigInteger)
    last_reg_user_id = db.Column(db.String(), ForeignKey("scheduler_users.id"))
    state_before_disable = db.Column(db.String(20))
    server = relationship("SchedulerJobServers")
    group = relationship("SchedulerJobGroups")
    frst_user = relationship("SchedulerUsers", foreign_keys=[frst_reg_user_id])
    last_user = relationship("SchedulerUsers", foreign_keys=[last_reg_user_id])
    last_log = relationship(
        "SchedulerJobLastLog", uselist=False, back_populates="scheduled_job"
    )
    run_logs = relationship("SchedulerJobRunLogs")
    priority_group = relationship(
        "SchedulerWorkflowPriorityGroup", foreign_keys=[priority_group_id]
    )
    workflow_delay = db.Column(Integer, default=0)
    # This is due to Alembic will not autodetect anonymous constraints
    # Sample if need multiple columns:
    # __table_args__ = (UniqueConstraint('column 1', 'column 2', name='name'),)
    __table_args__ = (
        UniqueConstraint("job_name", name="job_table_unique"),
        # Existing composite index for common filtering patterns
        Index(
            "idx_group_id_is_enabled_system_id_job_id",
            "group_id",
            "is_enabled",
            "system_id",
            "job_id",
        ),
        # GIN indexes for text search optimization (PostgreSQL specific)
        Index(
            "idx_job_comments_gin",
            "job_comments",
            postgresql_using="gin",
            postgresql_ops={"job_comments": "gin_trgm_ops"},
        ),
        Index(
            "idx_repeat_interval_gin",
            "repeat_interval",
            postgresql_using="gin",
            postgresql_ops={"repeat_interval": "gin_trgm_ops"},
        ),
        # Index for date range queries (only last_start_date is used for filtering)
        Index("idx_last_start_date", "last_start_date"),
    )

    def __init__(self, params):
        super().__init__(
            job_id=params.get("job_id"),
            system_id=params.get("system_id"),
            group_id=params.get("group_id"),
            job_name=params.get("job_name"),
            start_date=params.get("start_date"),
            end_date=params.get("end_date"),
            repeat_interval=params.get("repeat_interval"),
            max_run_duration=params.get("max_run_duration"),
            max_run=params.get("max_run"),
            max_failure=params.get("max_failure"),
            retry_delay=params.get("retry_delay"),
            priority=params.get("priority"),
            is_enabled=params.get("is_enabled"),
            auto_drop=params.get("auto_drop"),
            restart_on_failure=params.get("restart_on_failure"),
            restartable=params.get("restartable"),
            job_comments=params.get("job_comments"),
            job_type=params.get("job_type"),
            job_action=params.get("job_action"),
            job_body=params.get("job_body"),
            timezone=params.get("timezone"),
            last_start_date=params.get("last_start_date"),
            next_run_date=params.get("next_run_date"),
            last_run_duration=params.get("last_run_duration"),
            current_state=params.get("current_state"),
            ignore_result=params.get("ignore_result"),
            run_count=params.get("run_count"),
            failure_count=params.get("failure_count"),
            retry_count=params.get("retry_count"),
            priority_group_id=params.get("priority_group_id"),
            workflow_id=params.get("workflow_id"),
            frst_reg_date=common_func.get_current_utc_time(in_epoch=True),
            frst_reg_user_id=params.get("frst_reg_user_id"),
            last_chg_date=params.get("last_chg_date"),
            last_reg_user_id=params.get("last_reg_user_id"),
            state_before_disable=params.get("state_before_disable"),
        )

    def __repr__(self):
        return "<id {}>".format(self.job_id)
