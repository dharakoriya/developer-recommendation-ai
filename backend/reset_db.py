import os
import sys
import subprocess

# Self-invocation check: Ensure script runs inside the virtual environment (venv)
def ensure_venv():
    try:
        import sqlalchemy
    except ImportError:
        # If sqlalchemy is missing, attempt auto-rerun with backend/venv Python
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        if os.path.exists(venv_python):
            print(f"[INFO] Switching to virtual environment Python: {venv_python}")
            result = subprocess.run([venv_python, __file__] + sys.argv[1:])
            sys.exit(result.returncode)
        else:
            print("[ERROR] Could not find virtualenv Python at backend/venv/Scripts/python.exe")
            print("Please run: venv\\Scripts\\python.exe reset_db.py")
            sys.exit(1)

ensure_venv()

import uuid
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, text, select
from sqlalchemy.orm import sessionmaker

# Ensure backend directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.core.security import get_password_hash
from app.database import Base
import app.models
from app.models.user import User
from app.models.enums import UserRole, AvailabilityStatus, TaskPriority, TaskComplexity, TaskStatus, AssignmentStatus
from app.models.project import Project, Team, TeamMember
from app.models.developer import DeveloperProfile, DeveloperSkill, WorkloadRecord
from app.models.performance import DeveloperStreak, DeveloperAchievement, DeveloperIncentiveLedger
from app.models.skill import Skill
from app.models.task import Task, TaskSkill, Assignment
from app.services.task_weight_service import calculate_task_weight_score
from app.services.recommendation_service import generate_and_persist_task_recommendations

