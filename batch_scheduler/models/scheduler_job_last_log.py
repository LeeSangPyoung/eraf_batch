from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import relationship

from database import db


class SchedulerJobLastLog(db.Model):
    __tablename__ = "scheduler_job_last_log"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    system_id = db.Column(
        db.String(), ForeignKey("scheduler_job_servers.system_id"), nullable=True
    )
    group_id = db.Column(db.String(), ForeignKey("scheduler_job_groups.group_id"))
    job_id = db.Column(db.String(), ForeignKey("scheduler_jobs.job_id"))
    job_name = db.Column(db.String())
    actual_start_date = db.Column(BigInteger)
    log_id = db.Column(db.Integer, ForeignKey("scheduler_job_run_logs.log_id"))
    scheduled_job = relationship("SchedulerJobs", back_populates="last_log")
    run_log = relationship(
        "SchedulerJobRunLogs", uselist=False, back_populates="last_log"
    )
    last_state_job = db.Column(db.String())

    def __init__(self, params):
        super().__init__(
            job_id=params.get("job_id"),
            system_id=params.get("system_id"),
            group_id=params.get("group_id"),
            job_name=params.get("job_name"),
            actual_start_date=params.get("actual_start_date"),
            log_id=params.get("log_id"),
            last_state_job=params.get("last_state_job"),
        )

    def __repr__(self):
        return "<id {}>".format(self.id)
