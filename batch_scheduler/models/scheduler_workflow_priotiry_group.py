import uuid

from sqlalchemy import BigInteger, Boolean, Integer

from database import db
from utils import common_func


class SchedulerWorkflowPriorityGroup(db.Model):
    __tablename__ = "scheduler_workflow_priority_group"
    id = db.Column(db.String(), primary_key=True)
    workflow_id = db.Column(db.String())
    latest_status = db.Column(db.String())
    priority = db.Column(Integer, default=3)
    ignore_result = db.Column(Boolean, default=False)
    frst_reg_date = db.Column(BigInteger)
    frst_reg_user_id = db.Column(db.String())
    last_reg_user_id = db.Column(db.String())
    last_chg_date = db.Column(BigInteger)

    def __init__(self, params):
        super().__init__(
            id=str(uuid.uuid4()),
            workflow_id=params.get("workflow_id"),
            latest_status=params.get("latest_status"),
            priority=params.get("priority"),
            ignore_result=params.get("ignore_result"),
            frst_reg_date=common_func.get_current_utc_time(in_epoch=True),
            frst_reg_user_id=params.get("frst_reg_user_id"),
            last_chg_date=params.get("last_chg_date"),
            last_reg_user_id=params.get("last_reg_user_id"),
        )

    def __repr__(self):
        return "<id {}>".format(self.id)
