from functools import wraps

import jwt
from flask import g, jsonify, request

from config import Config
from logger import get_logger
from models.scheduler_related_group_user import SchedulerRelatedGroupUser
from models.scheduler_users import SchedulerUsers
from utils import common_func
from utils.postgres_helper import get_postgres_client

logger = get_logger()

INACTIVITY_TIMEOUT = 3600

_SECRET_KEY = None


def get_secret_key():
    global _SECRET_KEY

    if _SECRET_KEY is None:
        _SECRET_KEY = common_func.read_secret_key(Config.SECRET_KEY_PATH)  # type: ignore

    return _SECRET_KEY


def login_users_mapping(record):
    return {
        "id": record.id,
        "user_id": record.user_id,
        "user_name": record.user_name,
        "user_type": record.user_type,
        "user_status": record.user_status,
        "last_activity_time": record.last_activity_time,
    }


def related_group_users_mapping(record):
    return record.group_id


def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        validation_response = validate_token()
        if validation_response:
            return validation_response
        return f(*args, **kwargs)

    return decorated_function


def validate_token():
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return jsonify({"status": "error", "message": "Token is missing"}), 401

    if not auth_header.startswith("Bearer "):
        return jsonify(
            {
                "status": "error",
                "message": "Invalid token format, expected Bearer token",
            }
        ), 401

    token = auth_header.split(" ")[1]

    try:
        secret_key = get_secret_key()
        decoded_token = jwt.decode(token, secret_key, algorithms=["HS256"])

        user_id = decoded_token.get("user_id")
        user_type = decoded_token.get("user_type")
        user_name = decoded_token.get("user_name")

        if not user_id or user_type is None or not user_name:
            return jsonify({"status": "error", "message": "Invalid token payload"}), 401

        logger.info(f"Trying to validate token for user_id {user_id}")

        postgres_client = get_postgres_client()

        user = (
            postgres_client.get_record(
                g.session, SchedulerUsers, {"user_id": user_id}, login_users_mapping
            ).get("data")
            or None
        )
        if not user:
            return jsonify({"status": "error", "message": "Invalid token"}), 401

        if not user["user_status"]:
            return jsonify(
                {"status": "error", "message": "Current account was locked"}
            ), 403

        if (
            common_func.get_current_epoch_time_seconds() - user["last_activity_time"]
            > INACTIVITY_TIMEOUT
        ):
            return jsonify({"status": "error", "message": "Token has expired"}), 401

        related_group_list = (
            postgres_client.get_records(
                g.session,
                SchedulerRelatedGroupUser,
                {"user_id": user["id"]},
                related_group_users_mapping,
            ).get("data")
            or []
        )

        table_id = user["id"]

        # Store the decoded token in Flask's `g` (global context)
        g.user = {
            "table_id": table_id,
            "user_id": user_id,
            "user_type": user_type,
            "user_name": user_name,
            "related_group": related_group_list,
        }

        logger.info(f"Success validate token for user_name: {user_name}")
        return None  # Token is valid

    except jwt.InvalidTokenError:
        return jsonify({"status": "error", "message": "Invalid token"}), 401


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user information exists in g (set by token_required)
        if not hasattr(g, "user"):
            return jsonify(
                {"status": "error", "message": "User information is missing"}
            ), 401

        # Check if the user_type is admin
        if g.user.get("user_type") != 0:
            return jsonify(
                {"status": "error", "message": "Admin access required!"}
            ), 403

        # If user_type is admin, proceed to the actual route
        return f(*args, **kwargs)

    return decorated_function
