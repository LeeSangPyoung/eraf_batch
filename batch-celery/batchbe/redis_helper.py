import redis
import redis_lock

from batchbe.settings import REDIS_DB, REDIS_HOST, REDIS_PASSWORD, REDIS_PORT
from logger import get_logger

logger = get_logger()
DEFAULT_LOCK_EXPIRE = 60


# Initialize Redis client
redis_client = redis.StrictRedis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    password=REDIS_PASSWORD,
    decode_responses=True,  # Decode responses from bytes to strings
)


class AcquiredError(Exception):
    """
    Acquired Error
    """

    pass


class RedisLock(redis_lock.Lock):
    """
    Custom Redis lock class that extends redis_lock.Lock.
    This can be used to create a lock with a specific key and expiration time.
    """

    def __init__(
        self,
        client: redis.StrictRedis,
        name: str,
        expire: int = DEFAULT_LOCK_EXPIRE,
    ):
        super().__init__(client, name, expire=expire)

    def __enter__(self):
        """
        Acquire the lock when entering the context.
        """
        acquired = self.locked()

        if acquired:
            raise AcquiredError(f"Lock '{self._name}' is already acquired.")

        return super().__enter__()


def peek_all_items_in_queue(queue_name: str) -> list:
    """
    Peek all items in a queue.
    """
    return redis_client.lrange(queue_name, 0, -1)
