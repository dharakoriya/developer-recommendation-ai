import os
import sys
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

def audit_database():
    db_url = settings.DATABASE_URL
    print(f"DATABASE_URL: {db_url}")

    if "localhost" not in db_url and "127.0.0.1" not in db_url:
        print("CRITICAL: DATABASE IS NOT LOCALHOST. ABORTING AUDIT.")
        sys.exit(1)

    engine = create_engine(db_url)

    tables = [
        "users",
        "projects",
        "teams",
        "team_members",
        "developer_profiles",
        "skills",
        "developer_skills",
        "tasks",
        "task_skills",
        "assignments",
        "workload_records",
        "recommendations",
        "recommendation_explanations",
        "recommendation_audits",
        "recommendation_feedbacks",
        "recommendation_outcomes",
        "recommendation_label_validations",
        "recommendation_dataset_snapshots",
        "alembic_version"
    ]

    print("\n================ COMPLETE DATABASE AUDIT REPORT ================")
    print(f"{'Table Name':<35} | {'Row Count':<10}")
    print("-" * 50)

    with engine.connect() as conn:
        for table in tables:
            try:
                res = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = res.scalar()
                print(f"{table:<35} | {count:<10}")
            except Exception as e:
                print(f"{table:<35} | ERROR: {e}")

    print("=================================================================\n")

if __name__ == "__main__":
    audit_database()
