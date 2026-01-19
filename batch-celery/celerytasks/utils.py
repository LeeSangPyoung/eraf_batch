import time
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from dateutil.rrule import rrulestr

from celerytasks.models import TaskWorkflow
from celerytasks.workflow import WorkflowScheduler
from logger import get_logger

logger = get_logger()


def count_runs_between_dates(
    start_date, end_date, rrule_str: str, run_now: bool = False
) -> int:
    rule = rrulestr(rrule_str, dtstart=start_date)
    return len(rule.between(start_date, end_date, inc=run_now))


def get_next_run_date(
    rrule_str,
    current_run_count,
    run_count,
    start_date,
    end_date=None,
    run_forever=False,
    tz=None,
    run_now=False,
) -> datetime | None:
    """
    Calculate the next run times based on the input rrule string, start date, run count, and timezone.

    :param rrule_str: The recurrence rule string (RFC 2445 format).
    :param current_run_count: The current run count of the recurrence rule.
    :param run_count: The number of next occurrences to find.
    :param start_date: The start datetime for the recurrence rule.
    :param end_date: The end datetime for the recurrence rule (optional).
    :param run_forever: If True, the rule will run indefinitely (optional).
    :param tz: The desired timezone for output datetimes (default is UTC).
    :param run_now: If True, include current_time as the first element of the result (optional).
    :param is_modify: If True, calculate next runs based on current time but from original recurrence.
    :return: Next run datetimes in the specified timezone.
    """
    logger.info(
        "Rrule %s, current_run_count: %s, run_count: %s, start_date: %s, end_date: %s, tz: %s, run_now: %s",
        rrule_str,
        current_run_count,
        run_count,
        start_date,
        end_date,
        tz,
        run_now,
    )
    if not start_date:
        raise ValueError("start_date is required")

    if not tz:
        tz = timezone.utc
    else:
        tz = ZoneInfo(tz)

    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=tz)
    else:
        start_date = start_date.astimezone(tz)

    rule = rrulestr(rrule_str, dtstart=start_date)

    if not run_forever and run_count is not None and current_run_count >= run_count:
        return None

    current_time = convert_epoch_to_datetime(get_current_time(), tz=tz)

    next_run = rule.after(current_time, inc=run_now)
    if end_date and end_date < next_run:
        return None

    return next_run.astimezone(tz) if next_run else None


def get_next_run(list_run_dates, last_run):
    """
    Get the next run datetime based on the input rrule string, list of run datetimes, and the last run datetime.
    :param list_run_dates: A list of next run datetimes.
    :param last_run: The last run datetime.
    :return: The next run datetime.
    """
    if last_run not in list_run_dates:
        raise ValueError("last_run is not in list_run_dates")

    last_run_index = list_run_dates.index(last_run)
    if last_run_index + 1 < len(list_run_dates):
        return list_run_dates[last_run_index + 1]

    return None


def convert_epoch_to_datetime(epoch_time, tz=timezone.utc):
    # Convert milliseconds to seconds for the datetime.fromtimestamp() method
    timestamp_obj = epoch_time / 1000

    # Convert timestamps to datetime objects
    datetime_obj = datetime.fromtimestamp(timestamp_obj, tz=tz)
    logger.info(
        f"Convert epoch to obj datetime success in: {epoch_time}, out: {datetime_obj}"
    )
    return datetime_obj


def convert_epoch_to_datetime_millis(epoch_time):
    # Convert epoch_time from milliseconds to seconds and get the integer part (seconds)
    seconds = epoch_time // 1000

    # Get the remainder (milliseconds) and convert to microseconds
    milliseconds = epoch_time % 1000
    microseconds = milliseconds * 1000

    # Create the datetime object with millisecond precision
    datetime_obj = datetime.fromtimestamp(seconds, tz=timezone.utc).replace(
        microsecond=microseconds
    )

    # Log the success message with millisecond precision
    logger.info(
        f"Convert epoch to obj datetime success in: {epoch_time}, out: {datetime_obj.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]}"
    )

    return datetime_obj


def get_current_time():
    """
    Get the current time as an epoch timestamp in milliseconds.

    :return: The current epoch timestamp in milliseconds as an integer.
    """
    return int(time.time() * 1000)


def datetime_to_epoch(dt):
    """
    Convert a datetime object to an epoch timestamp.

    :param dt: The datetime object to convert.
    :return: The epoch timestamp as an integer.
    """
    # Ensure the datetime is in UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    epoch_timestamp = int(dt.timestamp() * 1000)
    logger.info(
        f"Convert obj datetime to epoch success in: {dt}, out: {epoch_timestamp}"
    )
    return epoch_timestamp


