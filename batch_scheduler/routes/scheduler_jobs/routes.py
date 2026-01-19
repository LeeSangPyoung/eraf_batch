import json

from flask import g, request

from decorators.session import get_session
from decorators.token_validate import token_required, admin_required
from decorators.update_session import update_session
from logger import get_logger
from logic import scheduler_jobs
from routes.scheduler_job_servers import blueprint
from utils import common_func

logger = get_logger()


@blueprint.route("/job/all", methods=["GET"])
@get_session
@token_required
@update_session
def job_list_all():
    """
    Read all jobs
    """
    related_groups = g.user.get("related_group")
    result = scheduler_jobs.scheduler_jobs_read(g.session, {}, related_groups)
    result["data"] = scheduler_jobs.frontend_mapping_convert(result["data"])

    final_data = common_func.format_api_output(logger, result)

    logger.info("job_list_all end")
    return final_data


@blueprint.route("/job/filter", methods=["POST"])
@get_session
@token_required
@update_session
def job_list_filter():
    """
    Read jobs with filtering
    """
    params = json.loads(request.data)
    related_groups = g.user.get("related_group")
    result = scheduler_jobs.scheduler_jobs_read(g.session, params, related_groups)
    result["data"] = scheduler_jobs.frontend_mapping_convert(result["data"])

    final_data = common_func.format_api_output(logger, result)

    logger.info("job_list_filter end")
    return final_data


@blueprint.route("/job/create", methods=["POST"])
@get_session
@token_required
@update_session
def job_create():
    """
    Create job
    """
    params = json.loads(request.data)
    result = scheduler_jobs.scheduler_jobs_create(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("job_create end")
    return final_data


@blueprint.route("/job/update", methods=["POST"])
@get_session
@token_required
@update_session
def job_update():
    """
    Update job
    """
    params = json.loads(request.data)
    result = scheduler_jobs.scheduler_jobs_update(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("job_update end")
    return final_data


@blueprint.route("/job/updateData", methods=["POST"])
@get_session
def job_update_data():
    """
    Update job data
    """
    params = json.loads(request.data)
    result = scheduler_jobs.scheduler_jobs_update_data(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("job_update_data end")
    return final_data


@blueprint.route("/job/repeatIntervalSample", methods=["POST"])
@get_session
@token_required
@update_session
def job_get_repeat_interval_sample():
    """
    Get repeat interval sample
    """
    params = json.loads(request.data)
    result = scheduler_jobs.get_repeat_interval_sample(params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("job_get_repeat_interval_sample end")
    return final_data


@blueprint.route("/job/manuallyRun", methods=["POST"])
@get_session
@token_required
@update_session
def manually_run():
    """
    Manually run job
    """
    params = json.loads(request.data)
    result = scheduler_jobs.manually_run(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("manually_run end")
    return final_data


@blueprint.route("/job/forceStop", methods=["POST"])
@get_session
@token_required
@update_session
def force_stop():
    """
    Force stop job
    """
    params = json.loads(request.data)
    result = scheduler_jobs.force_stop(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("force_stop end")
    return final_data


@blueprint.route("/job/updateJobStatus", methods=["POST"])
@get_session
@token_required
@update_session
def update_job_status():
    """
    Update job status
    """
    params = json.loads(request.data)
    result = scheduler_jobs.update_job_status(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info("update_job_status end")
    return final_data


@blueprint.route("/job/getFilter", methods=["POST"])
@get_session
@token_required
@update_session
def get_job_filter():
    """
    Get job filter
    """
    params = json.loads(request.data)
    related_groups = g.user.get("related_group")
    result = scheduler_jobs.get_job_filter(g.session, params, related_groups)

    final_data = common_func.format_api_output(logger, result)

    logger.info("get_job_filter end")
    return final_data


@blueprint.route("/job/detail", methods=["GET"])
@get_session
@token_required
@update_session
def job_detail():
    """
    Get job detail by job_id (RESTful: uses query param)
    """
    job_id = request.args.get("job_id")
    if not job_id:
        return common_func.format_api_output(logger, {
            "success": False,
            "error_msg": "Missing job_id",
            "data": None
        })

    result = scheduler_jobs.scheduler_job_get_by_id(g.session, job_id)
    if result and result.get("data"):
        # Convert to frontend mapping for consistency
        data = scheduler_jobs.frontend_mapping_convert([result["data"]])
        result["data"] = data[0] if data else None
    else:
        result = {
            "success": False,
            "error_msg": "Job not found",
            "data": None
        }

    final_data = common_func.format_api_output(logger, result)
    logger.info("job_detail end")
    return final_data


@blueprint.route("/job/delete", methods=["DELETE"])
@get_session
@token_required
@update_session
@admin_required
def job_delete():
    params = json.loads(request.data)
    result = scheduler_jobs.scheduler_jobs_delete(g.session, params)

    final_data = common_func.format_api_output(logger, result)

    logger.info('job_delete end')
    return final_data
