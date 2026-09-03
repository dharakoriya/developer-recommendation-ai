import os
import sys
import uuid
from decimal import Decimal
from datetime import datetime
from sqlalchemy import create_engine, text, select
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.models.enums import UserRole, AvailabilityStatus, TaskPriority, TaskComplexity, TaskStatus, AssignmentStatus
from app.models.project import Project, Team, TeamMember
from app.models.developer import DeveloperProfile, DeveloperSkill, WorkloadRecord
from app.models.skill import Skill
from app.models.task import Task, TaskSkill, Assignment

def reset_and_seed():
    db_url = settings.DATABASE_URL
    print("\n========================================================")
    print("DevAlign AI -- Controlled Test Environment Reset & Seed")
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
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("Step 1: Clearing existing non-research application data...")
        tables_to_clear = [
            "recommendation_explanations",
            "recommendations",
            "recommendation_outcomes",
            "recommendation_feedbacks",
            "recommendation_audits",
            "assignments",
            "task_skills",
            "tasks",
            "team_members",
            "teams",
            "projects",
            "developer_skills",
            "workload_records",
            "developer_profiles",
            "users",
            "skills",
        ]

        with engine.connect() as conn:
            trans = conn.begin()
            for tbl in tables_to_clear:
                conn.execute(text(f"TRUNCATE TABLE {tbl} CASCADE;"))
            trans.commit()
        print("[OK] Database tables cleared successfully (Alembic history preserved).\n")

        print("Step 2: Seeding core Skills catalog...")
        skill_names = ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker"]
        skills_map = {}
        for s_name in skill_names:
            sk = Skill(id=uuid.uuid4(), name=s_name, category="Engineering")
            session.add(sk)
            skills_map[s_name] = sk
        session.flush()
        print(f"[OK] Created {len(skills_map)} core skills.")

        print("Step 3: Seeding controlled Users & Developer profiles...")
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
        session.flush()

        # 3. Developer A — Alice Sharma (Backend Specialist, AVAILABLE)
        dev_a_user = User(
            id=uuid.uuid4(),
            name="Alice Sharma",
            email="alice@devalign.ai",
            password_hash=get_password_hash("dev123"),
            role=UserRole.DEVELOPER,
            is_active=True,
        )
        session.add(dev_a_user)
        session.flush()

        dev_a_prof = DeveloperProfile(
            id=uuid.uuid4(),
            user_id=dev_a_user.id,
            experience_years=Decimal("5.0"),
            performance_score=Decimal("90.0"),
            availability_status=AvailabilityStatus.AVAILABLE,
        )
        session.add(dev_a_prof)

        # 4. Developer B — Rahul Patel (Frontend Specialist, AVAILABLE)
        dev_b_user = User(
            id=uuid.uuid4(),
            name="Rahul Patel",
            email="rahul@devalign.ai",
            password_hash=get_password_hash("dev123"),
            role=UserRole.DEVELOPER,
            is_active=True,
        )
        session.add(dev_b_user)
        session.flush()

        dev_b_prof = DeveloperProfile(
            id=uuid.uuid4(),
            user_id=dev_b_user.id,
            experience_years=Decimal("4.0"),
            performance_score=Decimal("88.0"),
            availability_status=AvailabilityStatus.AVAILABLE,
        )
        session.add(dev_b_prof)

        # 5. Developer C — Priya Mehta (Full-stack Generalist, AVAILABLE)
        dev_c_user = User(
            id=uuid.uuid4(),
            name="Priya Mehta",
            email="priya@devalign.ai",
            password_hash=get_password_hash("dev123"),
            role=UserRole.DEVELOPER,
            is_active=True,
        )
        session.add(dev_c_user)
        session.flush()

        dev_c_prof = DeveloperProfile(
            id=uuid.uuid4(),
            user_id=dev_c_user.id,
            experience_years=Decimal("3.0"),
            performance_score=Decimal("82.0"),
            availability_status=AvailabilityStatus.AVAILABLE,
        )
        session.add(dev_c_prof)

        # 6. Developer D — David Wilson (Senior Expert, UNAVAILABLE)
        dev_d_user = User(
            id=uuid.uuid4(),
            name="David Wilson",
            email="david@devalign.ai",
            password_hash=get_password_hash("dev123"),
            role=UserRole.DEVELOPER,
            is_active=True,
        )
        session.add(dev_d_user)
        session.flush()

        dev_d_prof = DeveloperProfile(
            id=uuid.uuid4(),
            user_id=dev_d_user.id,
            experience_years=Decimal("7.0"),
            performance_score=Decimal("95.0"),
            availability_status=AvailabilityStatus.UNAVAILABLE,
        )
        session.add(dev_d_prof)
        session.flush()

        print("[OK] Created 6 users and 4 developer profiles.")

        print("Step 4: Seeding Developer Skill Proficiencies...")
        dev_skills_data = [
            # Alice Sharma (Backend Specialist)
            (dev_a_prof.id, "Python", 95.0),
            (dev_a_prof.id, "FastAPI", 90.0),
            (dev_a_prof.id, "PostgreSQL", 85.0),
            (dev_a_prof.id, "Docker", 75.0),

            # Rahul Patel (Frontend Specialist)
            (dev_b_prof.id, "React", 95.0),
            (dev_b_prof.id, "TypeScript", 90.0),
            (dev_b_prof.id, "PostgreSQL", 60.0),

            # Priya Mehta (Full-stack Generalist)
            (dev_c_prof.id, "Python", 75.0),
            (dev_c_prof.id, "React", 70.0),
            (dev_c_prof.id, "TypeScript", 70.0),
            (dev_c_prof.id, "Docker", 60.0),

            # David Wilson (Senior Expert, Unavailable)
            (dev_d_prof.id, "Python", 98.0),
            (dev_d_prof.id, "FastAPI", 95.0),
            (dev_d_prof.id, "PostgreSQL", 90.0),
            (dev_d_prof.id, "Docker", 90.0),
        ]

        for dev_id, skill_name, prof_val in dev_skills_data:
            ds = DeveloperSkill(
                id=uuid.uuid4(),
                developer_id=dev_id,
                skill_id=skills_map[skill_name].id,
                proficiency_level=Decimal(str(prof_val)),
            )
            session.add(ds)
        session.flush()
        print("[OK] Created 14 developer skill proficiencies.")

        print("Step 5: Seeding Projects & Teams...")
        proj_fintech = Project(
            id=uuid.uuid4(),
            name="FinTech Payment Platform",
            description="Core backend financial transaction and payment processing API service",
            status="ACTIVE",
            created_by=manager_user.id,
        )
        session.add(proj_fintech)

        proj_portal = Project(
            id=uuid.uuid4(),
            name="University Learning Portal",
            description="Student learning dashboard and course management application portal",
            status="ACTIVE",
            created_by=manager_user.id,
        )
        session.add(proj_portal)
        session.flush()

        team_payments = Team(
            id=uuid.uuid4(),
            project_id=proj_fintech.id,
            name="Core Payments Team",
            description="Backend payment processing engineering team",
        )
        session.add(team_payments)

        team_portal = Team(
            id=uuid.uuid4(),
            project_id=proj_portal.id,
            name="Portal Frontend Team",
            description="Frontend UI/UX and student portal team",
        )
        session.add(team_portal)
        session.flush()

        # Add Team Members
        tm1 = TeamMember(id=uuid.uuid4(), team_id=team_payments.id, developer_id=dev_a_prof.id)
        tm2 = TeamMember(id=uuid.uuid4(), team_id=team_payments.id, developer_id=dev_c_prof.id)
        tm3 = TeamMember(id=uuid.uuid4(), team_id=team_payments.id, developer_id=dev_d_prof.id)
        tm4 = TeamMember(id=uuid.uuid4(), team_id=team_portal.id, developer_id=dev_b_prof.id)
        tm5 = TeamMember(id=uuid.uuid4(), team_id=team_portal.id, developer_id=dev_c_prof.id)
        session.add_all([tm1, tm2, tm3, tm4, tm5])
        session.flush()
        print("[OK] Created 2 projects, 2 teams, and 5 team memberships.")

        print("Step 6: Seeding Controlled Tasks & Required Skills...")
        # Task 1: Backend API Task
        task1 = Task(
            id=uuid.uuid4(),
            project_id=proj_fintech.id,
            title="Build Payment Authentication API",
            description="Implement secure OAuth2 JWT token authentication API endpoint for payments",
            priority=TaskPriority.HIGH,
            complexity=TaskComplexity.HIGH,
            status=TaskStatus.TODO,
            estimated_hours=Decimal("16.0"),
            created_by=manager_user.id,
        )
        session.add(task1)
        session.flush()

        session.add_all([
            TaskSkill(id=uuid.uuid4(), task_id=task1.id, skill_id=skills_map["Python"].id, required_level=Decimal("80.0")),
            TaskSkill(id=uuid.uuid4(), task_id=task1.id, skill_id=skills_map["FastAPI"].id, required_level=Decimal("80.0")),
            TaskSkill(id=uuid.uuid4(), task_id=task1.id, skill_id=skills_map["PostgreSQL"].id, required_level=Decimal("75.0")),
        ])

        # Task 2: Frontend UI Task
        task2 = Task(
            id=uuid.uuid4(),
            project_id=proj_portal.id,
            title="Build Student Dashboard UI",
            description="Implement responsive student course dashboard with interactive schedule widgets",
            priority=TaskPriority.MEDIUM,
            complexity=TaskComplexity.MEDIUM,
            status=TaskStatus.TODO,
            estimated_hours=Decimal("12.0"),
            created_by=manager_user.id,
        )
        session.add(task2)
        session.flush()

        session.add_all([
            TaskSkill(id=uuid.uuid4(), task_id=task2.id, skill_id=skills_map["React"].id, required_level=Decimal("80.0")),
            TaskSkill(id=uuid.uuid4(), task_id=task2.id, skill_id=skills_map["TypeScript"].id, required_level=Decimal("80.0")),
        ])

        # Task 3: Mixed Full-Stack Task
        task3 = Task(
            id=uuid.uuid4(),
            project_id=proj_portal.id,
            title="Build Developer Activity Dashboard",
            description="Implement full-stack developer activity dashboard with Python analytics backend",
            priority=TaskPriority.MEDIUM,
            complexity=TaskComplexity.HIGH,
            status=TaskStatus.TODO,
            estimated_hours=Decimal("20.0"),
            created_by=manager_user.id,
        )
        session.add(task3)
        session.flush()

        session.add_all([
            TaskSkill(id=uuid.uuid4(), task_id=task3.id, skill_id=skills_map["React"].id, required_level=Decimal("70.0")),
            TaskSkill(id=uuid.uuid4(), task_id=task3.id, skill_id=skills_map["TypeScript"].id, required_level=Decimal("70.0")),
            TaskSkill(id=uuid.uuid4(), task_id=task3.id, skill_id=skills_map["Python"].id, required_level=Decimal("70.0")),
        ])

        # Task 4: Docker Container Task
        task4 = Task(
            id=uuid.uuid4(),
            project_id=proj_fintech.id,
            title="Containerize Payment API",
            description="Create Dockerfile and docker-compose orchestration for payment services",
            priority=TaskPriority.LOW,
            complexity=TaskComplexity.MEDIUM,
            status=TaskStatus.TODO,
            estimated_hours=Decimal("8.0"),
            created_by=manager_user.id,
        )
        session.add(task4)
        session.flush()

        session.add_all([
            TaskSkill(id=uuid.uuid4(), task_id=task4.id, skill_id=skills_map["Python"].id, required_level=Decimal("70.0")),
            TaskSkill(id=uuid.uuid4(), task_id=task4.id, skill_id=skills_map["Docker"].id, required_level=Decimal("75.0")),
        ])
        session.flush()
        print("[OK] Created 4 tasks with 10 task skill requirements.")

        print("Step 7: Seeding Controlled Assignments & Workload Records...")
        # Assign Task 1 to Alice Sharma (16h assigned -> 40% workload)
        task1.status = TaskStatus.IN_PROGRESS
        assign1 = Assignment(
            id=uuid.uuid4(),
            task_id=task1.id,
            developer_id=dev_a_prof.id,
            assigned_by=manager_user.id,
            status=AssignmentStatus.ACTIVE,
            notes="Assigned to Alice Sharma for payment API backend implementation",
        )
        session.add(assign1)

        # Assign Task 2 to Rahul Patel (12h assigned -> 30% workload)
        task2.status = TaskStatus.IN_PROGRESS
        assign2 = Assignment(
            id=uuid.uuid4(),
            task_id=task2.id,
            developer_id=dev_b_prof.id,
            assigned_by=manager_user.id,
            status=AssignmentStatus.ACTIVE,
            notes="Assigned to Rahul Patel for student dashboard frontend UI",
        )
        session.add(assign2)
        session.flush()

        # Seed initial Workload Records
        # Alice: 16h / 40h = 40.0%
        session.add(WorkloadRecord(
            id=uuid.uuid4(),
            developer_id=dev_a_prof.id,
            workload_score=Decimal("40.0"),
            active_task_count=1,
            estimated_hours=Decimal("16.0"),
            availability_factor=Decimal("1.0"),
        ))

        # Rahul: 12h / 40h = 30.0%
        session.add(WorkloadRecord(
            id=uuid.uuid4(),
            developer_id=dev_b_prof.id,
            workload_score=Decimal("30.0"),
            active_task_count=1,
            estimated_hours=Decimal("12.0"),
            availability_factor=Decimal("1.0"),
        ))

        # Priya: 0h / 40h = 0.0%
        session.add(WorkloadRecord(
            id=uuid.uuid4(),
            developer_id=dev_c_prof.id,
            workload_score=Decimal("0.0"),
            active_task_count=0,
            estimated_hours=Decimal("0.0"),
            availability_factor=Decimal("1.0"),
        ))

        # David: 0h / 40h = 0.0% (UNAVAILABLE)
        session.add(WorkloadRecord(
            id=uuid.uuid4(),
            developer_id=dev_d_prof.id,
            workload_score=Decimal("0.0"),
            active_task_count=0,
            estimated_hours=Decimal("0.0"),
            availability_factor=Decimal("0.05"),
        ))
        session.flush()
        session.commit()
        print("[OK] Created 2 active assignments and 4 workload records.")

        print("\n================ SEED VALIDATION SUMMARY ================")
        print(f"Users:              {session.query(User).count()} (1 Admin, 1 Manager, 4 Developers)")
        print(f"Developer Profiles: {session.query(DeveloperProfile).count()}")
        print(f"Skills Catalog:     {session.query(Skill).count()}")
        print(f"Projects:           {session.query(Project).count()}")
        print(f"Teams:              {session.query(Team).count()}")
        print(f"Tasks:              {session.query(Task).count()}")
        print(f"Assignments:        {session.query(Assignment).count()}")
        print("=========================================================\n")
        print("[SUCCESS] Controlled test environment reset & seed COMPLETED SUCCESSFULLY!")

    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] SEEDING FAILED WITH ERROR: {e}")
        raise e
    finally:
        session.close()

if __name__ == "__main__":
    reset_and_seed()
