import argparse

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from models import *  # noqa
from logic.scheduler_job_servers import scheduler_job_servers_restart
from utils.postgres_helper import get_postgres_client


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--system_name", type=str, required=False, default=None)
    parser.add_argument("--redeploy", type=bool, required=False, default=False)
    return parser.parse_args()


def main():
    arguments = get_args()
    postgres_client = get_postgres_client()
    with postgres_client.get_session() as session:
        scheduler_job_servers_restart(
            session,
            {"system_name": arguments.system_name, "redeploy": arguments.redeploy},
        )


if __name__ == "__main__":
    main()
