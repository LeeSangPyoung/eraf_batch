import operator
from contextlib import contextmanager
from typing import Any, Callable, List, Optional, Tuple, Union

from sqlalchemy import and_, create_engine, func, or_
from sqlalchemy.orm import InstrumentedAttribute, Query, Session, sessionmaker
from sqlalchemy.sql.elements import UnaryExpression

from config import Config
from database import db
from logger import get_logger
from utils.exception import ValidationError
from utils.query_builder import QueryBuilder

logger = get_logger()

OPERATOR_MAPPING = {
    "eq": operator.eq,
    "ne": operator.ne,
    "lt": operator.lt,
    "lte": operator.le,
    "le": operator.le,
    "gt": operator.gt,
    "gte": operator.ge,
    "ge": operator.ge,
}


class PostgresClient:
    _engine = None
    _session_maker = None

    def __init__(self):
        # Ensure the engine is initialized only once
        self.Session = self.prepare_session()

    def get_engine(self):
        """
        Get the SQLAlchemy engine.
        """
        if not self._engine:
            try:
                # Try to get engine from Flask-SQLAlchemy
                self._engine = db.engine
            except RuntimeError:
                # If no Flask app context, create standalone engine
                self._engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)

        return self._engine

    def prepare_session(self):
        """
        Get the sessionmaker bound to the SQLAlchemy engine.
        """
        if not self._session_maker:
            self._session_maker = sessionmaker(bind=self.get_engine())

        return self._session_maker

    @contextmanager
    def get_session(self):
        """
        Get a new session from the sessionmaker.
        """
        session = self.Session()

        try:
            yield session

            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Exception in session: {str(e)}")
            raise
        finally:
            session.close()

    def _get_entity_column(
        self, entity: db.Model, column: Union[str, InstrumentedAttribute]
    ) -> List[InstrumentedAttribute]:
        """
        Get the columns of the SQLAlchemy model entity.
        Args:
            entity: The SQLAlchemy model entity.

        Returns:
            A list of InstrumentedAttribute representing the columns of the entity.
        """
        if isinstance(column, InstrumentedAttribute):
            return column

        return getattr(entity, column)

    def _transform_filter_parameter(
        self, entity: db.Model, param: Union[dict, tuple, Any]
    ) -> list:
        """ """
        if isinstance(param, dict) and param:
            key, val = list(param.items())[0]
        elif isinstance(param, tuple):
            key, val = param
        else:
            return [param]

        if key == "or_":
            return [or_(*self.parse_filter_params(entity, val))]
        elif key == "and_":
            return [and_(*self.parse_filter_params(entity, val))]
        elif isinstance(val, dict) and val:
            # Only accept first operation defined in dict
            transformed_params = []

            for operation, operation_value in val.items():
                op_func = OPERATOR_MAPPING.get(operation)
                entity_column = self._get_entity_column(entity, key)

                if op_func is None:
                    transformed_params.append(
                        getattr(entity_column, operation)(operation_value)
                    )
                else:
                    transformed_params.append(op_func(entity_column, operation_value))

            return transformed_params

        return [self._get_entity_column(entity, key) == val]

    def parse_filter_params(self, entity: db.Model, params: Union[dict, list]) -> list:
        """
        Parse filter parameters for a given entity.
        This method converts a list of dictionaries or a dictionary into a format suitable for filtering.
        If the input is empty, it returns an empty list.
        If a dictionary is provided, it converts it into a list of filter conditions.
        If a list of dictionaries is provided, it returns the list as is.

        Args:
            entity: The SQLAlchemy model entity to filter.
            params: A dictionary or a list of dictionaries containing filter parameters.

        Returns:

        """
        if not params:
            return []

        filters = []

        if isinstance(params, dict):
            for key, val in params.items():
                filters.extend(self._transform_filter_parameter(entity, (key, val)))

        elif isinstance(params, list):
            for param in params:
                filters.extend(self._transform_filter_parameter(entity, param))
        else:
            raise ValueError("Params must be a dictionary or a list of dictionaries.")

        return filters

    def parse_sort_params(
        self,
        entity: db.Model,
        sort_by: Optional[List[Union[str, Tuple[str, str]]]] = None,
    ) -> list:
        if not sort_by:
            return []

        sort_by_params = []

        for sort_param in sort_by:
            if isinstance(sort_param, UnaryExpression):
                sort_by_params.append(sort_param)
                continue

            direction = "asc"

            if isinstance(sort_param, tuple):
                sort_param, direction = sort_param

            assert direction.lower() in ["asc", "desc"], (
                "Direction must be 'asc' or 'desc'."
            )

            sort_by_params.append(
                getattr(entity, sort_param).asc()
                if direction.lower() == "asc"
                else getattr(entity, sort_param).desc()
            )

        return sort_by_params

    def _build_query(
        self,
        session: Session,
        entity: db.Model,
        params: Union[list, dict],
        query_options: Optional[list] = None,
        columns: Optional[List[InstrumentedAttribute]] = None,
        sort_by: Optional[List[Union[str, Tuple[str, str]]]] = None,
        outer_joins: Optional[List[Tuple[db.Model, Any]]] = None,
    ) -> Query:
        """
        Build a SQLAlchemy query based on the provided entity, parameters, sorting, and outer joins.

        Args:
            session: The SQLAlchemy session to use for the query.
            entity: The SQLAlchemy model entity to query.
            params:: A dictionary or a list of dictionaries containing filter parameters.
            query_options: Optional list of query options to apply to the query.
            sort_by:: Optional list of fields to sort by, can be a list of strings or tuples (field, direction).
            outer_joins: Optional list of outer joins to apply to the query.

        Returns:
            A SQLAlchemy query object.
        """
        builder = (
            QueryBuilder()
            .columns(columns)
            .outer_join(outer_joins)
            .query_options(query_options)
            .filter_by(self.parse_filter_params(entity, params))
            .sort_by(self.parse_sort_params(entity, sort_by))
        )

        return builder.build(session, entity)

    def get_paginated_records(
        self,
        session: Session,
        entity: db.Model,
        params: Union[dict, list],
        mapping: Callable,
        page_size: int,
        page_number: int,
        query_options: Optional[list] = None,
        columns: Optional[List[InstrumentedAttribute]] = None,
        sort_by: Optional[List[Union[str, Tuple[str, str]]]] = None,
        outer_joins: Optional[List[Tuple[db.Model, Any]]] = None,
        threshold: int = int(5e5),
    ):
        """
        Get paginated records from the database based on the provided entity and parameters.

        Args:
            session: The SQLAlchemy session to use for the query.
            entity: The SQLAlchemy model entity to query.
            params: A dictionary or a list of dictionaries containing filter parameters.
            mapping: A callable function to format the result.
            page_size: The number of records per page.
            page_number: The page number to retrieve.
            query_options: Optional list of query options to apply to the query.
            columns: Optional list of columns to include in the query.
            sort_by: Optional list of fields to sort by, can be a list of strings or tuples (field, direction).
            outer_joins: Optional list of outer joins to apply to the query.
            threshold: hybrid approach threshold.
                If less than threshold, use limit offset approach.
                If greater or equal to threshold, use row_number

        Returns:
            A dictionary containing the success status, error message (if any), and the formatted data.
        """
        logger.info("============ Get paginated db entities %s", entity.__name__)
        logger.debug("Get params %s", params)

        try:
            query = self._build_query(
                session,
                entity,
                params,
                query_options=query_options,
                columns=columns,
                sort_by=sort_by,
                outer_joins=outer_joins,
            )

            offset = int((page_number - 1) * page_size)

            if offset >= threshold:
                numbered_cte = query.add_columns(
                    func.row_number().over().label("rn")
                ).cte("numbered_rows")

                # Filter by row number range
                results = (
                    session.query(numbered_cte)
                    .filter(numbered_cte.c.rn.between(offset + 1, offset + page_size))
                    .all()
                )
            else:
                results = query.offset(offset).limit(page_size).all()

            formatted_result = []
            for result in results:
                formatted_result.append(mapping(result))

        except Exception as e:
            logger.error(
                "============ Get paginated db entities throws exception: %s", e
            )
            raise e

        return {
            "success": True,
            "error_msg": None,
            "data": formatted_result,
            "page_size": page_size,
            "page_number": page_number,
        }

    def count(
        self,
        session: Session,
        entity: db.Model,
        params: dict,
        outer_joins: Optional[List[Tuple[db.Model, Any]]] = None,
        query_options: Optional[list] = None,
    ):
        """
        Count the number of records in the database based on the provided entity and parameters.

        Args:
            session: The SQLAlchemy session to use for the query.
            entity: The SQLAlchemy model entity to query.
            params: A dictionary or a list of dictionaries containing filter parameters.
            outer_joins: Optional list of outer joins to apply to the query.
            query_options: Optional list of query options to apply to the query.

        Returns:

        """
        builder = (
            QueryBuilder()
            .outer_join(outer_joins)
            .query_options(query_options)
            .filter_by(self.parse_filter_params(entity, params))
        )

        return builder.count(session, entity)

    def get_record(
        self,
        session: Session,
        entity: db.Model,
        params: Union[list, dict],
        mapping: Callable,
        query_options: Optional[list] = None,
        columns: Optional[List[InstrumentedAttribute]] = None,
        sort_by: Optional[List[Union[str, Tuple[str, str]]]] = None,
        outer_joins: Optional[List[Tuple[db.Model, Any]]] = None,
    ):
        """
        Get a single record from the database based on the provided entity and parameters.

        Args:
            session: The SQLAlchemy session to use for the query.
            entity: The SQLAlchemy model entity to query.
            params: A dictionary or a list of dictionaries containing filter parameters.
            mapping: A callable function to format the result.
            query_options: Optional list of query options to apply to the query.
            columns: Optional list of columns to include in the query.
            sort_by: Optional list of fields to sort by, can be a list of strings or tuples (field, direction).
            outer_joins: Optional list of outer joins to apply to the query.

        Returns:
            A dictionary containing the success status, error message (if any), and the formatted data.
        """
        logger.info("============ Get db entity %s", entity.__name__)
        logger.debug("Get params %s", params)

        try:
            query = self._build_query(
                session,
                entity,
                params,
                query_options=query_options,
                columns=columns,
                outer_joins=outer_joins,
                sort_by=sort_by
            )

            result = query.first()

            if not result:
                return {"success": False, "error_msg": "Record not found", "data": None}

            formatted_result = mapping(result)
        except Exception as e:
            logger.error("============ Get db entity throws exception: %s", e)
            raise e

        return {"success": True, "error_msg": None, "data": formatted_result}

    def get_records(
        self,
        session: Session,
        entity: db.Model,
        params: Union[list, dict],
        mapping: Callable,
        query_options: Optional[list] = None,
        columns: Optional[List[InstrumentedAttribute]] = None,
        sort_by: Optional[List[Union[str, Tuple[str, str]]]] = None,
        outer_joins: Optional[List[Tuple[db.Model, Any]]] = None,
    ):
        """
        Get records from the database based on the provided entity and parameters.
        Args:
            session: The SQLAlchemy session to use for the query.
            entity: The SQLAlchemy model entity to query.
            params: A dictionary or a list of dictionaries containing filter parameters.
            mapping: A callable function to format the result.
            query_options: Optional list of query options to apply to the query.
            columns: Optional list of columns to include in the query.
            sort_by: Optional list of fields to sort by, can be a list of strings or tuples (field, direction).
            outer_joins: Optional list of outer joins to apply to the query.

        Returns:
            A dictionary containing the success status, error message (if any), and the formatted data.
        """
        logger.info("============ Get db entity %s", entity.__name__)

        try:
            query = self._build_query(
                session,
                entity,
                params,
                query_options=query_options,
                columns=columns,
                sort_by=sort_by,
                outer_joins=outer_joins,
            )

            results = query.all()

            formatted_result = []
            for result in results:
                formatted_result.append(mapping(result))
        except Exception as e:
            logger.error("============ Get db entity throws exception: %s", e)
            raise e

        return {
            "success": True,
            "error_msg": None,
            "data": formatted_result,
            "total": len(formatted_result),
        }

    def create_record(
        self,
        session: Session,
        entity: db.Model,
        params: dict,
        flush: bool = False,
    ):
        logger.info("============ Create db entity %s", entity.__name__)
        logger.debug("Create params %s", params)

        response = {"success": True, "error_msg": None, "data": None}

        try:
            new_obj = entity(params)
            session.add(new_obj)

            if flush:
                session.flush()
                response.update(record=new_obj)

        except Exception as e:
            logger.error("Exception create_record: %s", e)
            raise e

        return response

    def create_multiple_record(
        self, session: Session, entity: db.Model, obj_list: List[dict]
    ):
        logger.info("============ Create multiple db entity %s", entity.__name__)
        logger.debug("Create obj_list %s", obj_list)

        try:
            new_obj_list = [entity(obj) for obj in obj_list]
            session.bulk_save_objects(new_obj_list)
        except Exception as e:
            logger.error("Exception create_record: %s", e)
            raise e

        return {"success": True, "error_msg": None, "data": None}

    def update_record(
        self,
        session: Session,
        entity: db.Model,
        filter_params: Union[dict, list],
        params: dict,
        check_record=True,
        outer_joins: Optional[List[Tuple[db.Model, Any]]] = None,
    ):
        logger.info("============ Update db entity %s", entity.__name__)
        logger.debug("Update params %s", params)

        try:
            query = self._build_query(
                session,
                entity,
                filter_params,
                outer_joins=outer_joins,
            )

            if check_record:
                logger.info("============ Check record %s", entity.__name__)
                check = query.all()
                if not check:
                    raise ValidationError("Record not existed")

            no_updated_records = query.update(params)
        except Exception as e:
            logger.error("Exception update_record: %s", e)
            raise e

        return {
            "success": True,
            "error_msg": None,
            "data": None,
            "total_updated_records": no_updated_records,
        }

    def delete_record(
        self,
        session: Session,
        entity: db.Model,
        filter_params: Union[dict, list],
        outer_joins: Optional[List[Tuple[db.Model, Any]]] = None,
    ):
        logger.info("============ Delete db entity %s", entity.__name__)

        try:
            query = self._build_query(
                session,
                entity,
                filter_params,
                outer_joins=outer_joins,
            )

            deleted_count = query.delete()
        except Exception as e:
            logger.error("Exception delete_record: %s", e)
            raise e

        return {
            "success": True,
            "error_msg": None,
            "data": None,
            "total_deleted_records": deleted_count,
        }

    def get_distinct_values(self, session: Session, entity: db.Model, column: str):
        """
        Get distinct values from a column in a table.
        """
        return [
            record[0]
            for record in session.query(getattr(entity, column)).distinct().all()  # type: ignore
        ]


# Initialize the PostgresClient instance
_helper = None


def get_postgres_client():
    """
    Get the PostgresClient instance.
    Returns:
        PostgresClient: An instance of PostgresClient.

    """
    global _helper

    if not _helper:
        _helper = PostgresClient()

    return _helper
