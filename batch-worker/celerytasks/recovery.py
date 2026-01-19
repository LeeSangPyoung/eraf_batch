import glob
import json
import os

from celerytasks.models import JobSettings, TaskDetail
from celerytasks.utils import (
    LOCAL_TASK_DIR,
    LOCAL_WORKFLOW_DIR,
    call_scheduler_workflow_run_update,
    call_scheduler_workflow_update,
    get_current_time,
    post_scheduler_api,
    remove_task_from_local,
)
from logger import get_logger

logger = get_logger()


def update_jobs():
    updated_workflow_runs = {}
    for file_path in glob.iglob(str(LOCAL_TASK_DIR.joinpath("*.json"))):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                task_data = json.load(f)
                celery_task_id = task_data.get("celery_task_id")
                workflow_run_id = task_data.get("workflow_run_id")
                workflow_id = task_data.get("workflow_id")
                logger.info("Update pending job ID: %s", task_data["job_id"])

                task_detail: TaskDetail = TaskDetail.objects.get(
                    id=task_data["task_id"]
                )
                job_settings: JobSettings = JobSettings.objects.get(
                    job_id=task_data["job_id"]
                )

                log_body = {
                    "job_id": task_data["job_id"],
                    "log_id": task_data["log_id"],
                    "user_name": task_detail.run_account,
                    "run_duration": (
                        str(task_detail.run_duration)
                        if task_detail.run_duration
                        else None
                    ),
                    "additional_info": None,
                    "celery_task_name": f"{task_detail.task_name}_{task_detail.retry_count}",
                    "run_count": job_settings.run_count,
                    "failure_count": job_settings.failure_count,
                    "job_retry_count": job_settings.retry_count,
                    "retry_count": task_detail.retry_count,
                    "workflow_priority": job_settings.priority,
                    "workflow_run_id": workflow_run_id,
                    "status": "failed",
                }

                if (
                    not job_settings.run_forever
                    and job_settings.run_count >= job_settings.max_run
                ):
                    log_body["operation"] = "BROKEN"

                response = post_scheduler_api(
                    log_body, "/logs/update", raise_error=True
                )
                logger.info(
                    "Success update log for %s with response %s",
                    task_data["job_id"],
                    response,
                )

                # update workflow latest state
                if workflow_run_id and workflow_id:
                    job_id = task_data["workflow_run_id"]
                    body = {
                        "workflow_id": workflow_id,
                        "latest_status": "FAILED",
                        "current_job_id": job_id,
                    }
                    call_scheduler_workflow_update(body)

                    # update workflow run status
                    call_scheduler_workflow_run_update(
                        body={
                            "workflow_run_id": workflow_run_id,
                            "end_date": get_current_time(),
                            "status": "FAILED",
                        },
                    )

                    if workflow_id not in updated_workflow_runs:
                        updated_workflow_runs[workflow_id] = []
                    updated_workflow_runs[workflow_id].append(workflow_run_id)

                if celery_task_id:
                    remove_task_from_local(celery_task_id)
                else:
                    remove_task_from_local(job_id)
        except Exception as e:
            logger.error(
                "Error update log for %s with error %s", task_data["job_id"], e
            )

    return updated_workflow_runs


def update_workflows(workflow_runs: dict):
    for file_path in glob.iglob(str(LOCAL_WORKFLOW_DIR.joinpath("*.json"))):
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                workflow_data = json.load(f)
                workflow_id = workflow_data.get("workflow_id")
                workflow_run_id = workflow_data.get("workflow_run_id")

                updated_workflow_runs = workflow_runs.get(workflow_id, [])
                if workflow_run_id in updated_workflow_runs:
                    continue

                # update workflow run status
                call_scheduler_workflow_run_update(
                    body={
                        "workflow_run_id": workflow_run_id,
                        "end_date": get_current_time(),
                        "status": "FAILED",
                    },
                )
                call_scheduler_workflow_update(
                    {
                        "workflow_id": workflow_id,
                        "latest_status": "FAILED",
                    }
                )

                remove_task_from_local(str(workflow_run_id), base_dir=LOCAL_WORKFLOW_DIR)
            except Exception as e:
                logger.error(
                    "Error update workflow run status for %s with error %s",
                    workflow_run_id,
                    e,
                )


def update_all_pending_local_tasks():
    os.makedirs(str(LOCAL_TASK_DIR), exist_ok=True)
    updated_workflow_runs = update_jobs()
    os.makedirs(str(LOCAL_WORKFLOW_DIR), exist_ok=True)
    update_workflows(workflow_runs=updated_workflow_runs)
