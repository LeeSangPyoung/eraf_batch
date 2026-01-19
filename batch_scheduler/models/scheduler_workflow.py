import uuid

from sqlalchemy import BigInteger, ForeignKey, Index, UniqueConstraint

from database import db
from utils import common_func


class SchedulerWorkflow(db.Model):
    __tablename__ = "scheduler_workflow"
    id = db.Column(db.String(), primary_key=True)
    workflow_name = db.Column(db.String())
    latest_status = db.Column(db.String())
    group_id = db.Column(db.String(), ForeignKey("scheduler_job_groups.group_id"))
    start_date = db.Column(BigInteger)
    repeat_interval = db.Column(db.String(4000))
    timezone = db.Column(db.String())
    frst_reg_date = db.Column(BigInteger)
    frst_reg_user_id = db.Column(db.String())
    last_reg_user_id = db.Column(db.String())
    last_chg_date = db.Column(BigInteger)
    last_run_date = db.Column(BigInteger)
    next_run_date = db.Column(BigInteger)
    __table_args__ = (
        UniqueConstraint("workflow_name", name="workflow_name_table_unique"),
        # Index for date range queries (only last_run_date is used for filtering)
        Index("idx_last_run_date", "last_run_date")
    )

    def __init__(self, params):
        super().__init__(
            id=str(uuid.uuid4()),
            workflow_name=params.get("workflow_name"),
            latest_status=params.get("latest_status"),
            group_id=params.get("group_id"),
            frst_reg_date=common_func.get_current_utc_time(in_epoch=True),
            frst_reg_user_id=params.get("frst_reg_user_id"),
            last_chg_date=params.get("last_chg_date"),
            last_reg_user_id=params.get("last_reg_user_id"),
            start_date=params.get("start_date"),
            repeat_interval=params.get("repeat_interval"),
            timezone=params.get("timezone"),
            last_run_date=params.get("last_run_date"),
            next_run_date=params.get("next_run_date")
        )

    def __repr__(self):
        return "<id {}>".format(self.id)
