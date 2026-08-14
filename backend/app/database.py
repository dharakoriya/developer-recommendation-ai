from typing import Dict, Any
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Create SQLAlchemy engine using environment variable
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 3} if "postgresql" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def verify_database_connection() -> Dict[str, Any]:
    """
    Verifies that the backend can connect to PostgreSQL using the configured DATABASE_URL.
    Returns status dict without throwing uncaught operational errors.
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.scalar()
        return {
            "status": "connected",
            "message": "Successfully connected to PostgreSQL database.",
            "database_url_configured": True
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "message": f"Could not connect to PostgreSQL database: {str(e)}",
            "database_url_configured": bool(settings.DATABASE_URL)
        }


def get_db():
    """
    Dependency helper to yield database session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
