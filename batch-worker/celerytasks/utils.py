"""
celerytasks.utils
-----------------

Utility functions for date/time conversions, recurrence rule (rrule) calculations, HTTP method validation, and error message extraction.

This module is designed to support batch scheduling and task management, providing:
- Efficient calculation of next run dates for recurring tasks (RFC 2445 rrule)
- Timezone-aware datetime handling (using zoneinfo)
- Conversion between datetime and epoch timestamps
- HTTP method validation
- Error message extraction and formatting

All functions include logging for traceability and debugging.
"""

import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from zoneinfo import ZoneInfo

import requests
from dateutil.parser import parse
from dateutil.rrule import rrulestr

from batchbe.settings import BASE_URL
from logger import get_logger

logger = get_logger()

HEADERS = {"Content-Type": "application/json"}
DEFAULT_TIMEOUT = 30
LOCAL_DIR = Path(__file__).parent.parent.joinpath("local")
LOCAL_TASK_DIR = LOCAL_DIR.joinpath("celery_tasks")
LOCAL_WORKFLOW_DIR = LOCAL_DIR.joinpath("celery_workflows")


def get_list_run_date(
    rrule_str: str,
    run_count: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[datetime]:
    """
    Calculate the next run times based on the input rrule string, start date, and run count.

    Args:
        rrule_str (str): The recurrence rule string (RFC 2445 format).
        run_count (Optional[int]): The number of next occurrences to find (optional).
        start_date (Optional[datetime]): The start datetime for the recurrence rule (required).
        end_date (Optional[datetime]): The end datetime for the recurrence rule (optional).
    Returns:
        List[datetime]: A list of next run datetimes.
    Raises:
        ValueError: If start_date is not provided.
    """
    logger.info(
        "Calculating run dates: rrule_str=%s, run_count=%s, start_date=%s, end_date=%s",
        rrule_str,
        run_count,
        start_date,
        end_date,
    )
    if not start_date:
        logger.error("start_date is required for get_list_run_date")
        raise ValueError("start_date is required")
    rule = rrulestr(rrule_str, dtstart=start_date)
    if run_count is None and end_date is None:
        run_count = 30  # Default size if both run_count and end_date are not provided
    if run_count is not None:
        occurrences = list(rule.xafter(start_date, count=run_count, inc=False))
        if end_date is not None:
            occurrences = [dt for dt in occurrences if dt <= end_date]
        logger.info("Found %s run dates (by run_count)", len(occurrences))
        return occurrences
    else:
        occurrences = []
        for dt in rule:
            if dt > end_date:
                break
            if dt > start_date:
                occurrences.append(dt)
        logger.info("Found %s run dates (by end_date)", len(occurrences))
        return occurrences


def _parse_timezone(tz: str) -> ZoneInfo:
    """
    Parse a timezone string into a ZoneInfo object.
    Args:
        tz (str): Timezone name (e.g., 'UTC', 'Asia/Seoul').
    Returns:
        ZoneInfo: The corresponding timezone object.
    Raises:
        Exception: If the timezone cannot be resolved.
    """
    try:
        logger.debug("Parsing timezone: %s", tz)
        return ZoneInfo(tz)
    except Exception as e:
        logger.error("Error resolving timezone %s: %s", tz, e)
        raise


def _parse_datetime(dt: str, tz: ZoneInfo) -> datetime:
    """
    Parse a datetime string in the format 'YYYY-MM-DD HH:MM:SS.fff %z' into a datetime object.
    Args:
        dt (str): The datetime string to parse.
        tz (ZoneInfo): The timezone object to localize the datetime.
    Returns:
        datetime: The parsed datetime object.
    Raises:
        ValueError: If the string cannot be parsed.
    """
    try:
        if isinstance(dt, datetime):
            return dt

        converted_dt = datetime.strptime(dt, "%Y-%m-%d %H:%M:%S.%f %z")

        if tz:
            if converted_dt.tzinfo is None:
                logger.error("Datetime string must include timezone information")
                raise ValueError("Datetime string must include timezone information")

            utc_dt = converted_dt.astimezone(tz)
            return utc_dt

        return converted_dt
    except ValueError as e:
        logger.error("Error parsing datetime string %s: %s", dt, e)
        raise


def _parse_date(dt_obj: Any, tz_obj: ZoneInfo) -> datetime:
    """
    Parse and localize a date to the given timezone.
    Args:
        dt_obj (str|datetime): The date as a string or datetime.
        tz_obj (ZoneInfo): The timezone object.
    Returns:
        datetime: The localized datetime object.
    Raises:
        TypeError: If start_date is not a string or datetime.
        ValueError: If the string cannot be parsed.
    """
    logger.debug("Parsing start_date: %s with timezone: %s", dt_obj, tz_obj)
    if isinstance(dt_obj, str):
        try:
            dt_obj = parse(dt_obj)
            logger.info("Converted start_date string to datetime: %s", dt_obj)
        except ValueError as e:
            logger.error("Error converting start_date: %s", e)
            raise

    if dt_obj.tzinfo is None:
        utc_datetime = dt_obj.replace(tzinfo=timezone.utc)
    else:
        utc_datetime = dt_obj.astimezone(timezone.utc)
    localized = utc_datetime.astimezone(tz_obj)
    logger.info("Converted start_date datetime to timezone %s: %s", tz_obj, localized)
    return localized


def _calculate_rrule_timedelta(rrule_obj, run_count: int) -> Optional[timedelta]:
    """
    Attempt to calculate the timedelta for simple rrule patterns for optimization.
    Returns None if the rule is too complex for timedelta math.
    """
    freq_map = {
        0: "YEARLY",
        1: "MONTHLY",
        2: "WEEKLY",
        3: "DAILY",
        4: "HOURLY",
        5: "MINUTELY",
        6: "SECONDLY",
    }
    freq = freq_map.get(rrule_obj._freq)
    interval = rrule_obj._interval
    if (
        not rrule_obj._bysetpos
        and not rrule_obj._byweekday
        and not rrule_obj._bymonth
        and not rrule_obj._bymonthday
        and not rrule_obj._byyearday
        and not rrule_obj._byweekno
        and not rrule_obj._byhour
        and not rrule_obj._byminute
        and not rrule_obj._bysecond
    ):
        if freq == "YEARLY":
            return timedelta(days=365 * interval * run_count)  # Approximate
        elif freq == "MONTHLY":
            return None
        elif freq == "WEEKLY":
            return timedelta(weeks=interval * run_count)
        elif freq == "DAILY":
            return timedelta(days=interval * run_count)
        elif freq == "HOURLY":
            return timedelta(hours=interval * run_count)
        elif freq == "MINUTELY":
            return timedelta(minutes=interval * run_count)
        elif freq == "SECONDLY":
            return timedelta(seconds=interval * run_count)
    return None


def get_worker_start_time_key():
    """
    Get the key for the worker start time.
    """
    queue_name = os.getenv("QUEUE_NAME", "default")
    return f"worker:{queue_name}:start_time"


def get_next_run_date(
    start_date: Any, end_date: Any, rrule_str: str, tz: str = "UTC"
) -> datetime:
    logger.info(
        "Received start_date: %s, rrule_str: %s timezone: %s",
        start_date,
        rrule_str,
        tz,
    )
    tz_obj = _parse_timezone(tz)
    start_date_dt = _parse_date(start_date, tz_obj)
    end_date_dt = _parse_date(end_date, tz_obj) if end_date else None

    try:
        rule = rrulestr(rrule_str, dtstart=start_date_dt)
        logger.info("Parsed rrule string successfully")
    except Exception as e:
        logger.error("Error parsing rrule string: %s", e)
        raise
    try:
        current_time = datetime.now(tz=tz_obj)
        next_run = rule.after(current_time, inc=False)

        if next_run and end_date_dt and next_run > end_date_dt:
            logger.info("Next run date %s exceeds end_date %s", next_run, end_date_dt)
            return None

    except Exception as e:
        logger.error("Error during rrule calculation: %s", e)
        raise
    try:
        next_run = next_run.astimezone(tz_obj)
        logger.info("Next run date calculated in timezone %s: %s", tz, next_run)
    except Exception as e:
        logger.error("Error converting next run date to timezone %s: %s", tz, e)
        raise
    return next_run


def get_current_time() -> int:
    """
    Get the current time as an epoch timestamp in milliseconds.
    Returns:
        int: The current epoch timestamp in milliseconds.
    """
    current_time = datetime.now(timezone.utc).replace(microsecond=0)
    epoch_timestamp = int(current_time.timestamp() * 1000)
    logger.debug("Current time (ms): %s", epoch_timestamp)
    return epoch_timestamp


def datetime_to_epoch(dt: Union[datetime, str]) -> int:
    """
    Convert a datetime object to an epoch timestamp (milliseconds).
    Args:
        dt (datetime): The datetime object to convert.
    Returns:
        int: The epoch timestamp as an integer.
    """
    if isinstance(dt, str):
        try:
            dt = parse(dt)
            logger.info("Converted datetime string to datetime object: %s", dt)
        except ValueError as e:
            logger.error("Error converting datetime string: %s", e)
            raise

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    epoch_timestamp = int(dt.timestamp() * 1000)
    logger.info(
        "Convert obj datetime to epoch success in: %s, out: %s", dt, epoch_timestamp
    )
    return epoch_timestamp


# Dictionary of valid HTTP methods
valid_http_methods = {
    "GET": True,
    "POST": True,
    "PUT": True,
    "DELETE": True,
    "HEAD": True,
    "OPTIONS": True,
    "PATCH": True,
    "CONNECT": True,
    "TRACE": True,
}


def is_valid_http_method(method: Optional[str]) -> bool:
    """
    Validate if the input is a valid HTTP method.
    Args:
        method (str): The HTTP method to validate.
    Returns:
        bool: True if valid, False otherwise.
    """
    result = False if not method else valid_http_methods.get(method.upper(), False)
    logger.debug("HTTP method validation: %s -> %s", method, result)
    return result


def validate_rrule(rrule: str) -> Tuple[bool, Dict[str, str]]:
    """
    Validate an RFC 5545 rrule string for correct format and values.
    Args:
        rrule (str): The rrule string to validate.
    Returns:
        Tuple[bool, Dict[str, str]]: (is_valid, parsed_dict)
    """
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
    components = rrule.split(";")
    rrule_dict = {}
    if len(components) < 1 or components[-1] == "":
        logger.warning("Invalid rrule: %s", rrule)
        return False, {}
    for component in components:
        if "=" not in component:
            logger.warning("Invalid rrule component: %s", component)
            return False, {}
        key, value = component.split("=", 1)
        if key not in valid_keys:
            logger.warning("Invalid rrule key: %s", key)
            return False, {}
        rrule_dict[key.lower()] = value
    if "freq" not in rrule_dict:
        logger.warning("Missing FREQ in rrule: %s", rrule)
        return False, {}
    if rrule_dict["freq"].upper() not in valid_freqs:
        logger.warning("Invalid FREQ value: %s", rrule_dict["freq"])
        return False, {}
    if "interval" in rrule_dict:
        try:
            interval = int(rrule_dict["interval"])
            if interval <= 0:
                logger.warning("Non-positive INTERVAL: %s", interval)
                return False, {}
        except ValueError:
            logger.warning("Non-integer INTERVAL: %s", rrule_dict["interval"])
            return False, {}
    if "until" in rrule_dict:
        try:
            datetime.strptime(rrule_dict["until"], "%Y%m%dT%H%M%SZ")
        except ValueError:
            logger.warning("Invalid UNTIL format: %s", rrule_dict["until"])
            return False, {}
    logger.info("Validated rrule: %s", rrule_dict)
    return True, rrule_dict


def convert_epoch_to_datetime_millis(epoch_time: int) -> datetime:
    """
    Convert an epoch timestamp in milliseconds to a datetime object (with ms precision).
    Args:
        epoch_time (int): Epoch time in milliseconds.
    Returns:
        datetime: The corresponding datetime object.
    """
    seconds = epoch_time // 1000
    milliseconds = epoch_time % 1000
    microseconds = milliseconds * 1000
    datetime_obj = datetime.fromtimestamp(seconds, tz=timezone.utc).replace(
        microsecond=microseconds
    )
    logger.info(
        "Convert epoch to obj datetime success in: %s, out: %s",
        epoch_time,
        datetime_obj.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
    )
    return datetime_obj


def check_rrule_run_forever(
    rrule_dict: dict, end_date: Optional[datetime] = None, max_run: Optional[int] = None
) -> bool:
    """
    Check if the rrule will run forever (i.e., no end_date, max_run, count, or until).
    Args:
        rrule_dict (dict): Parsed rrule components.
        end_date (Optional[datetime]): Optional end date.
        max_run (Optional[int]): Optional max run count.
    Returns:
        bool: True if the rrule will run forever, False otherwise.
    """
    if end_date is not None or max_run is not None:
        logger.info("rrule will not run forever (end_date or max_run set)")
        return False
    if "count" not in rrule_dict and "until" not in rrule_dict:
        logger.info("rrule will run forever (no count or until)")
        return True
    logger.info("rrule will not run forever (count or until present)")
    return False


def convert_epoch_to_datetime(epoch_time: int) -> datetime:
    """
    Convert an epoch timestamp in milliseconds to a datetime object (UTC).
    Args:
        epoch_time (int): Epoch time in milliseconds.
    Returns:
        datetime: The corresponding datetime object.
    """
    timestamp_obj = epoch_time / 1000
    datetime_obj = datetime.fromtimestamp(timestamp_obj, tz=timezone.utc)
    logger.debug("Convert epoch to datetime: %s -> %s", epoch_time, datetime_obj)
    return datetime_obj


def extract_error_message(error_string: str) -> str:
    """
    Extracts and cleans the error message from a wrapped structure like Exception(...) or similar.
    Args:
        error_string (str): The raw error string.
    Returns:
        str: The cleaned error message.
    """
    match = re.search(r"\((.*)\)", error_string)
    if match:
        inner_content = match.group(1)
        if "(" in inner_content and ")" in inner_content:
            return extract_error_message(inner_content)
        else:
            logger.debug("Extracted error message: %s", inner_content.strip())
            return inner_content.strip()
    else:
        logger.debug("Extracted error message: %s", error_string.strip())
        return error_string.strip()


def post_scheduler_api(body, method, raise_error: bool = False):
    url = f"{BASE_URL}/{method.lstrip('/')}"

    if body is None:
        logger.error("No body provided for method %s", method)
        return False

    logger.debug("Calling scheduler api with method %s and body %s", method, body)

    try:
        response = requests.post(
            url, json=body, headers=HEADERS, timeout=DEFAULT_TIMEOUT
        )
        response.raise_for_status()
        logger.info(
            "Success call scheduler api with method %s and body %s", method, body
        )
        return response.json()
    except requests.RequestException as e:
        logger.error("Error in calling scheduler api: %s", e)
        if raise_error:
            raise e

        return None


def get_scheduler_api(method, parameters, raise_error: bool = False):
    url = f"{BASE_URL}/{method.lstrip('/')}"

    logger.debug(
        "Calling scheduler api with method %s and parameters %s", method, parameters
    )
    try:
        response = requests.get(
            url, params=parameters, headers=HEADERS, timeout=DEFAULT_TIMEOUT
        )
        response.raise_for_status()
        logger.info(
            "Success call scheduler api with method %s and parameters %s",
            method,
            parameters,
        )
        return response.json()
    except requests.RequestException as e:
        logger.error("Error in calling scheduler api: %s", e)
        if raise_error:
            raise e

        return None


def save_task_to_local(
    task_id: str, body: dict, base_dir: Path = LOCAL_TASK_DIR
) -> None:
    """Save task metadata to <base_dir>/<task_id>.json atomically."""

    base_dir.mkdir(parents=True, exist_ok=True)
    target = base_dir / f"{task_id}.json"

    with open(target, "w", encoding="utf-8") as f:
        json.dump(body, f, indent=2)

    logger.info(f"Saved task metadata to {target}")


def remove_task_from_local(task_id: str, base_dir: Path = LOCAL_TASK_DIR):
    task_path = base_dir.joinpath(f"{task_id}.json")

    if os.path.exists(str(task_path)):
        os.remove(str(task_path))

    logger.info("Removed task metadata file: %s", task_path)


def call_scheduler_workflow_update(body):
    return post_scheduler_api(body, "/workflow/update_status")


def call_scheduler_workflow_run_create(body):
    return post_scheduler_api(body, "/workflow/run/create")


def call_scheduler_workflow_run_update(body):
    return post_scheduler_api(body, "/workflow/run/update")


def call_scheduler_workflow_run_status_get(workflow_run_id):
    response_json = get_scheduler_api(f"/workflow/run/status/{workflow_run_id}", None)

    if response_json:
        data = response_json.get("data")
        if data:
            return data.get("status")

    return None
