import json
from typing import Optional

from flask import g, request

from decorators.session import get_session
from decorators.token_validate import admin_required, token_required
from decorators.update_session import update_session
from logger import get_logger
from logic import scheduler_workflow
from routes.scheduler_job_servers import blueprint
from utils import common_func

logger = get_logger()


@blueprint.route("/workflow/all", methods=["GET"])
@get_session
@token_required
@update_session
def workflow_list_all():
    """
    Read all workflows
    """
    user_type = g.user.get("user_type")
    if user_type == 1:
        related_groups: Optional[list] = g.user.get("related_group")
    else:
        related_groups = None
    result = scheduler_workflow.scheduler_workflow_read(g.session, {}, related_groups)
    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_list_all end")
    return final_data


@blueprint.route("/workflow/create", methods=["POST"])
@get_session
@token_required
@update_session
def workflow_create():
    """
    Create workflow
    """
    params = json.loads(request.data)
    user_table_id = g.user.get("table_id")
    result = scheduler_workflow.scheduler_workflow_create(
        g.session, params, user_table_id
    )

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_create end")
    return final_data


@blueprint.route("/workflow/update", methods=["POST"])
@get_session
@token_required
@update_session
def workflow_update():
    """
    Update workflow
    """
    params = json.loads(request.data)
    result = scheduler_workflow.scheduler_workflow_update(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_update end")
    return final_data


@blueprint.route("/workflow/getFilter", methods=["GET"])
@get_session
@token_required
@update_session
def get_workflow_dropdown_filter():
    """
    Get workflow dropdown filter
    """
    params = request.args.to_dict()
    related_groups = g.user.get("related_group")
    result = scheduler_workflow.get_workflow_dropdown_filter(
        g.session, params, related_groups
    )

    final_data = common_func.format_api_output(logger, result)

    logger.info("get_workflow_dropdown_filter end")
    return final_data


@blueprint.route("/workflow/assign-job", methods=["POST"])
@get_session
@token_required
@admin_required
@update_session
def workflow_assign_job():
    """
    Assign job to workflow
    """
    params = json.loads(request.data)
    result = scheduler_workflow.assign_job_to_workflow(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_assign_job end")
    return final_data


@blueprint.route("/workflow/delete", methods=["POST"])
@get_session
@token_required
@admin_required
@update_session
def workflow_delete():
    """
    Delete workflow
    """
    params = json.loads(request.data)
    result = scheduler_workflow.delete_workflow_and_update_jobs(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_delete end")
    return final_data


@blueprint.route("/workflow/detail", methods=["POST"])
@get_session
@token_required
@update_session
def workflow_detail():
    """
    Get workflow detail
    """
    params = json.loads(request.data)
    result = scheduler_workflow.get_workflow_detail(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_detail end")
    return final_data


@blueprint.route("/workflow/update_status", methods=["POST"])
@get_session
def workflow_update_status():
    """
    Update workflow status
    """
    params = json.loads(request.data)
    result = scheduler_workflow.update_workflow_status(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_update_status end")
    return final_data


@blueprint.route("/workflow/filter", methods=["POST"])
@get_session
@token_required
@update_session
def workflow_filter():
    """
    Get workflow filter
    """
    params = json.loads(request.data)
    related_groups = g.user.get("related_group")

    result = scheduler_workflow.get_workflow_filter(g.session, params, related_groups)

    final_data = common_func.format_api_output(logger, result)

    logger.info("workflow_filter end")
    return final_data
