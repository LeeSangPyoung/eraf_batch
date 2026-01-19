# celerytasks/custom_task.py – Developer Guide

## Overview
This module defines the core logic for executing, tracking, and managing repeated Celery tasks with workflow and job dependencies in a Django application. It is designed for maintainability, performance, and robust error handling.

## Main Class: `RepeatTask`

### Responsibilities
- Orchestrates the execution of Celery tasks that may be part of complex workflows.
- Handles prerequisite checks, status updates, retries, and logging for each task.
- Ensures efficient database access and minimizes redundant queries.
- Integrates with Redis for job/task tracking and with external scheduler APIs for logging and workflow updates.

## Key Concepts & Strategies

### 1. **Scoped Caching**
- Uses per-task-instance caches (`self._cached_objects`, `self._workflow_cache`) to avoid repeated DB queries within a single task execution.
- Caches are cleared at the end of each task (in `after_return`).

### 2. **Atomic DB Updates**
- All updates to Django models (`TaskDetail`, `JobSettings`) are batched and saved only once per hook, using `transaction.atomic()` where multiple models are updated together.
- This reduces DB load and prevents partial updates.

### 3. **Error Handling & Logging**
- All major operations are wrapped in try/except blocks with `logger.exception` for full tracebacks.
- External calls (Redis, scheduler APIs) are wrapped in try/except with warnings on failure.
- Logging is consistent and uses appropriate levels (`info`, `warning`, `error`).

### 4. **Workflow Prerequisites**
- Before running a task, checks if all higher-priority jobs in the same workflow are complete.
- Waits with exponential backoff, refreshing the list of prerequisite tasks as needed.
- If a prerequisite job fails and cannot be ignored, the workflow is stopped.

### 5. **Status & Result Updates**
- Utility functions are used to set status and result fields on models to avoid code duplication.
- All changes are accumulated in memory and saved in a single DB call per model per hook.

### 6. **Redis Integration**
- Uses Redis sets to track which tasks are associated with which jobs.
- All Redis operations are error-handled and logged.

## Key Methods

- `before_start`: Prepares the task and job for execution, marks as running, and schedules next run if needed.
- `wait_for_workflow_prerequisites`: Waits for all prerequisite jobs in the workflow to finish before proceeding.
- `handle_related_task_failures`: Checks for failed prerequisite jobs and enforces workflow rules.
- `on_success`, `on_failure`, `on_retry`, `after_return`: Standard Celery hooks for updating status, logging, and cleanup.
- `get_task_and_job_by_id_or_name`: Fetches the relevant `TaskDetail` and `JobSettings` for a given task.
- `fetch_related_tasks_for_jobs`: Retrieves all related task names for a list of job IDs from Redis.

## Extending or Modifying
- **To add new workflow logic:** Extend or override the relevant methods in `RepeatTask`.
- **To add new logging or external integrations:** Add calls in the appropriate hooks, using try/except for robustness.
- **To change caching strategy:** Modify `_get_cached_object` and `_clear_cache` as needed.
- **To add new status/result types:** Update the utility functions and ensure all hooks handle the new types.

## Gotchas & Best Practices
- Always use the provided utility functions for status/result updates to avoid missing DB fields.
- When adding new DB fields, ensure they are included in `update_fields` for saves.
- Be careful with transaction boundaries—always use `transaction.atomic()` when updating multiple models.
- Keep docstrings and comments up to date for maintainability.

## Example Usage

A typical Celery task using `RepeatTask` as a base will:
1. Prepare and mark itself as running (`before_start`).
2. Wait for any workflow prerequisites (`wait_for_workflow_prerequisites`).
3. Execute the main task logic.
4. Update status and log results (`on_success`, `on_failure`, etc.).
5. Clean up and clear caches (`after_return`).

---

**For questions or improvements, see the code comments and docstrings, or contact the current maintainers.**

---

## Detailed Hook Logic