def reset_and_seed_database():
    db_url = settings.DATABASE_URL
    print("\n========================================================")
    print("DevAlign AI -- Complete Database Reset & Seed Script")
    print("========================================================")
    print(f"DATABASE_URL: {db_url}")

    # Safety check
    if "localhost" not in db_url and "127.0.0.1" not in db_url:
        print("[ERROR] DATABASE IS NOT LOCALHOST. ABORTING RESET FOR SAFETY.")
        sys.exit(1)

    print("Environment: LOCAL DEVELOPMENT (localhost)")
    print("Database: devalign_db")
    print("SAFE TO RESET: YES\n")

    engine = create_engine(db_url)
    
    print("Step 1: Ensuring all ORM Database Tables exist...")
    Base.metadata.create_all(bind=engine)
    print(" [OK] All ORM models verified/created.")

    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("Step 2: Clearing existing application data...")
        with engine.connect() as conn:
            trans = conn.begin()
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE;'))
            trans.commit()
        print(" [OK] Application tables cleared successfully.\n")

        print("Step 2: Seeding core Skills catalog...")
        skills_data = [
            ("Python", "Backend"),
            ("FastAPI", "Backend"),
            ("React", "Frontend"),
            ("TypeScript", "Frontend"),
            ("PostgreSQL", "Database"),
            ("Docker", "DevOps"),
            ("UI/UX Design", "Design"),
        ]
        skills_map = {}
        for s_name, s_cat in skills_data:
            sk = Skill(id=uuid.uuid4(), name=s_name, category=s_cat)
            session.add(sk)
            skills_map[s_name] = sk
        session.flush()
        print(f" [OK] Seeded {len(skills_map)} core skills.")

        print("Step 3: Seeding User Accounts & Developer Profiles...")
        # 1. Admin User
        admin_user = User(
            id=uuid.uuid4(),
            name="System Admin",
            email="admin@devalign.ai",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        session.add(admin_user)

        # 2. Manager User
        manager_user = User(
            id=uuid.uuid4(),
            name="Project Manager",
            email="manager@devalign.ai",
            password_hash=get_password_hash("manager123"),
            role=UserRole.MANAGER,
            is_active=True,
        )
        session.add(manager_user)

        # 3. Developer Users & Profiles
        devs_specs = [
            {
                "name": "Alice Backend Lead",
                "email": "dev@devalign.ai",
                "password": "dev123",
                "exp": 5.0,
                "perf": 92.5,
                "rate": 95.0,
                "avail": AvailabilityStatus.AVAILABLE,
                "skills": [("Python", 90), ("FastAPI", 85), ("PostgreSQL", 88), ("Docker", 75)],
            },
            {
                "name": "Bob Fullstack Engineer",
                "email": "bob@devalign.ai",
                "password": "dev123",
                "exp": 3.5,
                "perf": 84.0,
                "rate": 88.0,
                "avail": AvailabilityStatus.AVAILABLE,
                "skills": [("React", 85), ("TypeScript", 80), ("Python", 70), ("FastAPI", 75)],
            },
            {
                "name": "Charlie Junior Frontend",
                "email": "charlie@devalign.ai",
                "password": "dev123",
                "exp": 1.2,
                "perf": 68.0,
                "rate": 72.0,
                "avail": AvailabilityStatus.PARTIAL,
                "skills": [("UI/UX Design", 80), ("React", 60), ("TypeScript", 55)],
            },
        ]

        dev_profiles = []
        for dspec in devs_specs:
            u = User(
                id=uuid.uuid4(),
                name=dspec["name"],
                email=dspec["email"],
                password_hash=get_password_hash(dspec["password"]),
                role=UserRole.DEVELOPER,
                is_active=True,
            )
            session.add(u)
            session.flush()

            dp = DeveloperProfile(
                id=uuid.uuid4(),
                user_id=u.id,
                experience_years=Decimal(str(dspec["exp"])),
                availability_status=dspec["avail"],
                performance_score=Decimal(str(dspec["perf"])),
            )
            session.add(dp)
            session.flush()
            dev_profiles.append(dp)

            # Developer Streak Record
            dst = DeveloperStreak(
                id=uuid.uuid4(),
                developer_id=dp.id,
                current_streak=3,
                longest_streak=5,
            )
            session.add(dst)

            # Developer Skills
            for sk_name, prof_lvl in dspec["skills"]:
                sk_obj = skills_map[sk_name]
                ds = DeveloperSkill(
                    id=uuid.uuid4(),
                    developer_id=dp.id,
                    skill_id=sk_obj.id,
                    proficiency_level=Decimal(str(prof_lvl)),
                )
                session.add(ds)

            # Initial Workload Record
            wr = WorkloadRecord(
                id=uuid.uuid4(),
                developer_id=dp.id,
                active_task_count=0,
                estimated_hours=Decimal("0.0"),
                workload_score=Decimal("0.0"),
            )
            session.add(wr)

        session.flush()
        print(f" [OK] Created 3 User Roles (Admin, Manager, Developer) and {len(dev_profiles)} Developer profiles.")

        print("Step 4: Seeding Sample Project & Team...")
        proj = Project(
            id=uuid.uuid4(),
            name="University Learning Management Platform",
            description="Enterprise LMS software featuring course enrollment, automated grading, live video lectures, and workload balance analytics.",
            status="ACTIVE",
            created_by=manager_user.id,
        )
        session.add(proj)
        session.flush()

        team = Team(
            id=uuid.uuid4(),
            name="Core Platform Engineering Team",
            description="Primary cross-functional engineering team responsible for LMS backend APIs, frontend portal, and DB architecture.",
            project_id=proj.id,
        )
        session.add(team)
        session.flush()

        for dp in dev_profiles:
            tm = TeamMember(
                id=uuid.uuid4(),
                team_id=team.id,
                developer_id=dp.id,
                joined_at=datetime.now(timezone.utc),
            )
            session.add(tm)

        session.flush()
        print(f" [OK] Created Project '{proj.name}' and Team '{team.name}'.")

        print("Step 5: Seeding Sample Tasks across difficulty tiers...")
        tasks_specs = [
            {
                "title": "Design Database Schema & Alembic Migrations",
                "desc": "Create PostgreSQL relational schema for courses, enrollments, grades, and developer workload auditing.",
                "comp": TaskComplexity.HIGH,
                "prio": TaskPriority.CRITICAL,
                "effort": 16.0,
                "skills": [("PostgreSQL", 85.0), ("Python", 80.0)],
            },
            {
                "title": "Implement RESTful Auth & JWT Middleware",
                "desc": "Build authentication endpoints, password hashing, and role-based access control middleware.",
                "comp": TaskComplexity.MEDIUM,
                "prio": TaskPriority.HIGH,
                "effort": 8.0,
                "skills": [("FastAPI", 80.0), ("Python", 85.0)],
            },
            {
                "title": "Build Course Enrollment React Dashboard Component",
                "desc": "Develop responsive student course enrollment dashboard with course filtering and real-time status indicators.",
                "comp": TaskComplexity.MEDIUM,
                "prio": TaskPriority.MEDIUM,
                "effort": 12.0,
                "skills": [("React", 75.0), ("TypeScript", 75.0)],
            },
            {
                "title": "Fix Header UI Contrast in Light Mode",
                "desc": "Adjust CSS variables and Tailwind tokens for search bar text contrast in light theme.",
                "comp": TaskComplexity.LOW,
                "prio": TaskPriority.LOW,
                "effort": 3.0,
                "skills": [("UI/UX Design", 50.0)],
            },
            {
                "title": "Containerize Microservices using Docker Compose",
                "desc": "Create multi-stage Dockerfiles and docker-compose.yml for backend, frontend, and PostgreSQL services.",
                "comp": TaskComplexity.HIGH,
                "prio": TaskPriority.HIGH,
                "effort": 20.0,
                "skills": [("Docker", 80.0), ("PostgreSQL", 70.0)],
            },
        ]

        created_tasks = []
        for tspec in tasks_specs:
            t = Task(
                id=uuid.uuid4(),
                project_id=proj.id,
                team_id=team.id,
                created_by=manager_user.id,
                title=tspec["title"],
                description=tspec["desc"],
                complexity=tspec["comp"],
                priority=tspec["prio"],
                estimated_hours=Decimal(str(tspec["effort"])),
                status=TaskStatus.TODO,
                created_at=datetime.now(timezone.utc),
            )
            session.add(t)
            session.flush()

            for sk_name, req_lvl in tspec["skills"]:
                sk_obj = skills_map[sk_name]
                ts = TaskSkill(
                    id=uuid.uuid4(),
                    task_id=t.id,
                    skill_id=sk_obj.id,
                    required_level=Decimal(str(req_lvl)),
                )
                session.add(ts)

            session.flush()
            # Calculate Task Weight Score
            weight_score = calculate_task_weight_score(t)
            t.task_weight_score = Decimal(str(weight_score))
            created_tasks.append(t)

        session.commit()
        print(f" [OK] Created {len(created_tasks)} Tasks with calculated Task Weight Scores.")

        print("Step 6: Pre-generating Baseline-v2 Developer Recommendations...")
        for t in created_tasks:
            generate_and_persist_task_recommendations(session, t.id, model_version="baseline-v2")

        session.commit()
        print(" [OK] Generated baseline-v2 recommendation candidates for all tasks.")

        print("\n========================================================")
        print("SUCCESS! DEVAlign AI Database Reset & Seeding Complete.")
        print("========================================================")
        print("Default Credentials for Testing:")
        print("  • Admin:    admin@devalign.ai    / admin123")
        print("  • Manager:  manager@devalign.ai  / manager123")
        print("  • Developer: dev@devalign.ai     / dev123")
        print("========================================================\n")

    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] Reset failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    reset_and_seed_database()
