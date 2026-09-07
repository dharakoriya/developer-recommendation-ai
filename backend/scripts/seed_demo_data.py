"""
DevAlign AI — Development Database Reset & Idempotent Controlled Demo Data Seeder

Usage:
    python backend/scripts/seed_demo_data.py

Description:
    Cleans local development PostgreSQL database data safely and populates a small,
    realistic, reproducible demo dataset:
      - 2 Development Auth Users + 4 Developer Users
      - 2 Projects (FinTech Payment Platform, University Learning Portal)
      - 2 Teams (Core Payments Team, Portal Frontend Team)
      - 6 Core Skills (Python, FastAPI, React, TypeScript, PostgreSQL, Docker)
      - 4 Developer Profiles with realistic skill levels & availability states
      - 6 Realistic Tasks with skill requirements
      - 3 Assignments demonstrating varied workload states
      - Pre-generated baseline recommendations & workload calculations stored in PostgreSQL.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import delete, select
from app.database import SessionLocal
from app.core.security import get_password_hash
from app.config import settings

# Import Models
from app.models.user import User
from app.models.project import Project, Team, TeamMember
from app.models.developer import DeveloperProfile, DeveloperSkill, WorkloadRecord
from app.models.skill import Skill
from app.models.task import Task, TaskSkill, Assignment
from app.models.recommendation import Recommendation, RecommendationExplanation
from app.models.recommendation_audit import (
    RecommendationAudit,
    RecommendationFeedback,
    RecommendationOutcome,
)
from app.models.recommendation_validation import RecommendationLabelValidation
from app.models.recommendation_snapshot import RecommendationDatasetSnapshot
from app.models.enums import (
    UserRole,
    ProjectStatus,
    AvailabilityStatus,
    TaskPriority,
    TaskComplexity,
    TaskStatus,
    AssignmentStatus,
)

# Import Services for Seeding Computations
from app.services.recommendation_service import generate_and_persist_task_recommendations
from app.services.workload_service import calculate_developer_workload_details


def seed_demo_data():
    print(f"[*] Connecting to database: {settings.DATABASE_URL}")
    if "localhost" not in settings.DATABASE_URL and "127.0.0.1" not in settings.DATABASE_URL:
        print("[!] ERROR: Safety check failed! DATABASE_URL does not point to a local development host.")
        sys.exit(1)

    db = SessionLocal()
    try:
        print("[*] Performing safe development data cleanup...")
        # Clean in reverse foreign-key dependency order
        db.execute(delete(RecommendationLabelValidation))
        db.execute(delete(RecommendationDatasetSnapshot))
        db.execute(delete(RecommendationFeedback))
        db.execute(delete(RecommendationOutcome))
        db.execute(delete(RecommendationAudit))
        db.execute(delete(RecommendationExplanation))
        db.execute(delete(Recommendation))
        db.execute(delete(WorkloadRecord))
        db.execute(delete(Assignment))
        db.execute(delete(TaskSkill))
        db.execute(delete(Task))
        db.execute(delete(TeamMember))
        db.execute(delete(Team))
        db.execute(delete(DeveloperSkill))
        db.execute(delete(DeveloperProfile))
        db.execute(delete(Skill))
        db.execute(delete(Project))
        db.execute(delete(User))
        db.commit()
        print("[OK] Cleaned existing development database tables successfully.")

        # 1. Seed Users
        print("[*] Seeding development users...")
        hashed_admin_pass = get_password_hash("admin123")
        hashed_mgr_pass = get_password_hash("manager123")
        hashed_dev_pass = get_password_hash("dev123")

        u_admin = User(name="System Admin", email="admin@devalign.ai", password_hash=hashed_admin_pass, role=UserRole.ADMIN)
        u_mgr = User(name="Project Manager", email="manager@devalign.ai", password_hash=hashed_mgr_pass, role=UserRole.MANAGER)
        u_alice = User(name="Alice Sharma", email="alice@devalign.ai", password_hash=hashed_dev_pass, role=UserRole.DEVELOPER)
        u_rahul = User(name="Rahul Patel", email="rahul@devalign.ai", password_hash=hashed_dev_pass, role=UserRole.DEVELOPER)
        u_priya = User(name="Priya Mehta", email="priya@devalign.ai", password_hash=hashed_dev_pass, role=UserRole.DEVELOPER)
        u_david = User(name="David Wilson", email="david@devalign.ai", password_hash=hashed_dev_pass, role=UserRole.DEVELOPER)

        db.add_all([u_admin, u_mgr, u_alice, u_rahul, u_priya, u_david])
        db.commit()
        for u in [u_admin, u_mgr, u_alice, u_rahul, u_priya, u_david]:
            db.refresh(u)

        # 2. Seed Projects
        print("[*] Seeding demo projects...")
        p_fintech = Project(name="FinTech Payment Platform", description="High-throughput payment gateway & transaction engine", status=ProjectStatus.ACTIVE, created_by=u_mgr.id)
        p_portal = Project(name="University Learning Portal", description="Online student learning & course management system", status=ProjectStatus.ACTIVE, created_by=u_mgr.id)
        db.add_all([p_fintech, p_portal])
        db.commit()
        db.refresh(p_fintech)
        db.refresh(p_portal)

        # 3. Seed Teams
        print("[*] Seeding demo teams...")
        team_core = Team(project_id=p_fintech.id, name="Core Payments Team", description="Backend & infrastructure engineering team")
        team_frontend = Team(project_id=p_portal.id, name="Portal Frontend Team", description="Web UI & client experience team")
        db.add_all([team_core, team_frontend])
        db.commit()
        db.refresh(team_core)
        db.refresh(team_frontend)

        # 4. Seed Skills
        print("[*] Seeding core skills...")
        s_python = Skill(name="Python", category="Backend")
        s_fastapi = Skill(name="FastAPI", category="Backend")
        s_react = Skill(name="React", category="Frontend")
        s_ts = Skill(name="TypeScript", category="Frontend")
        s_pg = Skill(name="PostgreSQL", category="Database")
        s_docker = Skill(name="Docker", category="DevOps")
        db.add_all([s_python, s_fastapi, s_react, s_ts, s_pg, s_docker])
        db.commit()

        # 5. Seed Developer Profiles
        print("[*] Seeding developer profiles & skill proficiencies...")
        d_alice = DeveloperProfile(user_id=u_alice.id, experience_years=Decimal("6.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("92.0"))
        d_rahul = DeveloperProfile(user_id=u_rahul.id, experience_years=Decimal("4.5"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("88.0"))
        d_priya = DeveloperProfile(user_id=u_priya.id, experience_years=Decimal("5.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("94.0"))
        d_david = DeveloperProfile(user_id=u_david.id, experience_years=Decimal("7.0"), availability_status=AvailabilityStatus.UNAVAILABLE, performance_score=Decimal("85.0"))
        db.add_all([d_alice, d_rahul, d_priya, d_david])
        db.commit()
        for d in [d_alice, d_rahul, d_priya, d_david]:
            db.refresh(d)

        # Skill Proficiencies (0-100 scale)
        dev_skills = [
            # Alice: Python, FastAPI, PostgreSQL, Docker
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_python.id, proficiency_level=Decimal("90.0")),
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_fastapi.id, proficiency_level=Decimal("85.0")),
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_pg.id, proficiency_level=Decimal("80.0")),
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_docker.id, proficiency_level=Decimal("60.0")),
            # Rahul: React, TypeScript, Python
            DeveloperSkill(developer_id=d_rahul.id, skill_id=s_react.id, proficiency_level=Decimal("95.0")),
            DeveloperSkill(developer_id=d_rahul.id, skill_id=s_ts.id, proficiency_level=Decimal("90.0")),
            DeveloperSkill(developer_id=d_rahul.id, skill_id=s_python.id, proficiency_level=Decimal("40.0")),
            # Priya: Python, FastAPI, React, TypeScript, PostgreSQL
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_python.id, proficiency_level=Decimal("80.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_fastapi.id, proficiency_level=Decimal("80.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_react.id, proficiency_level=Decimal("75.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_ts.id, proficiency_level=Decimal("75.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_pg.id, proficiency_level=Decimal("70.0")),
            # David: Docker, PostgreSQL, Python, FastAPI
            DeveloperSkill(developer_id=d_david.id, skill_id=s_docker.id, proficiency_level=Decimal("95.0")),
            DeveloperSkill(developer_id=d_david.id, skill_id=s_pg.id, proficiency_level=Decimal("85.0")),
            DeveloperSkill(developer_id=d_david.id, skill_id=s_python.id, proficiency_level=Decimal("60.0")),
            DeveloperSkill(developer_id=d_david.id, skill_id=s_fastapi.id, proficiency_level=Decimal("50.0")),
        ]
        db.add_all(dev_skills)

        # Team Members
        tm1 = TeamMember(team_id=team_core.id, developer_id=d_alice.id)
        tm2 = TeamMember(team_id=team_core.id, developer_id=d_priya.id)
        tm3 = TeamMember(team_id=team_frontend.id, developer_id=d_rahul.id)
        db.add_all([tm1, tm2, tm3])
        db.commit()

        # 6. Seed Tasks & Task Skills
        print("[*] Seeding demo tasks & skill requirements...")
        now_utc = datetime.now(timezone.utc)
        
        t1 = Task(
            project_id=p_fintech.id, team_id=team_core.id, title="Build Authentication API",
            description="Implement JWT authentication, login/register endpoints, and RBAC middleware",
            category="Backend", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("20.0"), deadline=now_utc + timedelta(days=7), status=TaskStatus.IN_PROGRESS,
            created_by=u_mgr.id,
        )
        t2 = Task(
            project_id=p_fintech.id, team_id=team_core.id, title="Implement Payment Dashboard",
            description="Build interactive transaction history dashboard with real-time UI components",
            category="Frontend", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
            estimated_hours=Decimal("16.0"), deadline=now_utc + timedelta(days=10), status=TaskStatus.IN_PROGRESS,
            created_by=u_mgr.id,
        )
        t3 = Task(
            project_id=p_portal.id, team_id=team_frontend.id, title="Build Student Login Interface",
            description="Design responsive student portal login and password reset forms",
            category="Frontend", priority=TaskPriority.LOW, complexity=TaskComplexity.LOW,
            estimated_hours=Decimal("10.0"), deadline=now_utc + timedelta(days=14), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )
        t4 = Task(
            project_id=p_portal.id, team_id=None, title="Design PostgreSQL Reporting Schema",
            description="Create data warehouse reporting schema for student grade analytics",
            category="Database", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
            estimated_hours=Decimal("18.0"), deadline=now_utc + timedelta(days=12), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )
        t5 = Task(
            project_id=p_fintech.id, team_id=team_core.id, title="Containerize Backend Service",
            description="Create production Dockerfiles, docker-compose configuration, and build scripts",
            category="DevOps", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
            estimated_hours=Decimal("12.0"), deadline=now_utc - timedelta(days=2), status=TaskStatus.COMPLETED,
            created_by=u_mgr.id,
        )
        t6 = Task(
            project_id=p_portal.id, team_id=None, title="Build Course Management API",
            description="Develop CRUD endpoints for course catalog, enrollment, and syllabus management",
            category="Backend", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("24.0"), deadline=now_utc + timedelta(days=20), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )
        db.add_all([t1, t2, t3, t4, t5, t6])
        db.commit()
        for t in [t1, t2, t3, t4, t5, t6]:
            db.refresh(t)

        task_skills = [
            # T1: Build Authentication API (FastAPI 80, Python 85, PostgreSQL 75)
            TaskSkill(task_id=t1.id, skill_id=s_fastapi.id, required_level=Decimal("80.0")),
            TaskSkill(task_id=t1.id, skill_id=s_python.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t1.id, skill_id=s_pg.id, required_level=Decimal("75.0")),
            # T2: Implement Payment Dashboard (React 85, TypeScript 80)
            TaskSkill(task_id=t2.id, skill_id=s_react.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t2.id, skill_id=s_ts.id, required_level=Decimal("80.0")),
            # T3: Build Student Login Interface (React 70, TypeScript 70)
            TaskSkill(task_id=t3.id, skill_id=s_react.id, required_level=Decimal("70.0")),
            TaskSkill(task_id=t3.id, skill_id=s_ts.id, required_level=Decimal("70.0")),
            # T4: Design PostgreSQL Reporting Schema (PostgreSQL 80, Python 70)
            TaskSkill(task_id=t4.id, skill_id=s_pg.id, required_level=Decimal("80.0")),
            TaskSkill(task_id=t4.id, skill_id=s_python.id, required_level=Decimal("70.0")),
            # T5: Containerize Backend Service (Docker 90, FastAPI 60)
            TaskSkill(task_id=t5.id, skill_id=s_docker.id, required_level=Decimal("90.0")),
            TaskSkill(task_id=t5.id, skill_id=s_fastapi.id, required_level=Decimal("60.0")),
            # T6: Build Course Management API (Python 85, FastAPI 80, PostgreSQL 75)
            TaskSkill(task_id=t6.id, skill_id=s_python.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t6.id, skill_id=s_fastapi.id, required_level=Decimal("80.0")),
            TaskSkill(task_id=t6.id, skill_id=s_pg.id, required_level=Decimal("75.0")),
        ]
        db.add_all(task_skills)
        db.commit()

        # 7. Seed Assignments
        print("[*] Seeding task assignments...")
        a1 = Assignment(task_id=t1.id, developer_id=d_alice.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Alice for backend JWT auth")
        a2 = Assignment(task_id=t2.id, developer_id=d_rahul.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Rahul for React dashboard UI")
        a3 = Assignment(task_id=t5.id, developer_id=d_david.id, assigned_by=u_mgr.id, status=AssignmentStatus.COMPLETED, completed_at=now_utc - timedelta(days=1), notes="Dockerization completed")
        db.add_all([a1, a2, a3])
        db.commit()

        # 8. Calculate Task Weights & Seed Performance Intelligence Data
        print("[*] Calculating Task Weight Scores...")
        from app.services.task_weight_service import calculate_task_weight_score
        for t in [t1, t2, t3, t4, t5, t6]:
            weight = calculate_task_weight_score(t)
            t.task_weight_score = Decimal(str(weight))
        db.commit()

        print("[*] Seeding developer streaks, achievements & incentive ledgers...")
        from app.models.performance import DeveloperStreak, DeveloperAchievement, DeveloperIncentiveLedger
        from app.services.performance_service import (
            evaluate_and_grant_developer_achievements,
            snapshot_developer_performance,
        )

        # Alice: 4-day active streak, 850 incentive points
        streak_alice = DeveloperStreak(
            developer_id=d_alice.id,
            current_streak=4,
            longest_streak=6,
            last_completion_date=now_utc.date(),
        )
        inc_alice1 = DeveloperIncentiveLedger(
            developer_id=d_alice.id, task_id=t5.id, base_points=Decimal("600.00"),
            difficulty_bonus=Decimal("120.00"), on_time_bonus=Decimal("90.00"), streak_bonus=Decimal("40.00"),
            total_points=Decimal("850.00"), description="Completed Containerize Backend Service"
        )

        # Rahul: 2-day streak
        streak_rahul = DeveloperStreak(
            developer_id=d_rahul.id,
            current_streak=2,
            longest_streak=3,
            last_completion_date=now_utc.date(),
        )
        inc_rahul1 = DeveloperIncentiveLedger(
            developer_id=d_rahul.id, task_id=t2.id, base_points=Decimal("400.00"),
            difficulty_bonus=Decimal("0.00"), on_time_bonus=Decimal("60.00"), streak_bonus=Decimal("20.00"),
            total_points=Decimal("480.00"), description="Completed Implement Payment Dashboard"
        )

        # Priya: 3-day streak
        streak_priya = DeveloperStreak(
            developer_id=d_priya.id,
            current_streak=3,
            longest_streak=4,
            last_completion_date=now_utc.date(),
        )

        # David: 1-day streak
        streak_david = DeveloperStreak(
            developer_id=d_david.id,
            current_streak=1,
            longest_streak=1,
            last_completion_date=now_utc.date() - timedelta(days=1),
        )

        db.add_all([streak_alice, streak_rahul, streak_priya, streak_david, inc_alice1, inc_rahul1])
        db.commit()

        # Evaluate Achievements & Snapshots
        for dev in [d_alice, d_rahul, d_priya, d_david]:
            evaluate_and_grant_developer_achievements(db, dev.id)
            snapshot_developer_performance(db, dev.id)

        # 9. Recalculate Workload & Generate Baseline Recommendations
        print("[*] Recalculating developer workloads...")
        for dev in [d_alice, d_rahul, d_priya, d_david]:
            calculate_developer_workload_details(db, dev.id)

        print("[*] Pre-generating baseline-v1.1 recommendations for tasks...")
        for t in [t1, t2, t3, t4, t6]:
            generate_and_persist_task_recommendations(db, t.id, model_version="baseline-v1.1")

        print("\n[OK] DEMO DATA SEEDED SUCCESSFULLY!")
        print("==================================================")
        print("  Projects Created   : 2")
        print("  Teams Created      : 2")
        print("  Users Created      : 6 (Admin, Manager, 4 Developers)")
        print("  Developers Seeded  : 4 (Alice, Rahul, Priya, David)")
        print("  Skills Seeded      : 6 (Python, FastAPI, React, TS, PG, Docker)")
        print("  Tasks Seeded       : 6 (with Task Weight Scores)")
        print("  Assignments Seeded : 3")
        print("  Streaks & Badges   : Seeded & Calculated")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding demo data: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
