from enum import Enum
from typing import Any, List, Optional, Tuple

from sqlalchemy.orm import InstrumentedAttribute, Query, Session
from sqlalchemy.sql.elements import BinaryExpression, UnaryExpression

from database import db


class QueryBuilder:
    class ExecutionStep(Enum):
        JOIN = "join"
        OPTIONS = "options"
        FILTER = "filter"
        SORT = "sort"

    def __init__(self):
        """
        Query builder for SQLAlchemy
        """
        self._filters: Optional[List[BinaryExpression]] = None
        self._sort_by: Optional[List[UnaryExpression]] = None
        self._outer_joins: Optional[List[Tuple[db.Model, Any]]] = None
        self._query_options: Optional[list] = None
        self._columns: Optional[List[InstrumentedAttribute]] = None
        self._execution_plan: dict = {
            self.ExecutionStep.JOIN: self._do_nothing,
            self.ExecutionStep.OPTIONS: self._do_nothing,
            self.ExecutionStep.FILTER: self._do_nothing,
            self.ExecutionStep.SORT: self._do_nothing,
        }

    def _do_nothing(self, query: Query) -> Query:
        """
        Do nothing
        """
        return query

    def _filter(self, query: Query) -> Query:
        """
        Add filters to session query

        Args:
            query: SQLAlchemy query
        """
        query = query.filter(*self._filters)  # type: ignore

        return query

    def _sort(self, query: Query) -> Query:
        """
        Sort query by sort parameters

        Args:
            query: SQLAlchemy query
        """
        query = query.order_by(*self._sort_by)  # type: ignore

        return query

    def _join(self, query: Query) -> Query:
        """
        Outer join query with other tables

        Args:
            query: SQLAlchemy query
        """
        for join_entity, join_condition in self._outer_joins:
            query = query.outerjoin(join_entity, join_condition)

        return query

    def _options(self, query: Query) -> Query:
        """
        Add query options

        Args:
            query: SQLAlchemy query
        """
        query = query.options(*self._query_options)  # type: ignore

        return query

    def filter_by(self, filters: Optional[List[BinaryExpression]]) -> "QueryBuilder":
        """
        Add filters to the query
        Args:
            filters: List of BinaryExpression
        Returns:
            self
        """
        self._filters = filters

        if self._filters:
            self._execution_plan[self.ExecutionStep.FILTER] = self._filter

        return self

    def sort_by(self, sort_by: Optional[List[UnaryExpression]]) -> "QueryBuilder":
        """
        Add sort by to the query
        Args:
            sort_by: List of UnaryExpression
        Returns:
            self
        """
        self._sort_by = sort_by

        if self._sort_by:
            self._execution_plan[self.ExecutionStep.SORT] = self._sort

        return self

    def outer_join(
        self, outer_joins: Optional[List[Tuple[db.Model, Any]]]
    ) -> "QueryBuilder":
        """
        Add outer joins to the query
        Args:
            outer_joins: List of Tuple[db.Model, Any]
        Returns:
            self
        """
        self._outer_joins = outer_joins

        if self._outer_joins:
            self._execution_plan[self.ExecutionStep.JOIN] = self._join

        return self

    def query_options(self, query_options: Optional[list]) -> "QueryBuilder":
        """
        Add query options to the query
        Args:
            query_options: List of query options
        Returns:
            self
        """
        self._query_options = query_options

        if self._query_options:
            self._execution_plan[self.ExecutionStep.OPTIONS] = self._options

        return self

    def columns(self, columns: Optional[List[InstrumentedAttribute]]) -> "QueryBuilder":
        """
        Add columns to the query
        Args:
            columns: List of InstrumentedAttribute
        Returns:
            self
        """
        self._columns = columns

        return self

    def _get_query(self, session: Session, entity: db.Model) -> Query:
        """
        Get the query
        """
        if self._columns:
            return session.query(*self._columns).select_from(entity)

        return session.query(entity)

    def build(self, session: Session, entity: db.Model) -> Query:
        """
        Build the query
        """
        query = self._get_query(session, entity)

        for func in self._execution_plan.values():
            query = func(query)

        return query

    def count(self, session: Session, entity: db.Model) -> int:
        query = session.query(entity)

        for execution_step in [
            self.ExecutionStep.JOIN,
            self.ExecutionStep.OPTIONS,
            self.ExecutionStep.FILTER,
        ]:
            query = self._execution_plan[execution_step](query)

        return query.count()
