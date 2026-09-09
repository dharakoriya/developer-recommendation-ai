import uuid
from typing import List, Dict, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, func, desc

from app.models.project import Project, Team, TeamMember
from app.models.task import Task, Assignment
from app.models.developer import DeveloperProfile, WorkloadRecord, DeveloperSkill
from app.models.user import User
from app.models.enums import TaskStatus, TaskPriority, TaskComplexity, AvailabilityStatus, AssignmentStatus
from app.models.performance import DeveloperStreak, DeveloperIncentiveLedger
from app.services.performance_service import calculate_developer_performance_metrics
from app.models.recommendation import Recommendation
from app.models.recommendation_audit import RecommendationFeedback
from app.schemas.analytics import (
    ProjectHealthMetrics,
    ProjectHealthOverviewResponse,
    TeamCapacityMetrics,
    WorkloadDistributionBreakdown,
    TeamProductivityMetrics,
    DeveloperComparisonItem,
    DeveloperComparisonResponse,
    TaskIntelligenceMetrics,
    TaskWeightDistributionBreakdown,
    RecommendationEffectivenessResponse,
)


def get_project_health_analytics(db: Session) -> ProjectHealthOverviewResponse:
    projects = db.execute(select(Project).options(joinedload(Project.tasks))).scalars().unique().all()
    
    project_metrics_list: List[ProjectHealthMetrics] = []
    
    for p in projects:
        tasks = p.tasks or []
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        unassigned_tasks = sum(1 for t in tasks if not t.assignments or t.status == TaskStatus.TODO)
        
        now = datetime.now(timezone.utc)
        overdue_tasks = 0
        for t in tasks:
            if t.status in [TaskStatus.TODO, TaskStatus.IN_PROGRESS] and t.deadline:
                t_deadline = t.deadline if t.deadline.tzinfo else t.deadline.replace(tzinfo=timezone.utc)
                if t_deadline < now:
                    overdue_tasks += 1
                
        # Get team members for project
        team_members_stmt = select(TeamMember).join(Team).where(Team.project_id == p.id)
        team_members = db.execute(team_members_stmt).scalars().all()
        dev_ids = list(set(tm.developer_id for tm in team_members if tm.developer_id))
        developer_count = len(dev_ids)
        
        # High risk workload count
        high_risk_count = 0
        if dev_ids:
            workload_stmt = select(WorkloadRecord).where(WorkloadRecord.developer_id.in_(dev_ids))
            workloads = db.execute(workload_stmt).scalars().all()
            high_risk_count = sum(1 for w in workloads if float(w.workload_score) > 75.0 or w.is_overloaded)

        # Calculate Project Health Score (0 - 100)
        # Factor 1: Completion Rate (30%)
        completion_pct = (completed_tasks / total_tasks * 100.0) if total_tasks > 0 else 100.0
        
        # Factor 2: Overdue Penalty (25%)
        overdue_pct = (overdue_tasks / total_tasks * 100.0) if total_tasks > 0 else 0.0
        overdue_factor = max(0.0, 100.0 - (overdue_pct * 2.0))
        
        # Factor 3: Unassigned Task Penalty (20%)
        unassigned_pct = (unassigned_tasks / total_tasks * 100.0) if total_tasks > 0 else 0.0
        unassigned_factor = max(0.0, 100.0 - (unassigned_pct * 1.5))
        
        # Factor 4: High Risk Workload Penalty (25%)
        workload_factor = max(0.0, 100.0 - (high_risk_count * 25.0))
        
        health_score = round(
            (completion_pct * 0.30) +
            (overdue_factor * 0.25) +
            (unassigned_factor * 0.20) +
            (workload_factor * 0.25),
            1
        )
        
        risk_factors: List[str] = []
        if overdue_tasks > 0:
            risk_factors.append(f"{overdue_tasks} task(s) past deadline")
        if unassigned_tasks > 0:
            risk_factors.append(f"{unassigned_tasks} unassigned task(s) in backlog")
        if high_risk_count > 0:
            risk_factors.append(f"{high_risk_count} developer(s) overloaded or at risk")
        if total_tasks == 0:
            risk_factors.append("No active tasks created for project")
            
        if health_score >= 85.0:
            status = "HEALTHY"
        elif health_score >= 60.0:
            status = "AT RISK"
        else:
            status = "CRITICAL"
            
        project_metrics_list.append(
            ProjectHealthMetrics(
                project_id=p.id,
                project_name=p.name,
                description=p.description,
                health_score=health_score,
                health_status=status,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                overdue_tasks=overdue_tasks,
                unassigned_tasks=unassigned_tasks,
                developer_count=developer_count,
                high_risk_workload_count=high_risk_count,
                risk_factors=risk_factors,
            )
        )
        
    avg_score = round(sum(pm.health_score for pm in project_metrics_list) / len(project_metrics_list), 1) if project_metrics_list else 100.0
    healthy_cnt = sum(1 for pm in project_metrics_list if pm.health_status == "HEALTHY")
    at_risk_cnt = sum(1 for pm in project_metrics_list if pm.health_status == "AT RISK")
    critical_cnt = sum(1 for pm in project_metrics_list if pm.health_status == "CRITICAL")
    
    return ProjectHealthOverviewResponse(
        overall_avg_health_score=avg_score,
        healthy_projects_count=healthy_cnt,
        at_risk_projects_count=at_risk_cnt,
        critical_projects_count=critical_cnt,
        projects=project_metrics_list,
    )


