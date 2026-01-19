from functools import wraps

from flask import jsonify, g

from logger import get_logger
from models.scheduler_users import SchedulerUsers
from utils import common_func
from utils.postgres_helper import get_postgres_client

logger = get_logger()


def login_users_mapping(record):
    return {
        "id": record.id,
        "user_id": record.user_id,
        "user_name": record.user_name,
        "user_type": record.user_type,
        "user_status": record.user_status,
        "last_activity_time": record.last_activity_time,
    }


def update_session(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if user information exists in g (set by token_required)
        if not hasattr(g, 'user'):
            return jsonify({'status': 'error', 'message': 'User information is missing'}), 401

        user_id = g.user.get('user_id')
        logger.info(f"Update session for user: {user_id}")

        postgres_client = get_postgres_client()
        params = {
            'user_id': user_id
        }

        try:
            input_val = {
                'last_activity_time': common_func.get_current_epoch_time_seconds(),
            }

            update_result = postgres_client.update_record(
                g.session, SchedulerUsers, params, input_val, check_record=False)
            if update_result["total_updated_records"] == 0:
                return jsonify({'status': 'error', 'message': 'Invalid token'}), 401
        except Exception as e:
            logger.error(f'Exception: {e}')
            return jsonify({'status': 'error', 'message': 'Cannot update user session'}), 401

        # If user_type is admin, proceed to the actual route
        return f(*args, **kwargs)

    return decorated_function
