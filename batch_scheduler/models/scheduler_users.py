import uuid

from sqlalchemy import (
    BigInteger,
    Boolean,
    Index,
    UniqueConstraint,
)

from database import db
from utils import common_func, secret_helper


class SchedulerUsers(db.Model):
    __tablename__ = "scheduler_users"

    id = db.Column(db.String(), primary_key=True)
    user_id = db.Column(db.String())
    user_name = db.Column(db.String())
    user_type = db.Column(db.Integer())
    user_status = db.Column(Boolean, default=True)
    user_pwd = db.Column(db.String())
    celp_tlno = db.Column(db.String())
    email_addr = db.Column(db.String())
    lgin_fail_ncnt = db.Column(db.Integer(), default=0)
    last_pwd_chg_date = db.Column(BigInteger)
    last_lgin_timr = db.Column(BigInteger)
    frst_reg_date = db.Column(BigInteger)
    frst_reg_user_id = db.Column(db.String())
    last_reg_user_id = db.Column(db.String())
    last_chg_date = db.Column(BigInteger)
    last_activity_time = db.Column(BigInteger)
    # This is due to Alembic will not autodetect anonymous constraints
    # Sample if need multiple columns:
    # __table_args__ = (UniqueConstraint('column 1', 'column 2', name='name'),)
    __table_args__ = (
        UniqueConstraint("user_id", name="user_table_unique"),
        Index("idx_user_name", "user_name"),
        Index("idx_email_addr", "email_addr"),
    )

    def __init__(self, params):
        super().__init__(
            id=str(uuid.uuid4()),
            user_id=params.get("user_id"),
            user_name=params.get("user_name"),
            user_pwd=params.get("user_pwd"),
            user_type=params.get("user_type"),
            celp_tlno=secret_helper.encrypt_data(params.get("celp_tlno")),
            email_addr=secret_helper.encrypt_data(params.get("email_addr")),
            user_status=True,
            frst_reg_date=common_func.get_current_utc_time(in_epoch=True),
            last_chg_date=params.get("last_chg_date"),
            last_pwd_chg_date=params.get("last_pwd_chg_date"),
            last_activity_time=0,
        )

    def __repr__(self):
        return "<id {}>".format(self.id)