def validate_rrule(rrule: str):
    # Define the valid components according to RFC 5545
    valid_freqs = {
        "SECONDLY",
        "MINUTELY",
        "HOURLY",
        "DAILY",
        "WEEKLY",
        "MONTHLY",
        "YEARLY",
    }
    valid_keys = {
        "FREQ",
        "UNTIL",
        "COUNT",
        "INTERVAL",
        "BYSECOND",
        "BYMINUTE",
        "BYHOUR",
        "BYDAY",
        "BYMONTHDAY",
        "BYYEARDAY",
        "BYWEEKNO",
        "BYMONTH",
        "BYSETPOS",
        "WKST",
    }

    # Split the rrule into components
    components = rrule.split(";")
    rrule_dict = {}

    # Ensure the string is not empty and does not end with a trailing semicolon without valid components
    if len(components) < 1 or components[-1] == "":
        return False, {}

    for component in components:
        if "=" not in component:
            return False, {}  # Invalid format, no '=' found

        key, value = component.split("=", 1)
        if key not in valid_keys:
            return False, {}  # Invalid key found

        rrule_dict[key.lower()] = value  # Store the key in lowercase for consistency

    # FREQ is mandatory
    if "freq" not in rrule_dict:
        return False, {}

    # Validate FREQ value
    if rrule_dict["freq"].upper() not in valid_freqs:
        return False, {}

    # Validate INTERVAL if present
    if "interval" in rrule_dict:
        try:
            interval = int(rrule_dict["interval"])
            if interval <= 0:
                return False, {}  # INTERVAL must be a positive integer
        except ValueError:
            return False, {}  # INTERVAL is not an integer

    # Validate UNTIL if present
    if "until" in rrule_dict:
        try:
            datetime.strptime(rrule_dict["until"], "%Y%m%dT%H%M%SZ")
        except ValueError:
            return False, {}  # UNTIL does not match the required format

    # Additional logical checks can be added here as needed

    return True, rrule_dict


def check_rrule_run_forever(rrule_dict: dict, end_date=None, max_run=None) -> bool:
    """
    Check if the rrule will run forever.
    :param rrule_dict: Dictionary containing the parsed rrule components.
    :param end_date: Optional; if provided, indicates the rule will not run forever.
    :param max_run: Optional; if provided, indicates the rule will not run forever.
    :return: True if the rrule will run forever, False otherwise.
    """
    # If either end_date or max_run is provided, the rule will not run forever
    logger.info(
        f"Check run forever with info rrule_dict: {rrule_dict}, end_date: {end_date}, max_run: {max_run}"
    )
    if end_date or max_run:
        logger.info("Return False with max_run and end_date")
        return False

    # Otherwise, check the rrule_dict for 'count' and 'until'
    if "count" not in rrule_dict and "until" not in rrule_dict:
        logger.info("Return with count and until")
        return True

    logger.info("Return other")
    return False


def validate_time_stub(data, job_settings, method):
    if data.get("max_run") and method == "update":
        new_max_run = data.get("max_run")
        if new_max_run <= job_settings.run_count:
            logger.warning(
                f'"New max_run {new_max_run} cannot be less than or equal to the existing run_count."'
            )
            return False

    if data.get("end_date"):
        new_end_date = data.get("end_date")
        if new_end_date < get_current_time():
            logger.warning(
                f"New end date {convert_epoch_to_datetime_millis(new_end_date)} cannot be less than current time"
            )
            return False

    if data.get("start_date"):
        new_start_date = data.get("start_date")
        if new_start_date < get_current_time():
            logger.warning(
                f"New start date {convert_epoch_to_datetime_millis(new_start_date)} cannot be less than current time"
            )
            return False

    return True


def create_workflow(
    workflow_id: str,
    start_date: datetime,
    repeat_interval: str,
    scheduler: WorkflowScheduler,
    tz: str,
) -> TaskWorkflow:
    """
    Create a workflow with the given workflow_id and run_orders.
    """
    # get first task to execute
    orders = scheduler.get_execution_order()
    first_task = orders[0][0]
    # Use timezone-naive datetime to match RRULE format

    task_workflow, created = TaskWorkflow.objects.get_or_create(
        workflow_id=workflow_id,
        defaults={
            "repeat_interval": repeat_interval,
            "queue_name": first_task.queue_name,
            "start_date": start_date,
            "last_run_date": None,
            "next_run_date": start_date,
            "timezone": tz,
        },
    )

    if not created:
        task_workflow.update(
            repeat_interval=repeat_interval,
            queue_name=first_task.queue_name,
            start_date=start_date,
            last_run_date=None,
            next_run_date=start_date,
            tz=tz,
        )

    return task_workflow
