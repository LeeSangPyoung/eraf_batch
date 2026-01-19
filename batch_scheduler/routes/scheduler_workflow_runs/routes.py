import json

from flask import Blueprint, g, request

from decorators.session import get_session
from decorators.token_validate import token_required
from decorators.update_session import update_session
from logger import get_logger
from logic import scheduler_workflow_run
from utils import common_func

logger = get_logger()


blueprint = Blueprint("scheduler_workflow_run_blueprint", __name__, url_prefix="")


@blueprint.route("/workflow/run/create", methods=["POST"])
@get_session
def workflow_run_create():
    """
    Create workflow
    """
    params = json.loads(request.data)

    result = scheduler_workflow_run.create_workflow_run(g.session, params)
    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_run_create end")
    return final_data


@blueprint.route("/workflow/run/update", methods=["POST"])
@get_session
def workflow_run_update():
    """
    Update workflow run
    """
    params = json.loads(request.data)
    result = scheduler_workflow_run.update_workflow_run(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_run_update end")
    return final_data


@blueprint.route("/workflow/run/detail/<int:workflow_run_id>", methods=["GET"])
@get_session
@token_required
@update_session
def workflow_run_detail(workflow_run_id):
    """
    Get workflow run detail
    """
    params = {"workflow_run_id": workflow_run_id}
    params.update(related_groups=g.user.get("related_group"))

    result = scheduler_workflow_run.get_workflow_run_details(g.session, params)
    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_run_detail end")
    return final_data


@blueprint.route("/workflow/run/filter", methods=["POST"])
@get_session
@token_required
@update_session
def workflow_runs_filter():
    """
    Get workflow runs filter
    """
    params = json.loads(request.data)
    params.update(related_groups=g.user.get("related_group"))

    result = scheduler_workflow_run.get_workflow_runs(g.session, params)
    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_runs_filter end")
    return final_data


@blueprint.route("/workflow/run/status/<int:workflow_run_id>", methods=["GET"])
@get_session
@token_required
@update_session
def workflow_run_status(workflow_run_id):
    """
    Get workflow run detail
    """
    result = scheduler_workflow_run.get_workflow_run_status(
        g.session, workflow_run_id=workflow_run_id
    )
    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_run_status end")
    return final_data
