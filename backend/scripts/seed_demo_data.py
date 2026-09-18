"""
DevAlign AI — Enterprise Database Reset & Complete Demo Data Seeder

Usage:
    python backend/scripts/seed_demo_data.py
    or
    backend\\venv\\Scripts\\python.exe backend/scripts/seed_demo_data.py

Description:
    Safely resets local PostgreSQL development database tables and populates a complete,
    reproducible dataset matching all current database schemas, columns, and system features:
      - Users & Roles: 1 Admin + 1 Manager + 4 Developers (distinct skills, workloads, streaks, and availability)
      - Skills Catalog: 12 comprehensive skills across Backend, Frontend, Database, and DevOps
      - Developer Profiles & Proficiencies
      - Projects & Cross-Functional Teams with Memberships
      - Realistic Tasks covering all 12 platform demonstration scenarios (Timers, Weights, Risk, Statuses)
      - Task Skills & Active/Completed Assignments
      - Task Weight Scores computed dynamically
      - Performance Streaks, Achievements & Multi-Factor Incentive Ledgers
      - Performance Snapshots & Workload Balances
      - AI Project Plans & AI Project Plan Tasks
      - Explainable AI Recommendations (Baseline-v2) & Feature Contributions
      - Recommendation Audits, Feedbacks, Outcomes, Label Validations & Dataset Snapshots
"""
import os
import sys
import subprocess
import uuid
from decimal import Decimal
from datetime import datetime, timedelta, timezone

# Ensure virtual environment python is used if run with system python
def ensure_venv():
    try:
        import sqlalchemy
    except ImportError:
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        if os.path.exists(venv_python):
            print(f"[INFO] Invoking virtual environment Python: {venv_python}")
            result = subprocess.run([venv_python, __file__] + sys.argv[1:])
            sys.exit(result.returncode)
        else:
            print("[ERROR] Could not find virtual environment at backend/venv/Scripts/python.exe")
            sys.exit(1)

ensure_venv()

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, select, delete, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.core.security import get_password_hash
from app.database import Base

# Import all models to ensure complete metadata registration
import app.models
from app.models.user import User
from app.models.skill import Skill
from app.models.developer import DeveloperProfile, DeveloperSkill, WorkloadRecord
from app.models.project import Project, Team, TeamMember
from app.models.task import Task, TaskSkill, Assignment
from app.models.recommendation import Recommendation, RecommendationExplanation
from app.models.recommendation_audit import (
    RecommendationAudit,
    RecommendationFeedback,
    RecommendationOutcome,
)
from app.models.recommendation_validation import RecommendationLabelValidation
from app.models.recommendation_snapshot import RecommendationDatasetSnapshot
from app.models.performance import (
    DeveloperStreak,
    DeveloperAchievement,
    DeveloperIncentiveLedger,
    DeveloperPerformanceSnapshot,
)
from app.models.ai_planning import AIProjectPlan, AIProjectPlanTask
from app.models.enums import (
    UserRole,
    ProjectStatus,
    AvailabilityStatus,
    TaskPriority,
    TaskComplexity,
    TaskStatus,
    AssignmentStatus,
    ShapDirection,
    FeedbackDecision,
    OutcomeStatus,
    LabelStatus,
    ValidationStatus,
    AIPlanStatus,
    AIPlanTaskStatus,
    AIPlanGranularity,
    AIProjectType,
)

# Services
from app.services.task_weight_service import calculate_task_weight_score
from app.services.workload_service import calculate_developer_workload_details
from app.services.performance_service import (
    evaluate_and_grant_developer_achievements,
    snapshot_developer_performance,
)
from app.services.recommendation_service import generate_and_persist_task_recommendations


