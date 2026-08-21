import uuid
import random
from typing import List, Dict, Any

AVAILABILITY_OPTIONS = ["AVAILABLE", "PARTIAL", "UNAVAILABLE"]
AVAILABILITY_ENCODING = {"AVAILABLE": 1.0, "PARTIAL": 0.5, "UNAVAILABLE": 0.0}

WORKLOAD_STATUS_ENCODING = {"AVAILABLE": 0, "BALANCED": 1, "HIGH": 2, "OVERLOADED": 3}
COMPLEXITY_ENCODING = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
PRIORITY_ENCODING = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

SKILL_CATALOG = [
    "Python", "FastAPI", "React", "TypeScript", "PostgreSQL",
    "Docker", "AWS", "GraphQL", "Redis", "TailwindCSS"
]


def generate_synthetic_dataset(
    num_developers: int = 50,
    num_tasks: int = 30,
    random_seed: int = 42,
) -> List[Dict[str, Any]]:
    """
    Generates reproducible synthetic candidate pair feature vectors (Developer, Task).
    Follows exact Milestone 8 feature inventory and domain constraints.
    """
    rng = random.Random(random_seed)

    # 1. Generate Synthetic Developers
    developers = []
    for i in range(1, num_developers + 1):
        dev_id = str(uuid.UUID(int=i * 1000 + random_seed))
        availability = rng.choice(AVAILABILITY_OPTIONS)
        capacity = 40.0 if availability == "AVAILABLE" else 20.0 if availability == "PARTIAL" else 2.0
        exp_years = round(rng.uniform(0.5, 15.0), 1)
        perf_score = round(rng.uniform(55.0, 98.0), 1)

        # Workload (0% to 120%)
        active_tasks = rng.randint(0, 4)
        est_hours = round(active_tasks * rng.uniform(5.0, 12.0), 1)
        workload_score = round((est_hours / capacity) * 100.0, 1)

        if workload_score < 50.0:
            wl_status = "AVAILABLE"
        elif 50.0 <= workload_score <= 80.0:
            wl_status = "BALANCED"
        elif 80.0 < workload_score <= 100.0:
            wl_status = "HIGH"
        else:
            wl_status = "OVERLOADED"

        # Developer Skills subset (3 to 7 skills)
        num_dev_skills = rng.randint(3, 7)
        dev_skills_names = rng.sample(SKILL_CATALOG, num_dev_skills)
        dev_skills = {name: round(rng.uniform(30.0, 95.0), 1) for name in dev_skills_names}

        developers.append({
            "developer_id": dev_id,
            "user_name": f"Synthetic Dev {i}",
            "user_email": f"synth_dev_{i}@devalign.research",
            "dev_experience_years": exp_years,
            "dev_availability_status": availability,
            "dev_availability_encoded": AVAILABILITY_ENCODING[availability],
            "dev_performance_score": perf_score,
            "dev_total_skills_count": num_dev_skills,
            "dev_workload_score": workload_score,
            "dev_capacity_hours": capacity,
            "dev_active_task_count": active_tasks,
            "dev_workload_status": wl_status,
            "dev_workload_status_encoded": WORKLOAD_STATUS_ENCODING[wl_status],
            "skills": dev_skills,
        })

    # 2. Generate Synthetic Tasks
    tasks = []
    for j in range(1, num_tasks + 1):
        task_id = str(uuid.UUID(int=j * 5000 + random_seed))
        proj_id = str(uuid.UUID(int=(j % 5 + 1) * 10000 + random_seed))
        complexity = rng.choice(["LOW", "MEDIUM", "HIGH"])
        priority = rng.choice(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
        est_hours = round(rng.uniform(4.0, 60.0), 1)

        num_req_skills = rng.randint(1, 4)
        req_skill_names = rng.sample(SKILL_CATALOG, num_req_skills)
        req_skills = {name: round(rng.uniform(50.0, 90.0), 1) for name in req_skill_names}

        tasks.append({
            "task_id": task_id,
            "task_title": f"Synthetic Task {j}",
            "project_id": proj_id,
            "project_name": f"Synthetic Project {(j % 5 + 1)}",
            "task_estimated_hours": est_hours,
            "task_complexity": complexity,
            "task_complexity_encoded": COMPLEXITY_ENCODING[complexity],
            "task_priority": priority,
            "task_priority_encoded": PRIORITY_ENCODING[priority],
            "task_status": "TODO",
            "task_required_skill_count": num_req_skills,
            "req_skills": req_skills,
        })

    # 3. Generate Candidate Pair Feature Vectors (num_developers * num_tasks)
    rows = []
    for t in tasks:
        for d in developers:
            req_skills = t["req_skills"]
            dev_skills = d["skills"]

            task_req_count = t["task_required_skill_count"]
            matching_count = 0
            gaps = []
            dev_levels = []
            req_levels = []
            level_ratios = []

            for sk_name, req_lvl in req_skills.items():
                req_levels.append(req_lvl)
                dev_lvl = dev_skills.get(sk_name, 0.0)
                dev_levels.append(dev_lvl)

                if sk_name in dev_skills:
                    matching_count += 1

                gap = dev_lvl - req_lvl
                gaps.append(gap)

                ratio = min(1.0, dev_lvl / req_lvl) if req_lvl > 0 else 1.0
                level_ratios.append(ratio)

            coverage_ratio = round(matching_count / task_req_count, 4) if task_req_count > 0 else 1.0
            avg_req_lvl = round(sum(req_levels) / task_req_count, 2) if task_req_count > 0 else 0.0
            avg_dev_lvl = round(sum(dev_levels) / task_req_count, 2) if task_req_count > 0 else 0.0
            avg_gap = round(sum(gaps) / task_req_count, 2) if task_req_count > 0 else 0.0
            min_gap = round(min(gaps), 2) if task_req_count > 0 else 0.0
            weighted_match = round((sum(level_ratios) / task_req_count) * 100.0, 2) if task_req_count > 0 else 100.0

            # Observational historical assignment flag (random probability for research synthetic data)
            is_assigned = 1 if rng.random() < 0.05 else 0

            row = {
                "developer_id": d["developer_id"],
                "user_name": d["user_name"],
                "user_email": d["user_email"],
                "task_id": t["task_id"],
                "task_title": t["task_title"],
                "project_id": t["project_id"],
                "project_name": t["project_name"],

                # Developer Features
                "dev_experience_years": d["dev_experience_years"],
                "dev_availability_status": d["dev_availability_status"],
                "dev_availability_encoded": d["dev_availability_encoded"],
                "dev_performance_score": d["dev_performance_score"],
                "dev_total_skills_count": d["dev_total_skills_count"],
                "dev_workload_score": d["dev_workload_score"],
                "dev_capacity_hours": d["dev_capacity_hours"],
                "dev_active_task_count": d["dev_active_task_count"],
                "dev_workload_status": d["dev_workload_status"],
                "dev_workload_status_encoded": d["dev_workload_status_encoded"],

                # Task Features
                "task_estimated_hours": t["task_estimated_hours"],
                "task_complexity": t["task_complexity"],
                "task_complexity_encoded": t["task_complexity_encoded"],
                "task_priority": t["task_priority"],
                "task_priority_encoded": t["task_priority_encoded"],
                "task_status": t["task_status"],
                "task_required_skill_count": t["task_required_skill_count"],

                # Skill Match Features
                "matching_skill_count": matching_count,
                "skill_coverage_ratio": coverage_ratio,
                "avg_required_level": avg_req_lvl,
                "avg_developer_level": avg_dev_lvl,
                "avg_proficiency_gap": avg_gap,
                "min_proficiency_gap": min_gap,
                "weighted_skill_match_score": weighted_match,

                # Observational Flag
                "is_historically_assigned": is_assigned,
            }
            rows.append(row)

    return rows
