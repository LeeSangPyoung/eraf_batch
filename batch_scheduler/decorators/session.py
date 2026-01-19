from functools import wraps

from flask import g

from utils.exception import ValidationError
from utils.postgres_helper import get_postgres_client


def get_session(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            client = get_postgres_client()

            with client.get_session() as session:
                # Store the session in g for use in the route
                g.session = session
                return f(*args, **kwargs)
        except (AssertionError, ValidationError) as e:
            # Return 200 to respect current logic
            return {"data": None, "error_msg": str(e), "success": False}, 200
        except Exception as e:
            # Handle exceptions related to session creation
            return {"status": "error", "message": str(e)}, 500

    return decorated_function
