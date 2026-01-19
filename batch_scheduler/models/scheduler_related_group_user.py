import uuid

from sqlalchemy import ForeignKey

from database import db


class SchedulerRelatedGroupUser(db.Model):
    __tablename__ = "scheduler_related_group_user"

    id = db.Column(db.String(), primary_key=True)
    group_id = db.Column(db.String(), ForeignKey("scheduler_job_groups.group_id"))
    user_id = db.Column(db.String(), ForeignKey("scheduler_users.id"))

    __table_args__ = (db.Index("idx_user_id", "user_id"),)

    def __init__(self, params):
        super().__init__(
            id=str(uuid.uuid4()),
            group_id=params.get("group_id"),
            user_id=params.get("user_id"),
        )

    def __repr__(self):
        return "<id {}>".format(self.group_id)
