from sqlalchemy import BigInteger, ForeignKey, Index
from sqlalchemy.orm import relationship

from database import db


class SchedulerWorkflowRun(db.Model):
    __tablename__ = "scheduler_workflow_run"
    workflow_run_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    workflow_id = db.Column(db.String(), ForeignKey("scheduler_workflow.id"))
    start_date = db.Column(BigInteger)
    end_date = db.Column(BigInteger)
    status = db.Column(db.String())

    # relationships
    logs = relationship(
        "SchedulerJobRunLogs",
        back_populates="workflow_run",
        passive_deletes=True,   # let DB handle the FK action
    )

    __table_args__ = (
        # B-tree index for status equality searches
        Index("idx_wf_run_status", "status"),
        # Index for date range queries
        Index("idx_wf_run_start_date", "start_date"),
    )

    def __init__(self, params):
        super().__init__(
            workflow_run_id=params.get("workflow_run_id"),
            workflow_id=params.get("workflow_id"),
            start_date=params.get("start_date"),
            end_date=params.get("end_date"),
            status=params.get("status"),
        )

    def __repr__(self):
        return f"<id {self.workflow_run_id}>"