def get_team_capacity_analytics(db: Session) -> TeamCapacityMetrics:
    teams_count = db.scalar(select(func.count(Team.id))) or 0
    devs = db.execute(select(DeveloperProfile)).scalars().all()
    
    total_devs = len(devs)
    total_capacity = float(total_devs * 40.0)  # Standard 40 hrs/week per dev
    
    used_capacity = 0.0
    underutilized = 0
    balanced = 0
    high = 0
    overloaded = 0
    
    for d in devs:
        wl = db.scalar(
            select(WorkloadRecord)
            .where(WorkloadRecord.developer_id == d.id)
            .order_by(desc(WorkloadRecord.calculated_at))
        )
        hours = float(wl.estimated_hours) if wl and wl.estimated_hours is not None else 0.0
        score = float(wl.workload_score) if wl and wl.workload_score is not None else 0.0
        used_capacity += hours
        
        if hours < 15.0 or score < 30.0:
            underutilized += 1
        elif hours <= 35.0 and score <= 70.0:
            balanced += 1
        elif hours <= 45.0 and score <= 85.0:
            high += 1
        else:
            overloaded += 1
            
    avail_capacity = max(0.0, total_capacity - used_capacity)
    utilization_pct = round((used_capacity / total_capacity * 100.0), 1) if total_capacity > 0 else 0.0
    
    # Productivity metrics
    all_perf = [calculate_developer_performance_metrics(db, d.id) for d in devs]
    total_tasks_completed = sum(p["completed_tasks"] for p in all_perf)
    total_weighted = sum(float(p["weighted_productivity"]) for p in all_perf)
    avg_perf_score = round(sum(float(p["performance_score"]) for p in all_perf) / len(all_perf), 1) if all_perf else 0.0
    avg_comp_rate = round(sum(float(p["completion_rate"]) for p in all_perf) / len(all_perf), 1) if all_perf else 0.0
    
    return TeamCapacityMetrics(
        total_teams=teams_count,
        total_developers=total_devs,
        total_capacity_hours=total_capacity,
        used_capacity_hours=used_capacity,
        available_capacity_hours=avail_capacity,
        capacity_utilization_pct=utilization_pct,
        workload_distribution=WorkloadDistributionBreakdown(
            underutilized=underutilized,
            balanced=balanced,
            high_workload=high,
            overloaded=overloaded,
        ),
        team_productivity=TeamProductivityMetrics(
            tasks_completed=total_tasks_completed,
            weighted_tasks_completed=total_weighted,
            avg_performance_score=avg_perf_score,
            avg_completion_rate=avg_comp_rate,
        )
    )


