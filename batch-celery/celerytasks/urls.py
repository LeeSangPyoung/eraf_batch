from django.urls import path

from .views import (
    assign_job_to_workflow,
    delete_task,
    delete_workflow,
    force_terminate_task,
    get_task_detail,
    health_check,
    manually_run,
    rrule_schedule_task,
    update_job_function,
    update_state_job,
)

urlpatterns = [
    path("create_rrule_task/", rrule_schedule_task, name="rrule_schedule_task"),
    path("force_stop/", force_terminate_task, name="force_stop"),
    path("manually_run/", manually_run, name="manually_run"),
    path("health/", health_check, name="health_check"),
    path("update_job/", update_job_function, name="update_job"),
    path("update_job_status/", update_state_job, name="update_job_status"),
    path("get_task_detail/", get_task_detail, name="get_task_detail"),
    path(
        "assign_job_to_workflow/", assign_job_to_workflow, name="assign_job_to_workflow"
    ),
    path("delete_task/", delete_task, name="delete_task"),
    path("delete_workflow/", delete_workflow, name="delete_workflow"),
]
