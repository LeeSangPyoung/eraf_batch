import json

from flask import g, request

from decorators.session import get_session
from decorators.token_validate import token_required
from decorators.update_session import update_session
from logger import get_logger
from logic import scheduler_job_groups
from routes.scheduler_job_servers import blueprint
from utils import common_func

logger = get_logger()


@blueprint.route("/group/all", methods=["GET"])
@get_session
@token_required
@update_session
def group_list_all():
    related_groups = g.user.get("related_group")
    result = scheduler_job_groups.scheduler_job_groups_read(
        g.session, {}, related_groups
    )

    final_data = common_func.format_api_output(logger, result)

    logger.info("group_list_all end")
    return final_data


@blueprint.route("/group/filter", methods=["POST"])
@get_session
@token_required
@update_session
def group_list_filter():
    params = json.loads(request.data)
    related_groups = g.user.get("related_group")
    result = scheduler_job_groups.scheduler_job_groups_read(
        g.session, params, related_groups
    )

    final_data = common_func.format_api_output(logger, result)

    logger.info("group_list_filter end")
    return final_data


@blueprint.route("/group/create", methods=["POST"])
@get_session
@token_required
@update_session
def group_create():
    params = json.loads(request.data)
    result = scheduler_job_groups.scheduler_job_groups_create(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("group_create end")
    return final_data


@blueprint.route("/group/update", methods=["POST"])
@get_session
@token_required
@update_session
def group_update():
    params = json.loads(request.data)
    result = scheduler_job_groups.scheduler_job_groups_update(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("group_update end")
    return final_data


@blueprint.route("/group/getFilter", methods=["GET"])
@get_session
@token_required
@update_session
def get_group_filter():
    related_groups = g.user.get("related_group")
    query_params = request.args.to_dict()
    result = scheduler_job_groups.get_group_filter(g.session, query_params, related_groups)

    final_data = common_func.format_api_output(logger, result)

    logger.info("get_group_filter end")
    return final_data


@blueprint.route("/group/<group_id>", methods=["GET"])
@get_session
@token_required
@update_session
def get_group_detail(group_id):
    result = scheduler_job_groups.get_group_detail(g.session, {"group_id": group_id})

    final_data = common_func.format_api_output(logger, result)

    logger.info("get_group_detail end")
    return final_data