def get_developer_comparison_matrix(db: Session, manager_user_id: Optional[uuid.UUID] = None) -> DeveloperComparisonResponse:
    stmt = select(DeveloperProfile).options(
        joinedload(DeveloperProfile.user),
        joinedload(DeveloperProfile.streak),
        joinedload(DeveloperProfile.developer_skills).joinedload(DeveloperSkill.skill),
    )
    
    devs = db.execute(stmt).scalars().unique().all()
    
    items: List[DeveloperComparisonItem] = []
    for d in devs:
        user_name = d.user.name if d.user else "Developer"
        email = d.user.email if d.user else ""
        
        perf = calculate_developer_performance_metrics(db, d.id)
        perf_score = float(perf["performance_score"])
        comp_rate = float(perf["completion_rate"])
        weighted_prod = float(perf["weighted_productivity"])
        
        wl = db.scalar(
            select(WorkloadRecord)
            .where(WorkloadRecord.developer_id == d.id)
            .order_by(desc(WorkloadRecord.calculated_at))
        )
        workload_score = float(wl.workload_score) if wl and wl.workload_score is not None else 0.0
        workload_hours = float(wl.estimated_hours) if wl and wl.estimated_hours is not None else 0.0
        exp_years = float(d.experience_years or 0.0)
        streak_rec = db.scalar(select(DeveloperStreak).where(DeveloperStreak.developer_id == d.id))
        streak = streak_rec.current_streak if streak_rec else 0
        
        ledger_pts = db.scalar(
            select(func.sum(DeveloperIncentiveLedger.total_points)).where(DeveloperIncentiveLedger.developer_id == d.id)
        ) or 0
        incentive_pts = int(ledger_pts)
        
        top_skills = [ds.skill.name for ds in (d.developer_skills or []) if ds and ds.skill][:4]
        avail = d.availability_status.value if d.availability_status else "AVAILABLE"
        
        items.append(
            DeveloperComparisonItem(
                developer_id=d.id,
                user_name=user_name,
                email=email,
                performance_score=perf_score,
                completion_rate=comp_rate,
                weighted_productivity=weighted_prod,
                current_workload_score=workload_score,
                current_workload_hours=workload_hours,
                experience_years=exp_years,
                current_streak=streak,
                incentive_points=incentive_pts,
                top_skills=top_skills,
                availability_status=avail,
            )
        )
        
    items.sort(key=lambda x: x.performance_score, reverse=True)
    return DeveloperComparisonResponse(total_developers=len(items), developers=items)


