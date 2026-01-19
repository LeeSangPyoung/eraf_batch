import logging
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple

from dateutil.rrule import (
    DAILY,
    HOURLY,
    MINUTELY,
    MONTHLY,
    SECONDLY,
    WEEKLY,
    YEARLY,
    rrule,
    rrulestr,
)

logger = logging.getLogger(__name__)


class Frequency(Enum):
    """Frequency enum with priority ordering (lower = higher priority)"""

    SECONDLY = (SECONDLY, 1)
    MINUTELY = (MINUTELY, 2)
    HOURLY = (HOURLY, 3)
    DAILY = (DAILY, 4)
    WEEKLY = (WEEKLY, 5)
    MONTHLY = (MONTHLY, 6)
    YEARLY = (YEARLY, 7)

    def __lt__(self, other):
        return self.value[1] < other.value[1]

    @property
    def rrule_freq(self):
        return self.value[0]


@dataclass
class ScheduledTask:
    """Represents a scheduled task with its execution parameters"""

    task_id: str
    rrule_str: str
    function_name: str
    queue_name: str
    priority: int
    frequency: Frequency
    interval: int
    dtstart: datetime
    task_name: str
    ignore_result: bool = field(default=False)
    rrule: rrule = field(init=False)
    task_args: tuple = field(default_factory=tuple)
    task_kwargs: dict = field(default_factory=dict)
    delay: int = field(default=0)

    def __post_init__(self):
        self.rrule = rrulestr(self.rrule_str, dtstart=self.dtstart)

        # Ensure interval is positive
        if self.interval <= 0:
            raise ValueError(f"Interval must be positive, got {self.interval}")

        # Ensure priority is positive
        if self.priority <= 0:
            raise ValueError(f"Priority must be positive, got {self.priority}")

    def get_next_execution(self, after: datetime) -> Optional[datetime]:
        """Get the next execution time after the given datetime"""
        return self.rrule.after(after, inc=True)

    def __lt__(self, other):
        """Order by priority (lower number = higher priority), then by frequency, then by interval, then by task_name"""
        if self.priority != other.priority:
            return self.priority < other.priority

        if self.frequency != other.frequency:
            return self.frequency < other.frequency

        if self.interval != other.interval:
            return self.interval < other.interval

        return self.task_name < other.task_name

    def next_run_json(self, after: datetime):
        """
        Get the next run date for the task in JSON format.
        """
        if self.delay > 0:
            after = after + timedelta(seconds=self.delay)

        return {
            "task_name": self.task_name,
            "task_id": self.task_id,
            "function_name": self.function_name,
            "queue_name": self.queue_name,
            "rrule_str": self.rrule_str,
            "start_date": after,
            "args": self.task_args,
            "kwargs": self.task_kwargs,
            "delay": self.delay,
        }


