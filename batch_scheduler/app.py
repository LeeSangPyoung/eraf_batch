from importlib import import_module

from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.urllib import URLLibInstrumentor
from opentelemetry.instrumentation.urllib3 import URLLib3Instrumentor

from config import Config
from database import db
from models import *  # noqa

app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = Config.SQLALCHEMY_DATABASE_URI
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = Config.SQLALCHEMY_TRACK_MODIFICATIONS
db.init_app(app)

if Config.ENABLE_OTEL:
    FlaskInstrumentor().instrument_app(app)
    # Instrument requests library (if you make HTTP calls)
    RequestsInstrumentor().instrument()
    Psycopg2Instrumentor().instrument(skip_dep_check=True, enable_commenter=True)
    URLLibInstrumentor().instrument()
    URLLib3Instrumentor().instrument()
    RedisInstrumentor().instrument()
    # Psycopg2Instrumentor().instrument()

    # Instrument SQLAlchemy
    try:
        SQLAlchemyInstrumentor().instrument(
            engine=db.engine,
            service="flask-sqlalchemy",
            enable_commenter=True,  # Adds SQL comments with trace context
            capture_parameters=True,  # Captures SQL parameters (be careful with sensitive data)
        )
    except RuntimeError:
        # If no app context is available, skip SQLAlchemy instrumentation
        pass

migrate = Migrate(app, db)

modules = [
    "scheduler_job_servers",
    "scheduler_job_groups",
    "scheduler_jobs",
    "scheduler_job_run_logs",
    "scheduler_users",
    "scheduler_workflows",
    "scheduler_workflow_runs",
]
for module_name in modules:
    module = import_module(f"routes.{module_name}.routes")
    app.register_blueprint(module.blueprint)

if __name__ == "__main__":
    app.run(host="0.0.0.0")