def get_task_intelligence_metrics(db: Session) -> TaskIntelligenceMetrics:
    tasks = db.execute(select(Task).options(joinedload(Task.project))).scalars().all()
    total_tasks = len(tasks)
    
    priority_dist: Dict[str, int] = {p.value: 0 for p in TaskPriority}
    complexity_dist: Dict[str, int] = {c.value: 0 for c in TaskComplexity}
    status_dist: Dict[str, int] = {s.value: 0 for s in TaskStatus}
    project_dist: Dict[str, int] = {}
    
    low_w, med_w, high_w, crit_w = 0, 0, 0, 0
    
    for t in tasks:
        p_val = t.priority.value if t.priority else "MEDIUM"
        c_val = t.complexity.value if t.complexity else "MEDIUM"
        s_val = t.status.value if t.status else "UNASSIGNED"
        proj_name = t.project.name if t.project else "Unassigned Project"
        
        priority_dist[p_val] = priority_dist.get(p_val, 0) + 1
        complexity_dist[c_val] = complexity_dist.get(c_val, 0) + 1
        status_dist[s_val] = status_dist.get(s_val, 0) + 1
        project_dist[proj_name] = project_dist.get(proj_name, 0) + 1
        
        w = float(t.task_weight_score or 30.0)
        if w < 20.0:
            low_w += 1
        elif w < 50.0:
            med_w += 1
        elif w < 75.0:
            high_w += 1
        else:
            crit_w += 1
            
    avg_est = round(sum(float(t.estimated_hours or 0.0) for t in tasks) / total_tasks, 1) if total_tasks > 0 else 0.0
    
    # Completed tasks actual time
    completed_assignments = db.execute(
        select(Assignment).options(joinedload(Assignment.task)).where(Assignment.status == AssignmentStatus.COMPLETED)
    ).scalars().all()
    
    actual_hours_list = []
    for a in completed_assignments:
        if a.completed_at and a.assigned_at:
            dur = (a.completed_at - a.assigned_at).total_seconds() / 3600.0
            actual_hours_list.append(round(dur, 1))
        elif a.task and a.task.estimated_hours:
            actual_hours_list.append(float(a.task.estimated_hours))
            
    avg_actual = round(sum(actual_hours_list) / len(actual_hours_list), 1) if actual_hours_list else avg_est
    
    # On time completions
    on_time_cnt = 0
    for a in completed_assignments:
        if a.completed_at and a.assigned_at:
            dur = (a.completed_at - a.assigned_at).total_seconds() / 3600.0
            est = float(a.task.estimated_hours) if (a.task and a.task.estimated_hours) else 24.0
            if dur <= (est * 1.25):
                on_time_cnt += 1
    on_time_rate = round((on_time_cnt / len(completed_assignments) * 100.0), 1) if completed_assignments else 100.0
    
    return TaskIntelligenceMetrics(
        total_tasks=total_tasks,
        priority_distribution=priority_dist,
        complexity_distribution=complexity_dist,
        status_distribution=status_dist,
        project_distribution=project_dist,
        weight_distribution=TaskWeightDistributionBreakdown(
            low_weight=low_w,
            medium_weight=med_w,
            high_weight=high_w,
            critical_weight=crit_w,
        ),
        avg_estimated_hours=avg_est,
        avg_actual_completion_hours=avg_actual,
        on_time_completion_rate=on_time_rate,
    )


def get_recommendation_effectiveness_funnel(db: Session) -> RecommendationEffectivenessResponse:
    recs_gen = db.scalar(select(func.count(Recommendation.id))) or 0
    fbs = db.execute(select(RecommendationFeedback)).scalars().all()
    
    accepted = sum(1 for fb in fbs if fb.decision == "ACCEPTED")
    rejected = sum(1 for fb in fbs if fb.decision == "REJECTED")
    
    assignments_created = db.scalar(select(func.count(Assignment.id))) or 0
    tasks_completed = db.scalar(select(func.count(Assignment.id)).where(Assignment.status == AssignmentStatus.COMPLETED)) or 0
    
    acceptance_rate = round((accepted / recs_gen * 100.0), 1) if recs_gen > 0 else 0.0
    assignment_conv = round((assignments_created / recs_gen * 100.0), 1) if recs_gen > 0 else 0.0
    completion_conv = round((tasks_completed / assignments_created * 100.0), 1) if assignments_created > 0 else 0.0
    
    has_sufficient = recs_gen >= 5
    message = "Real-world recommendation conversion funnel calculated successfully." if has_sufficient else "Insufficient recommendation history. Continue using the recommendation engine to accumulate observations."
    
    return RecommendationEffectivenessResponse(
        recommendations_generated=recs_gen,
        recommendations_accepted=accepted,
        recommendations_rejected=rejected,
        assignments_created=assignments_created,
        tasks_completed=tasks_completed,
        acceptance_rate=acceptance_rate,
        assignment_conversion_rate=assignment_conv,
        completion_conversion_rate=completion_conv,
        has_sufficient_data=has_sufficient,
        message=message,
    )