class WorkflowScheduler:
    """
    Scheduler that manages multiple rrules with priorities.
    Ensures consistent execution order based on priority, frequency, and interval.
    """

    def __init__(self):
        self.tasks: List[ScheduledTask] = []
        self.execution_history: List[Tuple[datetime, ScheduledTask]] = []
        self.task_ids: Set[str] = set()
        self._validate_interval = True
        self._max_interval = 1000  # Prevent extremely large intervals
        self._max_priority = 100  # Prevent extremely high priorities

    def add_task(
        self,
        task_name: str,
        function_name: str,
        queue_name: str,
        rrule_str: str,
        priority: int,
        start_dt: datetime,
        ignore_result: bool = False,
        delay: int = 0,
        task_args: tuple = (),
        task_kwargs: dict = None,
        validate: bool = True,
    ) -> str:
        """
        Add a task to the workflow scheduler.

        Args:
            task_name: Name of the task to execute
            function_name: Name of the function to execute
            queue_name: Name of the queue to use for this task
            rrule_str: The rrule string defining the schedule
            priority: Priority level (lower number = higher priority)
            task_args: Arguments to pass to the task
            task_kwargs: Keyword arguments to pass to the task
            validate: Whether to validate the task parameters

        Returns:
            task_id: Unique identifier for the task

        Raises:
            ValueError: If validation fails
        """
        if task_kwargs is None:
            task_kwargs = {}

        # Generate unique task ID
        task_id = str(uuid.uuid4())
        while task_id in self.task_ids:
            task_id = str(uuid.uuid4())

        # Determine frequency and interval from rrule
        rrule_obj = rrulestr(rrule_str)
        frequency = self._get_frequency_from_rrule(rrule_obj)
        interval = getattr(rrule_obj, "_interval", 1)
        if interval is None:
            interval = getattr(rrule_obj, "interval", 1)
        if interval is None:
            interval = 1  # Default interval

        # Create scheduled task
        scheduled_task = ScheduledTask(
            task_id=task_id,
            function_name=function_name,
            queue_name=queue_name,
            rrule_str=rrule_str,
            priority=priority,
            frequency=frequency,
            interval=interval,
            dtstart=start_dt,
            task_name=task_name,
            task_args=task_args,
            task_kwargs=task_kwargs,
            ignore_result=ignore_result,
            delay=delay,
        )

        # Validate if requested
        if validate:
            self._validate_task(scheduled_task)

        # Add to collections
        self.tasks.append(scheduled_task)
        self.task_ids.add(task_id)

        # Sort tasks to maintain consistent order
        self._sort_tasks()

        logger.info(
            "Added task %s with priority %d, frequency %s, interval %d",
            task_name,
            priority,
            frequency.name,
            interval,
        )

        return task_id

    def _get_frequency_from_rrule(self, rrule: rrule) -> Frequency:
        """Extract frequency from rrule object"""
        freq_map = {
            YEARLY: Frequency.YEARLY,
            MONTHLY: Frequency.MONTHLY,
            WEEKLY: Frequency.WEEKLY,
            DAILY: Frequency.DAILY,
            HOURLY: Frequency.HOURLY,
            MINUTELY: Frequency.MINUTELY,
            SECONDLY: Frequency.SECONDLY,
        }
        # Access the frequency using the _freq attribute
        rrule_freq = getattr(rrule, "_freq", None)
        if rrule_freq is None:
            # Try alternative attribute names
            rrule_freq = getattr(rrule, "freq", None)
        if rrule_freq is None:
            # Default to YEARLY if we can't determine frequency
            logger.warning(
                "Could not determine frequency from rrule, defaulting to YEARLY"
            )
            return Frequency.YEARLY
        return freq_map.get(rrule_freq, Frequency.YEARLY)

    def _validate_task(self, task: ScheduledTask):
        """Validate task parameters"""
        if self._validate_interval:
            if task.interval > self._max_interval:
                raise ValueError(
                    f"Interval {task.interval} exceeds maximum allowed {self._max_interval}"
                )

        if task.priority > self._max_priority:
            raise ValueError(
                f"Priority {task.priority} exceeds maximum allowed {self._max_priority}"
            )

        # Check for duplicate task names with same priority (potential conflict)
        duplicate_tasks = [
            t
            for t in self.tasks
            if t.task_name == task.task_name and t.priority == task.priority
        ]
        if duplicate_tasks:
            logger.warning(
                "Task %s with priority %d already exists. This may cause conflicts.",
                task.task_name,
                task.priority,
            )

    def _sort_tasks(self):
        """Sort tasks by priority, frequency, and interval"""
        self.tasks.sort()

    def get_priority_groups(self) -> Dict[int, List[ScheduledTask]]:
        """Group tasks by priority"""
        groups = defaultdict(list)
        for task in self.tasks:
            groups[task.priority].append(task)

        # Sort tasks within each priority group
        for priority in groups:
            groups[priority].sort()

        return dict(groups)

    def get_highest_priority_tasks(self) -> List[ScheduledTask]:
        """Get tasks with the highest priority (lowest priority number)"""
        if not self.tasks:
            return []

        min_priority = min(task.priority for task in self.tasks)
        highest_priority_tasks = [
            task for task in self.tasks if task.priority == min_priority
        ]
        highest_priority_tasks.sort()

        return highest_priority_tasks

    def remove_task(self, task_id: str) -> bool:
        """Remove a task by its ID"""
        for i, task in enumerate(self.tasks):
            if task.task_id == task_id:
                self.tasks.pop(i)
                self.task_ids.discard(task_id)
                logger.info("Removed task %s", task_id)
                return True
        return False

    def update_task_priority(self, task_id: str, new_priority: int) -> bool:
        """Update task priority and resort"""
        for task in self.tasks:
            if task.task_id == task_id:
                old_priority = task.priority
                task.priority = new_priority
                self._sort_tasks()
                logger.info(
                    "Updated task %s priority from %d to %d",
                    task_id,
                    old_priority,
                    new_priority,
                )
                return True
        return False

    def get_execution_order(self) -> List[List[ScheduledTask]]:
        """
        Get the execution order of tasks after a specific datetime.

        Returns:
            List of tasks ordered by their next execution time and priority
        """
        execution_order = []

        priority_groups = self.get_priority_groups()
        logger.info("Priority Groups: %s", priority_groups)
        for priority in sorted(priority_groups.keys()):
            tasks_in_group = priority_groups[priority]
            execution_order.append(tasks_in_group)

        return execution_order

    def get_execution_stats(self) -> Dict:
        """Get execution statistics"""
        priority_groups = self.get_priority_groups()

        stats = {
            "total_tasks": len(self.tasks),
            "priority_groups": {
                priority: len(tasks) for priority, tasks in priority_groups.items()
            },
            "frequency_distribution": defaultdict(int),
            "interval_distribution": defaultdict(int),
            "execution_history_count": len(self.execution_history),
        }

        for task in self.tasks:
            stats["frequency_distribution"][task.frequency.name] += 1
            stats["interval_distribution"][task.interval] += 1

        return stats

    def set_validation_rules(
        self,
        validate_interval: bool = True,
        max_interval: int = 1000,
        max_priority: int = 100,
    ):
        """Set validation rules for task creation"""
        self._validate_interval = validate_interval
        self._max_interval = max_interval
        self._max_priority = max_priority

    def clear(self):
        """Clear all tasks"""
        self.tasks.clear()
        self.task_ids.clear()
        self.execution_history.clear()
        logger.info("Cleared all tasks from workflow scheduler")


# Edge cases and safeguards to consider:
# 1. Tasks with same priority, frequency, and interval - need secondary ordering
# 2. Tasks that never execute (invalid rrule)
# 3. Tasks with extremely large intervals that could cause memory issues
# 4. Tasks with negative or zero intervals
# 5. Tasks with invalid priority values
# 6. Tasks that execute too frequently (could overwhelm the system)
# 7. Tasks with timezone conflicts
# 8. Tasks that depend on each other (not handled in this implementation)
# 9. Tasks that should be skipped under certain conditions
# 10. Tasks that need to be rescheduled after failure
