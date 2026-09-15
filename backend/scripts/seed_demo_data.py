"""
DevAlign AI — Final Complete Demonstration Database Reset & Idempotent Controlled Data Seeder

Usage:
    python backend/scripts/seed_demo_data.py

Description:
    Cleans local development PostgreSQL database data safely and populates a complete,
    realistic, reproducible demonstration dataset covering all 12 system capabilities:
      - 1 Admin + 1 Manager + 4 Developers (distinct skills, workloads, streaks, and availability)
      - 3 Projects (FinTech Payment Platform, University Learning Portal, Internal Analytics Dashboard)
      - 3 Teams (Core Payments Backend, Portal UI/UX, Platform & DevOps)
      - 7 Core Skills across Backend, Frontend, Database, and DevOps
      - 10 Realistic Tasks covering all 12 demonstration scenarios:
          Case 1: Unassigned TODO (Find Best Developer flow)
          Case 2: Recommended but not yet assigned
          Case 3: In-Progress with Live Active Timer Running
          Case 4: In-Progress Paused Task with Accumulated Actual Time
          Case 5: Completed Task with full lifecycle, completed_by & completed_at
          Case 6: High Weight / CRITICAL Task (> 80.0 weight score)
          Case 7: Low Weight / LIGHT Task (< 25.0 weight score)
          Case 8: Overloaded Developer Workload Pressure
          Case 9: Skill Gap & 3-Tier Categorization (Eligible, Conditionally Eligible, Ineligible)
          Case 10: High Priority Deadline Risk / Imminent Risk
          Case 11: Incentive Ledger (Base, On-Time, Difficulty, Streak Points)
          Case 12: Project -> Team -> Task -> Developer Member flow
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
from app.models.performance import DeveloperStreak, DeveloperAchievement, DeveloperIncentiveLedger
from app.models.enums import (
    UserRole,
    ProjectStatus,
    AvailabilityStatus,
    TaskPriority,
    TaskComplexity,
    TaskStatus,
    AssignmentStatus,
)

# Import Services for Computations
from app.services.recommendation_service import generate_and_persist_task_recommendations
from app.services.workload_service import calculate_developer_workload_details
from app.services.task_weight_service import calculate_task_weight_score
from app.services.performance_service import (
    evaluate_and_grant_developer_achievements,
    snapshot_developer_performance,
)


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
        db.execute(delete(DeveloperIncentiveLedger))
        db.execute(delete(DeveloperAchievement))
        db.execute(delete(DeveloperStreak))
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

        # =========================================================================
        # 1. SEED USERS (1 Admin, 1 Manager, 4 Distinct Developers)
        # =========================================================================
        print("[*] Seeding demo users...")
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

        # =========================================================================
        # 2. SEED PROJECTS (3 Real Projects)
        # =========================================================================
        print("[*] Seeding demo projects...")
        p_fintech = Project(name="FinTech Payment Platform", description="High-throughput payment gateway & real-time transaction engine", status=ProjectStatus.ACTIVE, created_by=u_mgr.id)
        p_portal = Project(name="University Learning Portal", description="Online student course registration and grading management portal", status=ProjectStatus.ACTIVE, created_by=u_mgr.id)
        p_analytics = Project(name="Internal Analytics Dashboard", description="Enterprise telemetry, executive metrics & machine learning observability", status=ProjectStatus.ACTIVE, created_by=u_mgr.id)
        db.add_all([p_fintech, p_portal, p_analytics])
        db.commit()
        for p in [p_fintech, p_portal, p_analytics]:
            db.refresh(p)

        # =========================================================================
        # 3. SEED TEAMS (3 Cross-Functional Teams)
        # =========================================================================
        print("[*] Seeding demo teams...")
        team_backend = Team(project_id=p_fintech.id, name="Core Payments Backend Team", description="Backend APIs, database integrity, and high-volume transaction routing")
        team_frontend = Team(project_id=p_portal.id, name="Portal UI/UX Team", description="Next.js frontend applications, student workflows, and UI component design")
        team_platform = Team(project_id=p_analytics.id, name="Platform & DevOps Team", description="Container orchestration, database tuning, and analytics pipeline infrastructure")
        db.add_all([team_backend, team_frontend, team_platform])
        db.commit()
        for t in [team_backend, team_frontend, team_platform]:
            db.refresh(t)

        # =========================================================================
        # 4. SEED SKILLS (7 Core Standard Skills)
        # =========================================================================
        print("[*] Seeding core skills...")
        s_python = Skill(name="Python", category="Backend")
        s_fastapi = Skill(name="FastAPI", category="Backend")
        s_react = Skill(name="React", category="Frontend")
        s_ts = Skill(name="TypeScript", category="Frontend")
        s_pg = Skill(name="PostgreSQL", category="Database")
        s_docker = Skill(name="Docker", category="DevOps")
        s_uiux = Skill(name="UI/UX", category="Frontend")
        db.add_all([s_python, s_fastapi, s_react, s_ts, s_pg, s_docker, s_uiux])
        db.commit()
        for s in [s_python, s_fastapi, s_react, s_ts, s_pg, s_docker, s_uiux]:
            db.refresh(s)

        # =========================================================================
        # 5. SEED DEVELOPER PROFILES & SKILL PROFICIENCIES
        # =========================================================================
        print("[*] Seeding developer profiles...")
        # Alice: High backend skill (Python 90, FastAPI 88, PG 85), Low/Moderate workload, 6.0 yrs exp, 94.0 perf
        d_alice = DeveloperProfile(user_id=u_alice.id, experience_years=Decimal("6.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("94.0"))
        # Rahul: High frontend skill (React 95, TS 92, UI/UX 85), Moderate workload, 4.5 yrs exp, 88.0 perf
        d_rahul = DeveloperProfile(user_id=u_rahul.id, experience_years=Decimal("4.5"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("88.0"))
        # Priya: Fullstack skill, 5.5 yrs exp, 92.0 perf, High/Heavy workload (demonstrates capacity pressure)
        d_priya = DeveloperProfile(user_id=u_priya.id, experience_years=Decimal("5.5"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("92.0"))
        # David: DevOps Specialist (Docker 95, PG 85), 7.0 yrs exp, 86.0 perf, UNAVAILABLE (demonstrates exclusion)
        d_david = DeveloperProfile(user_id=u_david.id, experience_years=Decimal("7.0"), availability_status=AvailabilityStatus.UNAVAILABLE, performance_score=Decimal("86.0"))
        db.add_all([d_alice, d_rahul, d_priya, d_david])
        db.commit()
        for d in [d_alice, d_rahul, d_priya, d_david]:
            db.refresh(d)

        # Skill Proficiencies
        dev_skills = [
            # Alice: Python, FastAPI, PostgreSQL, Docker
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_python.id, proficiency_level=Decimal("90.0")),
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_fastapi.id, proficiency_level=Decimal("88.0")),
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_pg.id, proficiency_level=Decimal("85.0")),
            DeveloperSkill(developer_id=d_alice.id, skill_id=s_docker.id, proficiency_level=Decimal("65.0")),
            # Rahul: React, TypeScript, UI/UX, Python
            DeveloperSkill(developer_id=d_rahul.id, skill_id=s_react.id, proficiency_level=Decimal("95.0")),
            DeveloperSkill(developer_id=d_rahul.id, skill_id=s_ts.id, proficiency_level=Decimal("92.0")),
            DeveloperSkill(developer_id=d_rahul.id, skill_id=s_uiux.id, proficiency_level=Decimal("85.0")),
            DeveloperSkill(developer_id=d_rahul.id, skill_id=s_python.id, proficiency_level=Decimal("40.0")),
            # Priya: Fullstack (Python, FastAPI, React, TypeScript, PostgreSQL)
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_python.id, proficiency_level=Decimal("82.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_fastapi.id, proficiency_level=Decimal("80.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_react.id, proficiency_level=Decimal("80.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_ts.id, proficiency_level=Decimal("80.0")),
            DeveloperSkill(developer_id=d_priya.id, skill_id=s_pg.id, proficiency_level=Decimal("75.0")),
            # David: Docker, PostgreSQL, Python, FastAPI
            DeveloperSkill(developer_id=d_david.id, skill_id=s_docker.id, proficiency_level=Decimal("95.0")),
            DeveloperSkill(developer_id=d_david.id, skill_id=s_pg.id, proficiency_level=Decimal("85.0")),
            DeveloperSkill(developer_id=d_david.id, skill_id=s_python.id, proficiency_level=Decimal("60.0")),
            DeveloperSkill(developer_id=d_david.id, skill_id=s_fastapi.id, proficiency_level=Decimal("50.0")),
        ]
        db.add_all(dev_skills)

        # Team Memberships
        tm1 = TeamMember(team_id=team_backend.id, developer_id=d_alice.id)
        tm2 = TeamMember(team_id=team_backend.id, developer_id=d_priya.id)
        tm3 = TeamMember(team_id=team_frontend.id, developer_id=d_rahul.id)
        tm4 = TeamMember(team_id=team_platform.id, developer_id=d_david.id)
        tm5 = TeamMember(team_id=team_platform.id, developer_id=d_alice.id)
        db.add_all([tm1, tm2, tm3, tm4, tm5])
        db.commit()

        # =========================================================================
        # 6. SEED 10 TASKS (Covering All 12 Test Cases)
        # =========================================================================
        print("[*] Seeding demo tasks...")
        now_utc = datetime.now(timezone.utc)

        # CASE 1: UNASSIGNED TODO (Find Best Developer flow)
        t1 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Build Payment Webhook Ingestion API",
            description="Implement secure HTTP webhook listener with HMAC SHA-256 signature verification and asynchronous retry queues",
            category="Backend", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("16.0"), deadline=now_utc + timedelta(days=7), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # CASE 2: RECOMMENDED BUT NOT YET ASSIGNED
        t2 = Task(
            project_id=p_portal.id, team_id=None, title="Design Student Course Recommendation Schema",
            description="Create PostgreSQL relational schema and indexing strategy for dynamic student course prerequisites",
            category="Database", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
            estimated_hours=Decimal("12.0"), deadline=now_utc + timedelta(days=10), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # CASE 3: ASSIGNED + IN PROGRESS + ACTIVE TIMER RUNNING
        t3 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Build Authentication & RBAC Engine",
            description="Implement JWT authentication, role permission middleware, and user password hashing endpoints",
            category="Backend", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("20.0"), deadline=now_utc + timedelta(days=8), status=TaskStatus.IN_PROGRESS,
            started_at=now_utc - timedelta(hours=2), is_timer_running=True,
            timer_started_at=now_utc - timedelta(minutes=15),
            total_actual_seconds=1800, total_actual_minutes=30,
            created_by=u_mgr.id,
        )

        # CASE 4: IN PROGRESS PAUSED TASK WITH ACCUMULATED ACTUAL TIME
        t4 = Task(
            project_id=p_fintech.id, team_id=team_frontend.id, title="Implement Realtime Payment Dashboard",
            description="Build interactive transaction history dashboard with filtering, search, and live status streaming",
            category="Frontend", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
            estimated_hours=Decimal("16.0"), deadline=now_utc + timedelta(days=12), status=TaskStatus.IN_PROGRESS,
            started_at=now_utc - timedelta(days=1), is_timer_running=False,
            timer_started_at=None,
            total_actual_seconds=5400, total_actual_minutes=90,
            created_by=u_mgr.id,
        )

        # CASE 5 & CASE 11: COMPLETED TASK WITH INCENTIVES & TIMESTAMPS
        t5 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Containerize Microservices with Docker",
            description="Create production multi-stage Dockerfiles, docker-compose configuration, and automated build scripts",
            category="DevOps", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("16.0"), deadline=now_utc - timedelta(days=1), status=TaskStatus.COMPLETED,
            started_at=now_utc - timedelta(days=3), completed_at=now_utc - timedelta(days=1),
            completed_by=u_alice.id, is_timer_running=False, timer_started_at=None,
            total_actual_seconds=50400, total_actual_minutes=840,
            created_by=u_mgr.id,
        )

        # CASE 6: HIGH WEIGHT / CRITICAL TASK
        t6 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Core Transaction Idempotency & Settlement Engine",
            description="Implement mission-critical financial transaction reconciliation engine with two-phase commit",
            category="Backend", priority=TaskPriority.CRITICAL, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("32.0"), deadline=now_utc + timedelta(days=5), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # CASE 7: LOW WEIGHT / LIGHT TASK
        t7 = Task(
            project_id=p_portal.id, team_id=team_frontend.id, title="Update Portal Privacy Policy & FAQ Copy",
            description="Revise legal disclaimer text, typography styling, and mobile layout for the student support FAQ page",
            category="Frontend", priority=TaskPriority.LOW, complexity=TaskComplexity.LOW,
            estimated_hours=Decimal("4.0"), deadline=now_utc + timedelta(days=14), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # CASE 8: TASK ASSIGNED TO DEMONSTRATE OVERLOADED DEVELOPER (Priya)
        t8 = Task(
            project_id=p_analytics.id, team_id=team_platform.id, title="Refactor Database Connection Pool & Caching",
            description="Optimize SQLAlchemy query pooling, Redis cache eviction strategy, and read-replica routing",
            category="Database", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("24.0"), deadline=now_utc + timedelta(days=9), status=TaskStatus.IN_PROGRESS,
            started_at=now_utc - timedelta(hours=4), is_timer_running=False,
            total_actual_seconds=3600, total_actual_minutes=60,
            created_by=u_mgr.id,
        )

        # CASE 9: SKILL GAP & 3-TIER CATEGORIZATION DEMO
        t9 = Task(
            project_id=p_analytics.id, team_id=team_platform.id, title="Multi-Cluster Docker Ingress Controller",
            description="Deploy high-availability Docker swarm ingress routing with mutual TLS authentication",
            category="DevOps", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("20.0"), deadline=now_utc + timedelta(days=15), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # CASE 10: HIGH PRIORITY / DEADLINE RISK DEMO (Imminent deadline)
        t10 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Emergency Security Patch for JWT Signatures",
            description="Hotfix zero-day vulnerability in token decoding algorithm and enforce key rotation",
            category="Backend", priority=TaskPriority.CRITICAL, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("18.0"), deadline=now_utc + timedelta(hours=12), status=TaskStatus.IN_PROGRESS,
            started_at=now_utc - timedelta(hours=1), is_timer_running=False,
            total_actual_seconds=1800, total_actual_minutes=30,
            created_by=u_mgr.id,
        )

        all_tasks = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]
        db.add_all(all_tasks)
        db.commit()
        for t in all_tasks:
            db.refresh(t)

        # =========================================================================
        # 7. SEED TASK SKILLS
        # =========================================================================
        print("[*] Seeding task skills...")
        task_skills = [
            # T1: Build Payment Webhook (Python 85, FastAPI 80, PostgreSQL 75)
            TaskSkill(task_id=t1.id, skill_id=s_python.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t1.id, skill_id=s_fastapi.id, required_level=Decimal("80.0")),
            TaskSkill(task_id=t1.id, skill_id=s_pg.id, required_level=Decimal("75.0")),
            # T2: Design Student Course Schema (PostgreSQL 80, Python 70)
            TaskSkill(task_id=t2.id, skill_id=s_pg.id, required_level=Decimal("80.0")),
            TaskSkill(task_id=t2.id, skill_id=s_python.id, required_level=Decimal("70.0")),
            # T3: Build Authentication & RBAC (FastAPI 85, Python 90)
            TaskSkill(task_id=t3.id, skill_id=s_fastapi.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t3.id, skill_id=s_python.id, required_level=Decimal("90.0")),
            # T4: Implement Payment Dashboard (React 85, TypeScript 80, UI/UX 75)
            TaskSkill(task_id=t4.id, skill_id=s_react.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t4.id, skill_id=s_ts.id, required_level=Decimal("80.0")),
            TaskSkill(task_id=t4.id, skill_id=s_uiux.id, required_level=Decimal("75.0")),
            # T5: Containerize Microservices (Docker 70, Python 75)
            TaskSkill(task_id=t5.id, skill_id=s_docker.id, required_level=Decimal("70.0")),
            TaskSkill(task_id=t5.id, skill_id=s_python.id, required_level=Decimal("75.0")),
            # T6: Core Transaction Idempotency (Python 90, FastAPI 85, PostgreSQL 90)
            TaskSkill(task_id=t6.id, skill_id=s_python.id, required_level=Decimal("90.0")),
            TaskSkill(task_id=t6.id, skill_id=s_fastapi.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t6.id, skill_id=s_pg.id, required_level=Decimal("90.0")),
            # T7: Update Portal Privacy Policy (UI/UX 50)
            TaskSkill(task_id=t7.id, skill_id=s_uiux.id, required_level=Decimal("50.0")),
            # T8: Refactor DB Connection Pool (PostgreSQL 85, Python 80)
            TaskSkill(task_id=t8.id, skill_id=s_pg.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t8.id, skill_id=s_python.id, required_level=Decimal("80.0")),
            # T9: Multi-Cluster Docker Ingress (Docker 90, PostgreSQL 75)
            TaskSkill(task_id=t9.id, skill_id=s_docker.id, required_level=Decimal("90.0")),
            TaskSkill(task_id=t9.id, skill_id=s_pg.id, required_level=Decimal("75.0")),
            # T10: Emergency Security Patch (Python 85, FastAPI 85)
            TaskSkill(task_id=t10.id, skill_id=s_python.id, required_level=Decimal("85.0")),
            TaskSkill(task_id=t10.id, skill_id=s_fastapi.id, required_level=Decimal("85.0")),
        ]
        db.add_all(task_skills)
        db.commit()

        # =========================================================================
        # 8. SEED TASK ASSIGNMENTS
        # =========================================================================
        print("[*] Seeding task assignments...")
        # T3 assigned to Alice (Active)
        a1 = Assignment(task_id=t3.id, developer_id=d_alice.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Alice for JWT & RBAC engine")
        # T4 assigned to Rahul (Active)
        a2 = Assignment(task_id=t4.id, developer_id=d_rahul.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Rahul for React dashboard UI")
        # T5 completed by Alice
        a3 = Assignment(task_id=t5.id, developer_id=d_alice.id, assigned_by=u_mgr.id, status=AssignmentStatus.COMPLETED, completed_at=now_utc - timedelta(days=1), notes="Docker microservices containerization complete")
        # T8 assigned to Priya (Active - 24h)
        a4 = Assignment(task_id=t8.id, developer_id=d_priya.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Priya for SQLAlchemy connection pool tuning")
        # T10 assigned to Priya (Active - 18h -> pushes Priya to 42h active workload)
        a5 = Assignment(task_id=t10.id, developer_id=d_priya.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Priya for emergency security token hotfix")

        db.add_all([a1, a2, a3, a4, a5])
        db.commit()

        # =========================================================================
        # 9. CALCULATE TASK WEIGHT SCORES (Milestone 21 Formula)
        # =========================================================================
        print("[*] Calculating Task Weight Scores...")
        for t in all_tasks:
            weight = calculate_task_weight_score(t)
            t.task_weight_score = Decimal(str(weight))
        db.commit()

        # =========================================================================
        # 10. SEED PERFORMANCE STREAKS, BADGES & INCENTIVE LEDGER
        # =========================================================================
        print("[*] Seeding streaks, achievements & incentive ledgers...")
        # Alice: 5-day streak, 850 pts
        streak_alice = DeveloperStreak(
            developer_id=d_alice.id,
            current_streak=5,
            longest_streak=7,
            last_completion_date=now_utc.date(),
        )
        inc_alice = DeveloperIncentiveLedger(
            developer_id=d_alice.id, task_id=t5.id, base_points=Decimal("600.00"),
            difficulty_bonus=Decimal("120.00"), on_time_bonus=Decimal("90.00"), streak_bonus=Decimal("40.00"),
            total_points=Decimal("850.00"), description="Completed Containerize Microservices with Docker"
        )

        # Rahul: 3-day streak, 480 pts
        streak_rahul = DeveloperStreak(
            developer_id=d_rahul.id,
            current_streak=3,
            longest_streak=4,
            last_completion_date=now_utc.date(),
        )
        inc_rahul = DeveloperIncentiveLedger(
            developer_id=d_rahul.id, task_id=t4.id, base_points=Decimal("400.00"),
            difficulty_bonus=Decimal("0.00"), on_time_bonus=Decimal("60.00"), streak_bonus=Decimal("20.00"),
            total_points=Decimal("480.00"), description="Completed UI Layout Phase"
        )

        # Priya: 4-day streak, 620 pts
        streak_priya = DeveloperStreak(
            developer_id=d_priya.id,
            current_streak=4,
            longest_streak=5,
            last_completion_date=now_utc.date(),
        )
        inc_priya = DeveloperIncentiveLedger(
            developer_id=d_priya.id, task_id=t8.id, base_points=Decimal("500.00"),
            difficulty_bonus=Decimal("80.00"), on_time_bonus=Decimal("40.00"), streak_bonus=Decimal("0.00"),
            total_points=Decimal("620.00"), description="Completed Connection Pool Profiling"
        )

        # David: 1-day streak
        streak_david = DeveloperStreak(
            developer_id=d_david.id,
            current_streak=1,
            longest_streak=2,
            last_completion_date=now_utc.date() - timedelta(days=2),
        )

        db.add_all([streak_alice, streak_rahul, streak_priya, streak_david, inc_alice, inc_rahul, inc_priya])
        db.commit()

        # Evaluate Achievements & Snapshots
        for dev in [d_alice, d_rahul, d_priya, d_david]:
            evaluate_and_grant_developer_achievements(db, dev.id)
            snapshot_developer_performance(db, dev.id)

        # =========================================================================
        # 11. RECALCULATE DEVELOPER WORKLOADS
        # =========================================================================
        print("[*] Recalculating developer workloads...")
        for dev in [d_alice, d_rahul, d_priya, d_david]:
            calculate_developer_workload_details(db, dev.id)

        # =========================================================================
        # 12. PRE-GENERATE ACTIVE BASELINE RECOMMENDATIONS
        # =========================================================================
        active_model = settings.RECOMMENDATION_MODEL
        print(f"[*] Pre-generating recommendations using active model ({active_model})...")
        for t in [t1, t2, t6, t7, t9]:
            generate_and_persist_task_recommendations(db, t.id, model_version=active_model)

        print("\n[OK] DEMONSTRATION DATABASE SEEDED SUCCESSFULLY!")
        print("=================================================================")
        print("  Users Created        : 6 (1 Admin, 1 Manager, 4 Developers)")
        print("  Projects Created     : 3 (FinTech, University Portal, Analytics)")
        print("  Teams Created        : 3 (Backend Core, Portal UI, Platform)")
        print("  Developers Seeded    : 4 (Alice, Rahul, Priya, David)")
        print("  Skills Seeded        : 7 (Python, FastAPI, React, TS, PG, Docker, UI/UX)")
        print("  Tasks Seeded         : 10 (Covering all 12 Demonstration Scenarios)")
        print("  Assignments Seeded   : 5 (3 Active, 1 Completed, 1 In-Progress)")
        print("  Incentive Records    : 3 Ledgers Seeded with Multi-Factor Bonuses")
        print("  Recommendations      : Pre-generated for all unassigned tasks")
        print("=================================================================")

    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding demo data: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
