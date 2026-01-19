import json

from flask import g, request

from decorators.session import get_session
from decorators.token_validate import admin_required, token_required
from decorators.update_session import update_session
from logger import get_logger
from logic import scheduler_job_servers
from routes.scheduler_job_servers import blueprint
from utils import common_func

logger = get_logger()


@blueprint.route("/server/all", methods=["GET"])
@get_session
@token_required
@update_session
def server_list_all():
    """
    Read all servers
    """
    result = scheduler_job_servers.scheduler_job_servers_read(g.session, {})

    final_data = common_func.format_api_output(logger, result)

    logger.info("server_list_all end")
    return final_data


@blueprint.route("/server/filter", methods=["POST"])
@get_session
@token_required
@update_session
def server_list_filter():
    """
    Read servers with filtering
    """
    params = json.loads(request.data)
    result = scheduler_job_servers.scheduler_job_servers_read(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("server_list_filter end")
    return final_data


@blueprint.route("/server/create", methods=["POST"])
@get_session
@token_required
@update_session
def server_create():
    """
    Create server
    """
    params = json.loads(request.data)
    result = scheduler_job_servers.scheduler_job_servers_create(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("server_create end")
    return final_data


@blueprint.route("/server/update", methods=["POST"])
@get_session
@token_required
@update_session
def server_update():
    """
    Update server
    """
    params = json.loads(request.data)
    result = scheduler_job_servers.scheduler_job_servers_update(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("server_update end")
    return final_data


@blueprint.route("/server/delete", methods=["DELETE"])
@get_session
@token_required
@update_session
@admin_required
def server_delete():
    """
    Delete server
    """
    params = json.loads(request.data)
    result = scheduler_job_servers.scheduler_job_servers_delete(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("server_delete end")
    return final_data


@blueprint.route("/server/getFilter", methods=["GET"])
@get_session
@token_required
@update_session
def get_server_filter():
    """
    Get server filter
    """
    query_params = request.args.to_dict()
    result = scheduler_job_servers.get_server_filter(g.session, query_params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("get_server_filter end")
    return final_data


@blueprint.route("/server/restart", methods=["POST"])
@get_session
@token_required
@update_session
def server_restart():
    """
    Restart server
    """
    params = json.loads(request.data)
    scheduler_job_servers.scheduler_job_servers_restart(g.session, params)

    final_data = common_func.format_api_output(logger, {"success": True})

    logger.info("server_restart end")
    return final_data
