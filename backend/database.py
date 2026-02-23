from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

# Store the SQLite file inside the backend directory
DB_PATH = Path(__file__).parent / "lms.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite + FastAPI
    echo=False,
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
