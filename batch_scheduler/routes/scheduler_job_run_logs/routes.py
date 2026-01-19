import json

from flask import g, request
from opentelemetry import trace

from decorators.session import get_session
from decorators.token_validate import token_required
from decorators.update_session import update_session
from logger import get_logger
from logic import scheduler_job_run_logs
from routes.scheduler_job_run_logs import blueprint
from utils import common_func

logger = get_logger()
tracer = trace.get_tracer(__name__)


@blueprint.route("/logs/all", methods=["GET"])
@get_session
@token_required
@update_session
def run_logs_list_all():
    """
    Read all run logs
    """
    related_groups = g.user.get("related_group")
    result = scheduler_job_run_logs.scheduler_job_run_logs_read(
        g.session, {}, related_groups
    )

    final_data = common_func.format_api_output(logger, result)

    logger.info("run_logs_list_all end")
    return final_data


@blueprint.route("/logs/filter", methods=["POST"])
@get_session
@token_required
@update_session
def run_logs_list_filter():
    """
    Read run logs with filtering
    """
    params = json.loads(request.data)
    related_groups = g.user.get("related_group")

    with tracer.start_as_current_span("run_logs_list_filter"):
        result = scheduler_job_run_logs.scheduler_job_run_logs_read(
            g.session, params, related_groups
        )

    with tracer.start_as_current_span("format_data"):
        final_data = common_func.format_api_output(logger, result)

    logger.info("run_logs_list_filter end")
    return final_data


@blueprint.route("/logs/create", methods=["POST"])
@get_session
def run_logs_create():
    """
    Create run log
    """
    # IMPORTANT this api is used by the celery backend
    params = json.loads(request.data)
    result = scheduler_job_run_logs.scheduler_job_run_logs_create(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("run_logs_create end")
    return final_data


@blueprint.route("/logs/update", methods=["POST"])
@get_session
def run_logs_update():
    """
    Update run log
    """
    # IMPORTANT this api is used by the celery backend
    params = json.loads(request.data)
    result = scheduler_job_run_logs.scheduler_job_run_logs_update(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("run_logs_update end")
    return final_data
