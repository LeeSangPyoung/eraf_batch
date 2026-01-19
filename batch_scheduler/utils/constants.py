from enum import Enum

DATETIME_FORMAT = '%Y-%m-%d %H:%M:%S'
DATETIME_WITH_MS_FORMAT = '%Y-%m-%d %H:%M:%S.%f'

FILTER_DEFAULT_PAGE_SIZE = 10
DEFAULT_PAGE_NUMBER = 1


class JobStatus(Enum):
    # STATUS_CREATED = "created"
    STATUS_SUCCESS = "succeed"
    STATUS_FAILURE = "failed"
    STATUS_NONE = None