### `before_start`
- **Purpose:** Prepare the task and job for execution.
- **Steps:**
  1. Retrieve the `TaskDetail` and `JobSettings` for the task.
  2. Atomically update the task to mark it as running and already run.
  3. If the job is set to run forever and not a manual run, schedule the next run.
  4. Update the job's operation to 'RUNNING', increment run count, and set the next run date if needed.
  5. Add the task name to a Redis set for the job (key: `job_id:{job_id}`) to track active tasks for this job.
  6. Log the start event to the scheduler.

### `wait_for_workflow_prerequisites`
- **Purpose:** Ensure all higher-priority jobs in the same workflow are complete before running this task.
- **Steps:**
  1. Identify all jobs in the same workflow with a higher priority.
  2. For each such job, fetch all related task names from Redis.
  3. If any related tasks are running or pending, wait with exponential backoff, refreshing the list each time.
  4. After waiting, check if any prerequisite jobs failed and cannot be ignored. If so, raise an exception to stop the workflow.

### `handle_related_task_failures`
- **Purpose:** Enforce workflow rules if any prerequisite jobs failed.
- **Steps:**
  1. Query all related tasks for failure status.
  2. For each failed task, check if its job can be ignored (based on `ignore_result`).
  3. If not, raise an exception to stop the workflow. Otherwise, log and continue.
  4. If an error occurs, update the scheduler run log and re-raise the error.

### `on_success`
- **Purpose:** Handle successful completion of a task.
- **Steps:**
  1. Update the task's duration, status, and result to 'SUCCESS'.
  2. Log the success event to the scheduler.
  3. If this job is part of a workflow, update the workflow status to 'SUCCESS'.

### `on_failure`
- **Purpose:** Handle task failure.
- **Steps:**
  1. Update the task's status and result to 'FAILED'.
  2. Increment the job's failure count.
  3. Log the failure event to the scheduler, including error details.
  4. If this job is part of a workflow, update the workflow status to 'FAILED'.

### `on_retry`
- **Purpose:** Handle task retry events.
- **Steps:**
  1. Update the task's status to 'FAILED'.
  2. Increment the job's retry count.
  3. Log the retry event to the scheduler.

### `after_return`
- **Purpose:** Final cleanup after task completion (success or failure).
- **Steps:**
  1. Log the final operation and status to the scheduler.
  2. Update the job's operation and last result.
  3. Remove the task name from the Redis set for the job (key: `job_id:{job_id}`), indicating the task is no longer active.
  4. Clear all per-task caches.

---

## Workflow Logic

- **Workflow Grouping:** Jobs can be grouped into workflows using a `workflow_id` and assigned a `priority`.
- **Prerequisite Enforcement:** Before a job runs, it checks for all jobs in the same workflow with a higher priority. It waits for all their tasks to finish (not running or pending).
- **Failure Handling:** If any prerequisite job fails and is not marked as `ignore_result`, the workflow is stopped and an error is raised.
- **Workflow Status Updates:** On success or failure of a job, the workflow status is updated via an external scheduler API.
- **Exponential Backoff:** When waiting for prerequisites, the system waits with increasing intervals (up to a max) to reduce DB/Redis load.

---

## Redis Usage

- **Purpose:** Redis is used to efficiently track which tasks are currently active for each job.
- **Key Format:**
  - Each job has a Redis set with key: `job_id:{job_id}`
  - The set contains the names of all active tasks for that job.
- **Adding to Redis:**
  - When a task starts (`before_start`), its name is added to the set for its job.
  - This allows quick lookup of all tasks currently running for a job.
- **Removing from Redis:**
  - When a task finishes (`after_return`), its name is removed from the set for its job.
  - This signals that the task is no longer active, which is important for workflow prerequisite checks.
- **Fetching from Redis:**
  - When checking workflow prerequisites, the system fetches all related task names for higher-priority jobs from their respective Redis sets.
- **Error Handling:**
  - All Redis operations are wrapped in try/except and logged. Failures do not crash the task but are reported for debugging.

---

**This detailed breakdown should help new developers understand the flow, responsibilities, and integration points in custom_task.py.** 