def seed_demo_data():
    db_url = settings.DATABASE_URL
    print("\n=================================================================")
    print("  DevAlign AI -- Complete Database Reset & Seed Script")
    print("=================================================================")
    print(f"[*] Target Database URL: {db_url}")

    if "localhost" not in db_url and "127.0.0.1" not in db_url:
        print("[!] ERROR: Safety check failed! DATABASE_URL is not localhost.")
        sys.exit(1)

    engine = create_engine(db_url)

    # 1. Reset Database Schema
    print("[*] Step 1: Dropping and recreating all ORM Database Tables...")
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        # Ensure uuid-ossp extension exists
        try:
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        except Exception:
            pass

    # Drop in correct order and recreate all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print(" [OK] All PostgreSQL tables & schemas recreated cleanly.")

    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        now_utc = datetime.now(timezone.utc)

        # =====================================================================
        # 2. SEED SKILLS CATALOG (12 Core Standard Skills)
        # =====================================================================
        print("[*] Step 2: Seeding standard Skills catalog...")
        skills_data = [
            ("Python", "Backend"),
            ("FastAPI", "Backend"),
            ("React", "Frontend"),
            ("TypeScript", "Frontend"),
            ("PostgreSQL", "Database"),
            ("Docker", "DevOps"),
            ("UI/UX Design", "Design"),
            ("Redis", "Database"),
            ("Next.js", "Frontend"),
            ("Kubernetes", "DevOps"),
            ("TailwindCSS", "Frontend"),
            ("GraphQL", "Backend"),
        ]
        skills_map = {}
        for s_name, s_cat in skills_data:
            sk = Skill(name=s_name, category=s_cat)
            db.add(sk)
            skills_map[s_name] = sk
        db.commit()
        for k in skills_map:
            db.refresh(skills_map[k])
        print(f" [OK] Seeded {len(skills_map)} skills across Backend, Frontend, Database, DevOps, and Design.")

        # =====================================================================
        # 3. SEED USERS (1 Admin, 1 Manager, 4 Developers)
        # =====================================================================
        print("[*] Step 3: Seeding enterprise Users...")
        admin_pass = get_password_hash("admin123")
        mgr_pass = get_password_hash("manager123")
        dev_pass = get_password_hash("dev123")

        u_admin = User(name="System Admin", email="admin@devalign.ai", password_hash=admin_pass, role=UserRole.ADMIN, is_active=True)
        u_mgr = User(name="Project Manager", email="manager@devalign.ai", password_hash=mgr_pass, role=UserRole.MANAGER, is_active=True)
        u_mgr2 = User(name="Operations Manager", email="ops@devalign.ai", password_hash=mgr_pass, role=UserRole.MANAGER, is_active=True)
        u_alice = User(name="Alice Sharma", email="alice@devalign.ai", password_hash=dev_pass, role=UserRole.DEVELOPER, is_active=True)
        u_rahul = User(name="Rahul Patel", email="rahul@devalign.ai", password_hash=dev_pass, role=UserRole.DEVELOPER, is_active=True)
        u_priya = User(name="Priya Mehta", email="priya@devalign.ai", password_hash=dev_pass, role=UserRole.DEVELOPER, is_active=True)
        u_david = User(name="David Wilson", email="david@devalign.ai", password_hash=dev_pass, role=UserRole.DEVELOPER, is_active=True)

        users_list = [u_admin, u_mgr, u_mgr2, u_alice, u_rahul, u_priya, u_david]
        db.add_all(users_list)
        db.commit()
        for u in users_list:
            db.refresh(u)
        print(" [OK] Seeded 7 Users (1 Admin, 2 Managers, 4 Developers).")

        # =====================================================================
        # 4. SEED DEVELOPER PROFILES & SKILLS
        # =====================================================================
        print("[*] Step 4: Seeding Developer Profiles, Proficiencies & Streaks...")
        # Alice: Senior Backend (6.0 yrs, 94.0 perf, AVAILABLE)
        d_alice = DeveloperProfile(user_id=u_alice.id, experience_years=Decimal("6.0"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("94.0"))
        # Rahul: Frontend Lead (4.5 yrs, 88.0 perf, AVAILABLE)
        d_rahul = DeveloperProfile(user_id=u_rahul.id, experience_years=Decimal("4.5"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("88.0"))
        # Priya: Fullstack Specialist (5.5 yrs, 92.0 perf, AVAILABLE - High Workload candidate)
        d_priya = DeveloperProfile(user_id=u_priya.id, experience_years=Decimal("5.5"), availability_status=AvailabilityStatus.AVAILABLE, performance_score=Decimal("92.0"))
        # David: DevOps Specialist (7.0 yrs, 86.0 perf, UNAVAILABLE - On Leave/Exclusion demo)
        d_david = DeveloperProfile(user_id=u_david.id, experience_years=Decimal("7.0"), availability_status=AvailabilityStatus.UNAVAILABLE, performance_score=Decimal("86.0"))

        dev_profiles = [d_alice, d_rahul, d_priya, d_david]
        db.add_all(dev_profiles)
        db.commit()
        for d in dev_profiles:
            db.refresh(d)

        # Developer Skills
        dev_skills_data = [
            # Alice: Python, FastAPI, PostgreSQL, Redis, Docker
            (d_alice.id, "Python", 92.0),
            (d_alice.id, "FastAPI", 88.0),
            (d_alice.id, "PostgreSQL", 86.0),
            (d_alice.id, "Redis", 80.0),
            (d_alice.id, "Docker", 65.0),
            # Rahul: React, TypeScript, UI/UX Design, Next.js, TailwindCSS, Python
            (d_rahul.id, "React", 95.0),
            (d_rahul.id, "TypeScript", 92.0),
            (d_rahul.id, "UI/UX Design", 88.0),
            (d_rahul.id, "Next.js", 85.0),
            (d_rahul.id, "TailwindCSS", 90.0),
            (d_rahul.id, "Python", 40.0),
            # Priya: Fullstack (Python, FastAPI, React, TypeScript, PostgreSQL, Redis)
            (d_priya.id, "Python", 84.0),
            (d_priya.id, "FastAPI", 82.0),
            (d_priya.id, "React", 80.0),
            (d_priya.id, "TypeScript", 80.0),
            (d_priya.id, "PostgreSQL", 78.0),
            (d_priya.id, "Redis", 75.0),
            # David: Docker, Kubernetes, PostgreSQL, Python, GraphQL
            (d_david.id, "Docker", 96.0),
            (d_david.id, "Kubernetes", 90.0),
            (d_david.id, "PostgreSQL", 85.0),
            (d_david.id, "Python", 60.0),
            (d_david.id, "GraphQL", 50.0),
        ]
        for dev_id, sk_name, prof in dev_skills_data:
            sk_id = skills_map[sk_name].id
            db.add(DeveloperSkill(developer_id=dev_id, skill_id=sk_id, proficiency_level=Decimal(str(prof))))

        # Initial Streaks
        db.add_all([
            DeveloperStreak(developer_id=d_alice.id, current_streak=5, longest_streak=8, last_completion_date=now_utc.date()),
            DeveloperStreak(developer_id=d_rahul.id, current_streak=3, longest_streak=4, last_completion_date=now_utc.date()),
            DeveloperStreak(developer_id=d_priya.id, current_streak=4, longest_streak=6, last_completion_date=now_utc.date()),
            DeveloperStreak(developer_id=d_david.id, current_streak=1, longest_streak=2, last_completion_date=now_utc.date() - timedelta(days=3)),
        ])
        db.commit()
        print(" [OK] Seeded Developer Profiles, Skills & Streaks.")

        # =====================================================================
        # 5. SEED PROJECTS & CROSS-FUNCTIONAL TEAMS
        # =====================================================================
        print("[*] Step 5: Seeding Projects & Teams...")
        p_fintech = Project(
            name="FinTech Payment Platform",
            description="High-throughput payment gateway, transaction ledger & real-time settlement engine",
            status=ProjectStatus.ACTIVE,
            created_by=u_mgr.id,
        )
        p_portal = Project(
            name="University Learning Portal",
            description="Online student course registration, syllabus prerequisites, and grading management portal",
            status=ProjectStatus.ACTIVE,
            created_by=u_mgr.id,
        )
        p_analytics = Project(
            name="Internal Analytics Dashboard",
            description="Enterprise telemetry, executive metrics, automated risk auditing & ML observability",
            status=ProjectStatus.ACTIVE,
            created_by=u_mgr.id,
        )
        db.add_all([p_fintech, p_portal, p_analytics])
        db.commit()
        for p in [p_fintech, p_portal, p_analytics]:
            db.refresh(p)

        team_backend = Team(project_id=p_fintech.id, name="Core Payments Backend Team", description="Backend APIs, database integrity, and high-volume transaction routing", manager_id=u_mgr.id)
        team_frontend = Team(project_id=p_portal.id, name="Portal UI/UX Team", description="Next.js frontend applications, student workflows, and UI component design", manager_id=u_mgr2.id)
        team_platform = Team(project_id=p_analytics.id, name="Platform & DevOps Team", description="Container orchestration, database tuning, and analytics pipeline infrastructure", manager_id=u_mgr.id)

        db.add_all([team_backend, team_frontend, team_platform])
        db.commit()
        for t in [team_backend, team_frontend, team_platform]:
            db.refresh(t)

        # Team Memberships
        db.add_all([
            TeamMember(team_id=team_backend.id, developer_id=d_alice.id),
            TeamMember(team_id=team_backend.id, developer_id=d_priya.id),
            TeamMember(team_id=team_frontend.id, developer_id=d_rahul.id),
            TeamMember(team_id=team_platform.id, developer_id=d_david.id),
            TeamMember(team_id=team_platform.id, developer_id=d_alice.id),
        ])
        db.commit()
        print(" [OK] Seeded 3 Projects & 3 Teams with memberships.")

        # =====================================================================
        # 6. SEED 10 TASKS (Covering all 12 Demonstration Cases)
        # =====================================================================
        print("[*] Step 6: Seeding Tasks with full schema fields (Weights, Timers, Deadlines)...")

        # Case 1: Unassigned TODO (Find Best Developer flow)
        t1 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Build Payment Webhook Ingestion API",
            description="Implement secure HTTP webhook listener with HMAC SHA-256 signature verification and asynchronous retry queues",
            category="Backend", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("16.0"), deadline=now_utc + timedelta(days=7), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # Case 2: Recommended TODO (Database Schema design)
        t2 = Task(
            project_id=p_portal.id, team_id=team_frontend.id, title="Design Student Course Recommendation Schema",
            description="Create PostgreSQL relational schema and indexing strategy for dynamic student course prerequisites",
            category="Database", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
            estimated_hours=Decimal("12.0"), deadline=now_utc + timedelta(days=10), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # Case 3: In-Progress with Live Active Timer Running
        t3 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Build Authentication & RBAC Policy Engine",
            description="Implement JWT authentication, role permission middleware, and user password hashing endpoints",
            category="Backend", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("20.0"), deadline=now_utc + timedelta(days=8), status=TaskStatus.IN_PROGRESS,
            started_at=now_utc - timedelta(hours=2), is_timer_running=True,
            timer_started_at=now_utc - timedelta(minutes=15),
            total_actual_seconds=1800, total_actual_minutes=30,
            created_by=u_mgr.id,
        )

        # Case 4: In-Progress Paused Task with Accumulated Actual Time
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

        # Case 5 & Case 11: Completed Task with full lifecycle, completed_by & completed_at
        t5 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Containerize Microservices with Multi-Stage Dockerfiles",
            description="Create production multi-stage Dockerfiles, docker-compose configuration, and automated build scripts",
            category="DevOps", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("16.0"), deadline=now_utc - timedelta(days=1), status=TaskStatus.COMPLETED,
            started_at=now_utc - timedelta(days=3), completed_at=now_utc - timedelta(days=1),
            completed_by=u_alice.id, is_timer_running=False, timer_started_at=None,
            total_actual_seconds=50400, total_actual_minutes=840,
            created_by=u_mgr.id,
        )

        # Case 6: High Weight / CRITICAL Task (> 80.0 weight score)
        t6 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Core Transaction Idempotency & Settlement Engine",
            description="Implement mission-critical financial transaction reconciliation engine with two-phase commit",
            category="Backend", priority=TaskPriority.CRITICAL, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("32.0"), deadline=now_utc + timedelta(days=5), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # Case 7: Low Weight / LIGHT Task (< 25.0 weight score)
        t7 = Task(
            project_id=p_portal.id, team_id=team_frontend.id, title="Update Portal Privacy Policy & FAQ Copy",
            description="Revise legal disclaimer text, typography styling, and mobile layout for student support FAQ page",
            category="Frontend", priority=TaskPriority.LOW, complexity=TaskComplexity.LOW,
            estimated_hours=Decimal("4.0"), deadline=now_utc + timedelta(days=14), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # Case 8: Assigned Task causing Workload Pressure (Assigned to Priya)
        t8 = Task(
            project_id=p_analytics.id, team_id=team_platform.id, title="Refactor Database Connection Pool & Caching",
            description="Optimize SQLAlchemy query pooling, Redis cache eviction strategy, and read-replica routing",
            category="Database", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("24.0"), deadline=now_utc + timedelta(days=9), status=TaskStatus.IN_PROGRESS,
            started_at=now_utc - timedelta(hours=4), is_timer_running=False,
            total_actual_seconds=3600, total_actual_minutes=60,
            created_by=u_mgr.id,
        )

        # Case 9: Skill Gap & 3-Tier Categorization Demo
        t9 = Task(
            project_id=p_analytics.id, team_id=team_platform.id, title="Multi-Cluster Kubernetes Ingress Controller",
            description="Deploy high-availability Kubernetes ingress routing with mutual TLS authentication and rate limiting",
            category="DevOps", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("20.0"), deadline=now_utc + timedelta(days=15), status=TaskStatus.TODO,
            created_by=u_mgr.id,
        )

        # Case 10: Imminent Deadline Risk (< 24h)
        t10 = Task(
            project_id=p_fintech.id, team_id=team_backend.id, title="Emergency Security Patch for JWT Signatures",
            description="Hotfix zero-day vulnerability in token decoding algorithm and enforce key rotation",
            category="Backend", priority=TaskPriority.CRITICAL, complexity=TaskComplexity.HIGH,
            estimated_hours=Decimal("18.0"), deadline=now_utc + timedelta(hours=14), status=TaskStatus.IN_PROGRESS,
            started_at=now_utc - timedelta(hours=1), is_timer_running=False,
            total_actual_seconds=1800, total_actual_minutes=30,
            created_by=u_mgr.id,
        )

        all_tasks = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]
        db.add_all(all_tasks)
        db.commit()
        for t in all_tasks:
            db.refresh(t)

        # Task Skills
        task_skills_data = [
            (t1.id, "Python", 85.0), (t1.id, "FastAPI", 80.0), (t1.id, "PostgreSQL", 75.0),
            (t2.id, "PostgreSQL", 80.0), (t2.id, "Python", 70.0),
            (t3.id, "FastAPI", 85.0), (t3.id, "Python", 90.0),
            (t4.id, "React", 85.0), (t4.id, "TypeScript", 80.0), (t4.id, "UI/UX Design", 75.0),
            (t5.id, "Docker", 70.0), (t5.id, "Python", 75.0),
            (t6.id, "Python", 90.0), (t6.id, "FastAPI", 85.0), (t6.id, "PostgreSQL", 90.0),
            (t7.id, "UI/UX Design", 50.0),
            (t8.id, "PostgreSQL", 85.0), (t8.id, "Python", 80.0), (t8.id, "Redis", 75.0),
            (t9.id, "Kubernetes", 90.0), (t9.id, "Docker", 85.0), (t9.id, "PostgreSQL", 70.0),
            (t10.id, "Python", 85.0), (t10.id, "FastAPI", 85.0),
        ]
        for task_id, sk_name, req_lvl in task_skills_data:
            sk_id = skills_map[sk_name].id
            db.add(TaskSkill(task_id=task_id, skill_id=sk_id, required_level=Decimal(str(req_lvl))))
        db.commit()

        # Task Assignments
        a1 = Assignment(task_id=t3.id, developer_id=d_alice.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Alice for JWT & RBAC policy engine")
        a2 = Assignment(task_id=t4.id, developer_id=d_rahul.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Rahul for React dashboard UI")
        a3 = Assignment(task_id=t5.id, developer_id=d_alice.id, assigned_by=u_mgr.id, status=AssignmentStatus.COMPLETED, completed_at=now_utc - timedelta(days=1), notes="Docker microservices containerization complete")
        a4 = Assignment(task_id=t8.id, developer_id=d_priya.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Priya for SQLAlchemy connection pool tuning")
        a5 = Assignment(task_id=t10.id, developer_id=d_priya.id, assigned_by=u_mgr.id, status=AssignmentStatus.ACTIVE, notes="Assigned to Priya for emergency security token hotfix (pushes Priya to 42h workload)")
        db.add_all([a1, a2, a3, a4, a5])
        db.commit()

        # Calculate & Persist Task Weight Scores
        for t in all_tasks:
            t.task_weight_score = Decimal(str(calculate_task_weight_score(t)))
        db.commit()
        print(" [OK] Seeded 10 Tasks with Task Skills, Assignments & Computed Weights.")

        # =====================================================================
        # 7. SEED INCENTIVE LEDGER, ACHIEVEMENTS & SNAPSHOTS
        # =====================================================================
        print("[*] Step 7: Seeding Incentive Ledgers, Achievements & Snapshots...")
        inc_alice = DeveloperIncentiveLedger(
            developer_id=d_alice.id, task_id=t5.id, base_points=Decimal("600.00"),
            difficulty_bonus=Decimal("120.00"), on_time_bonus=Decimal("90.00"), streak_bonus=Decimal("40.00"),
            total_points=Decimal("850.00"), description="Completed Containerize Microservices with Docker",
            earned_at=now_utc - timedelta(days=1),
        )
        inc_rahul = DeveloperIncentiveLedger(
            developer_id=d_rahul.id, task_id=t4.id, base_points=Decimal("400.00"),
            difficulty_bonus=Decimal("0.00"), on_time_bonus=Decimal("60.00"), streak_bonus=Decimal("20.00"),
            total_points=Decimal("480.00"), description="Completed UI Layout Phase",
            earned_at=now_utc - timedelta(days=2),
        )
        inc_priya = DeveloperIncentiveLedger(
            developer_id=d_priya.id, task_id=t8.id, base_points=Decimal("500.00"),
            difficulty_bonus=Decimal("80.00"), on_time_bonus=Decimal("40.00"), streak_bonus=Decimal("0.00"),
            total_points=Decimal("620.00"), description="Completed Connection Pool Profiling",
            earned_at=now_utc - timedelta(days=1),
        )
        db.add_all([inc_alice, inc_rahul, inc_priya])
        db.commit()

        for dev in dev_profiles:
            evaluate_and_grant_developer_achievements(db, dev.id)
            snapshot_developer_performance(db, dev.id)
            calculate_developer_workload_details(db, dev.id)

        print(" [OK] Seeded Incentive Ledgers, evaluated Badges & recalculated Workloads.")

        # =====================================================================
        # 8. SEED AI PROJECT PLANS & AI PROJECT PLAN TASKS
        # =====================================================================
        print("[*] Step 8: Seeding AI Project Plans & AI Tasks...")
        plan1 = AIProjectPlan(
            project_name="Automated Fraud Detection & Risk Scoring System",
            project_description="Real-time transaction anomaly detector using asynchronous scoring pipelines and high-concurrency Redis caching.",
            business_objective="Prevent fraudulent payment settlement and enforce automated chargeback risk alerts.",
            target_users="FinTech Compliance Officers & Risk Analysts",
            functional_requirements="1. Live transaction telemetry stream\n2. Real-time scoring model evaluation\n3. Executive dashboard with risk breakdown",
            technical_requirements="Python, FastAPI, Redis, PostgreSQL, async workers",
            technology_stack="Python, FastAPI, PostgreSQL, Redis, Docker",
            deadline="30 Days",
            granularity=AIPlanGranularity.BALANCED,
            project_type=AIProjectType.AI_ML_SYSTEM,
            preferred_team_size=3,
            status=AIPlanStatus.APPLIED,
            applied_project_id=p_fintech.id,
            created_by=u_mgr.id,
            summary_json={
                "total_estimated_hours": 64,
                "complexity_distribution": {"HIGH": 2, "MEDIUM": 2, "LOW": 0},
                "recommended_sprint_weeks": 4,
            },
        )
        plan2 = AIProjectPlan(
            project_name="Interactive Student Collaboration & Code Sandbox",
            project_description="Browser-based collaborative code editor and real-time student peer discussion workspace.",
            business_objective="Enhance remote computer science student engagement and interactive assignment grading.",
            target_users="University Students & Course Instructors",
            functional_requirements="1. Real-time web socket communication\n2. In-browser Python/JS code runner\n3. Course assignment submission flow",
            technical_requirements="Next.js, TypeScript, TailwindCSS, WebSocket API",
            technology_stack="Next.js, TypeScript, TailwindCSS, PostgreSQL",
            deadline="45 Days",
            granularity=AIPlanGranularity.BALANCED,
            project_type=AIProjectType.WEB_APP,
            preferred_team_size=2,
            status=AIPlanStatus.DRAFT,
            applied_project_id=None,
            created_by=u_mgr.id,
            summary_json={
                "total_estimated_hours": 48,
                "complexity_distribution": {"HIGH": 1, "MEDIUM": 2, "LOW": 0},
                "recommended_sprint_weeks": 3,
            },
        )
        db.add_all([plan1, plan2])
        db.commit()
        db.refresh(plan1)
        db.refresh(plan2)

        # AI Plan Tasks for Plan 1
        db.add_all([
            AIProjectPlanTask(
                plan_id=plan1.id, title="Fraud Feature Ingestion Pipeline",
                description="Build asynchronous event ingestion worker reading transaction logs into feature stores.",
                module="Telemetry & Ingestion", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
                estimated_hours=20.0, required_skills=["Python", "FastAPI", "Redis"],
                status=AIPlanTaskStatus.APPROVED,
            ),
            AIProjectPlanTask(
                plan_id=plan1.id, title="Real-Time Risk Scoring Rule Engine",
                description="Implement rule evaluation algorithms for velocity checks, IP geolocation, and transaction amounts.",
                module="Risk Engine", priority=TaskPriority.CRITICAL, complexity=TaskComplexity.HIGH,
                estimated_hours=24.0, required_skills=["Python", "PostgreSQL"],
                status=AIPlanTaskStatus.APPROVED,
            ),
            AIProjectPlanTask(
                plan_id=plan1.id, title="Executive Fraud Alert Dashboard UI",
                description="Interactive live-updating table of suspicious transactions with one-click block action.",
                module="Frontend UI", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
                estimated_hours=12.0, required_skills=["React", "TypeScript", "TailwindCSS"],
                status=AIPlanTaskStatus.PROPOSED,
            ),
            AIProjectPlanTask(
                plan_id=plan1.id, title="Docker Compose Multi-Container Deployment",
                description="Containerize fraud microservices, Redis instance, and background workers.",
                module="Infrastructure", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
                estimated_hours=8.0, required_skills=["Docker", "DevOps"],
                status=AIPlanTaskStatus.PROPOSED,
            ),
        ])

        # AI Plan Tasks for Plan 2
        db.add_all([
            AIProjectPlanTask(
                plan_id=plan2.id, title="WebSocket Realtime Collaboration Room",
                description="Establish bidirectional WebSocket channels for simultaneous document editing.",
                module="Realtime Engine", priority=TaskPriority.HIGH, complexity=TaskComplexity.HIGH,
                estimated_hours=20.0, required_skills=["TypeScript", "Next.js"],
                status=AIPlanTaskStatus.PROPOSED,
            ),
            AIProjectPlanTask(
                plan_id=plan2.id, title="Monaco Code Editor Integration & Syntax Highlighting",
                description="Embed web code editor with auto-completion and dark mode styling.",
                module="Frontend UI", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
                estimated_hours=16.0, required_skills=["React", "TailwindCSS", "UI/UX Design"],
                status=AIPlanTaskStatus.PROPOSED,
            ),
            AIProjectPlanTask(
                plan_id=plan2.id, title="Student Submission & Grading Schema",
                description="PostgreSQL tables for assignment runs, test case outcomes, and instructor notes.",
                module="Database", priority=TaskPriority.MEDIUM, complexity=TaskComplexity.MEDIUM,
                estimated_hours=12.0, required_skills=["PostgreSQL", "Database"],
                status=AIPlanTaskStatus.PROPOSED,
            ),
        ])
        db.commit()
        print(" [OK] Seeded 2 AI Project Plans and 7 AI Plan Tasks.")

        # =====================================================================
        # 9. GENERATE EXPLAINABLE RECOMMENDATIONS & AUDIT RECORDS
        # =====================================================================
        active_model = settings.RECOMMENDATION_MODEL
        print(f"[*] Step 9: Pre-generating Recommendations & Audits (Model: {active_model})...")
        for t in [t1, t2, t6, t7, t9]:
            generate_and_persist_task_recommendations(db, t.id, model_version=active_model)

        # Seed Recommendation Feedback, Outcomes, Label Validation & Snapshot
        recs = db.execute(select(Recommendation).where(Recommendation.task_id == t1.id)).scalars().all()
        if recs:
            top_rec = recs[0]
            # Recommendation Audit
            audit = RecommendationAudit(
                recommendation_id=top_rec.id,
                developer_id=top_rec.developer_id,
                task_id=t1.id,
                project_id=p_fintech.id,
                rank=top_rec.rank,
                recommendation_score=top_rec.score,
                model_name="deterministic_baseline",
                model_version=active_model,
                environment="production",
                feature_snapshot={
                    "weighted_skill_match_score": 92.5,
                    "skill_coverage_ratio": 1.0,
                    "dev_workload_score": 35.0,
                    "dev_experience_years": 6.0,
                    "dev_performance_score": 94.0,
                },
            )
            db.add(audit)
            db.commit()
            db.refresh(audit)

            # Feedback
            fb = RecommendationFeedback(
                recommendation_id=top_rec.id,
                reviewer_id=u_mgr.id,
                decision=FeedbackDecision.ACCEPTED,
                comment="Optimal skill match and balanced workload for webhook implementation.",
            )
            db.add(fb)

            # Outcome
            outcome = RecommendationOutcome(
                recommendation_id=top_rec.id,
                developer_id=top_rec.developer_id,
                task_id=t1.id,
                was_assigned=False,
                assignment_outcome_status=OutcomeStatus.RECOMMENDED,
                selected_by_user_id=u_mgr.id,
                selection_reason="Top scoring candidate with strong FastAPI expertise.",
            )
            db.add(outcome)

            # Label Validation
            val = RecommendationLabelValidation(
                recommendation_audit_id=audit.id,
                observation_id=f"obs-{top_rec.id}",
                proposed_research_label=1,
                label_status=LabelStatus.VALIDATED_LABEL,
                label_reason="Confirmed high fit based on comprehensive profile and availability.",
                validation_status=ValidationStatus.VALIDATED_POSITIVE,
                validator_id=u_admin.id,
                validation_reason="Expert domain validation approved.",
                validated_at=now_utc,
            )
            db.add(val)

            # Snapshot record
            snap = RecommendationDatasetSnapshot(
                dataset_version="realworld-v1.0",
                created_by_id=u_admin.id,
                source_observation_range="initial_demo_baseline",
                total_observations=15,
                labeled_observations=10,
                validated_labels=8,
                positive_labels=7,
                negative_labels=1,
                ambiguous_observations=2,
                feature_version="v2.0",
                label_methodology_version="suitability-v2",
                data_quality_status="PASS",
                snapshot_metadata={"source": "seed_demo_data", "active_model": active_model},
            )
            db.add(snap)
            db.commit()

        print(" [OK] Seeded Recommendations, Explanations, Audits, Outcomes & Dataset Snapshots.")

        print("\n=================================================================")
        print("  SUCCESS! DEMONSTRATION DATABASE SEEDED SUCCESSFULLY!")
        print("=================================================================")
        print("  Default Access Credentials:")
        print("    • Admin:     admin@devalign.ai   / admin123")
        print("    • Manager:   manager@devalign.ai / manager123")
        print("    • Manager 2: ops@devalign.ai     / manager123")
        print("    • Developer: alice@devalign.ai   / dev123")
        print("    • Developer: rahul@devalign.ai   / dev123")
        print("    • Developer: priya@devalign.ai   / dev123")
        print("    • Developer: david@devalign.ai   / dev123")
        print("=================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"\n[!] Error during reset/seed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_data()
