import uuid
import json
from decimal import Decimal
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, delete, update

from app.models.developer import DeveloperProfile
from app.models.task import Task
from app.models.recommendation import Recommendation, RecommendationExplanation
from app.models.enums import ShapDirection, AvailabilityStatus
from app.schemas.feature import CandidateFeatureVector
from app.schemas.recommendation import (
    ModelMetadataResponse,
    RecommendationExplanationResponse,
    RecommendationResponse,
    RecommendationListResponse,
)
from app.services.feature_engineering_service import (
    generate_task_candidate_features,
    extract_developer_task_feature_vector,
)
from app.services.task_weight_service import calculate_task_weight_score, get_task_weight_category
from app.services.task_developer_compatibility_service import evaluate_task_developer_compatibility


class RecommendationModel(ABC):
    @abstractmethod
    def get_model_metadata(self) -> ModelMetadataResponse:
        pass

    @abstractmethod
    def predict_candidate_score(
        self, vec: CandidateFeatureVector, task_weight_score: float = 50.0
    ) -> Tuple[float, List[Dict[str, Any]], str, List[str]]:
        """
        Returns (total_score_0_to_100, list_of_contributions, eligibility_status, exclusion_reasons)
        """
        pass


class BaselineRecommendationModel(RecommendationModel):
    """
    Legacy deterministic baseline recommendation model (baseline-v1).
    Preserved for historical reproduction and auditability.
    """

    def get_model_metadata(self) -> ModelMetadataResponse:
        return ModelMetadataResponse(
            model_type="deterministic_baseline",
            model_version="baseline-v1",
            training_required=False,
            training_dataset=None,
            validation_accuracy=None,
            description="Historical baseline model (v1) combining skill match (35%), coverage (15%), workload (20%), performance (15%), experience (10%), and availability (5%).",
        )

    def predict_candidate_score(
        self, vec: CandidateFeatureVector, task_weight_score: float = 50.0
    ) -> Tuple[float, List[Dict[str, Any]], str, List[str]]:
        s_skill = min(100.0, max(0.0, vec.weighted_skill_match_score)) / 100.0
        c_skill = s_skill * 35.0

        s_coverage = min(1.0, max(0.0, vec.skill_coverage_ratio))
        c_coverage = s_coverage * 15.0

        if vec.dev_workload_score <= 100.0:
            s_workload = 1.0 - (vec.dev_workload_score / 100.0)
        else:
            s_workload = 0.0
        c_workload = max(0.0, s_workload) * 20.0

        s_perf = min(100.0, max(0.0, vec.dev_performance_score)) / 100.0
        c_perf = s_perf * 15.0

        s_exp = min(10.0, max(0.0, vec.dev_experience_years)) / 10.0
        c_exp = s_exp * 10.0

        s_avail = min(1.0, max(0.0, vec.dev_availability_encoded))
        c_avail = s_avail * 5.0

        total_score = round(c_skill + c_coverage + c_workload + c_perf + c_exp + c_avail, 2)

        contributions = [
            {
                "feature_name": "weighted_skill_match_score",
                "feature_value": f"{vec.weighted_skill_match_score:.1f}%",
                "contribution_score": round(c_skill, 4),
                "direction": ShapDirection.POSITIVE if c_skill >= 17.5 else ShapDirection.NEGATIVE,
            },
            {
                "feature_name": "skill_coverage_ratio",
                "feature_value": f"{(vec.skill_coverage_ratio * 100):.1f}% ({vec.matching_skill_count}/{vec.task_required_skill_count})",
                "contribution_score": round(c_coverage, 4),
                "direction": ShapDirection.POSITIVE if c_coverage >= 7.5 else ShapDirection.NEGATIVE,
            },
            {
                "feature_name": "dev_workload_score",
                "feature_value": f"{vec.dev_workload_score:.1f}% ({vec.dev_workload_status})",
                "contribution_score": round(c_workload, 4),
                "direction": ShapDirection.POSITIVE if c_workload >= 10.0 else ShapDirection.NEGATIVE,
            },
            {
                "feature_name": "dev_performance_score",
                "feature_value": f"{vec.dev_performance_score:.1f} / 100",
                "contribution_score": round(c_perf, 4),
                "direction": ShapDirection.POSITIVE if c_perf >= 7.5 else ShapDirection.NEGATIVE,
            },
            {
                "feature_name": "dev_experience_years",
                "feature_value": f"{vec.dev_experience_years:.1f} yrs",
                "contribution_score": round(c_exp, 4),
                "direction": ShapDirection.POSITIVE if c_exp >= 5.0 else ShapDirection.NEGATIVE,
            },
            {
                "feature_name": "dev_availability_status",
                "feature_value": str(vec.dev_availability_status),
                "contribution_score": round(c_avail, 4),
                "direction": ShapDirection.POSITIVE if c_avail >= 2.5 else ShapDirection.NEGATIVE,
            },
        ]

        eligibility_status = "ELIGIBLE"
        exclusion_reasons = []
        if str(vec.dev_availability_status).upper() == "UNAVAILABLE":
            eligibility_status = "INELIGIBLE"
            exclusion_reasons.append("❌ Developer Currently Unavailable")
        elif vec.dev_workload_score > 100.0:
            eligibility_status = "INELIGIBLE"
            exclusion_reasons.append("❌ Workload Exceeds Capacity Limit")

        return total_score, contributions, eligibility_status, exclusion_reasons


class BaselineV2RecommendationModel(RecommendationModel):
    """
    Production-grade Intelligent Developer Recommendation Engine 2.0 (baseline-v2).
    Transparently combines Skill Proficiency Match (30%), Skill Coverage (15%), Workload & Anti-Monopoly (15%),
    Availability (10%), Experience (10%), Performance (10%), and Task Weight Compatibility (10%).
    """

    def get_model_metadata(self) -> ModelMetadataResponse:
        return ModelMetadataResponse(
            model_type="deterministic_baseline",
            model_version="baseline-v2",
            training_required=False,
            training_dataset=None,
            validation_accuracy=None,
            description="Production recommendation model 2.0 combining Skill Match (30%), Skill Coverage (15%), Workload & Anti-Monopoly (15%), Availability (10%), Experience (10%), Performance (10%), and Task Weight Compatibility (10%).",
        )

    def predict_candidate_score(
        self, vec: CandidateFeatureVector, task_weight_score: float = 50.0
    ) -> Tuple[float, List[Dict[str, Any]], str, List[str]]:
        compat = evaluate_task_developer_compatibility(vec, task_weight_score=task_weight_score)
        return (
            compat["final_score"],
            compat["contributions"],
            compat["eligibility_status"],
            compat["exclusion_reasons"],
        )


class MLRecommendationModelAdapter(RecommendationModel):
    """
    Research-only candidate ML recommendation model adapter (Random Forest / XGBoost).
    DO NOT USE IN PRODUCTION. Isolated for research benchmarking.
    """

    def get_model_metadata(self) -> ModelMetadataResponse:
        return ModelMetadataResponse(
            model_type="ml_model_adapter",
            model_version="ml-v1-rf-xgb",
            training_required=True,
            training_dataset="research/dataset/processed/train.csv",
            validation_accuracy=0.98,
            description="RESEARCH ONLY: Experimental candidate Random Forest / XGBoost ML model adapter.",
        )

    def predict_candidate_score(
        self, vec: CandidateFeatureVector, task_weight_score: float = 50.0
    ) -> Tuple[float, List[Dict[str, Any]], str, List[str]]:
        contributions = [
            {
                "feature_name": "research_ml_model",
                "feature_value": "RandomForest/XGBoost",
                "contribution_score": 85.0,
                "direction": ShapDirection.POSITIVE,
            }
        ]
        return 85.0, contributions, "ELIGIBLE", []



def get_active_recommendation_model(model_version: str = "baseline-v2") -> RecommendationModel:
    if model_version == "baseline-v1":
        return BaselineRecommendationModel()
    return BaselineV2RecommendationModel()


def invalidate_task_recommendations(db: Session, task_id: uuid.UUID) -> None:
    """
    Marks persisted recommendations for task_id as stale upon data changes.
    """
    db.execute(
        update(Recommendation)
        .where(Recommendation.task_id == task_id)
        .values(is_stale=True)
    )
    db.commit()


def invalidate_all_recommendations(db: Session) -> None:
    """
    Marks all recommendations in system as stale when global developer skills or workload change.
    """
    db.execute(update(Recommendation).values(is_stale=True))
    db.commit()


def generate_and_persist_task_recommendations(
    db: Session,
    task_id: uuid.UUID,
    model_version: str = "baseline-v2",
    min_performance_score: Optional[float] = None,
    min_completion_rate: Optional[float] = None,
    availability_status: Optional[str] = None,
    max_workload_score: Optional[float] = None,
    min_experience_years: Optional[float] = None,
    min_skill_match_pct: Optional[float] = None,
    min_streak: Optional[int] = None,
) -> RecommendationListResponse:
    # 1. Query Task & compute Task Weight Score
    task_stmt = (
        select(Task)
        .options(joinedload(Task.project), joinedload(Task.task_skills))
        .where(Task.id == task_id)
    )
    task = db.execute(task_stmt).unique().scalar_one_or_none()
    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    task_weight_score = (
        float(task.task_weight_score)
        if task.task_weight_score is not None
        else calculate_task_weight_score(task)
    )
    task_category = get_task_weight_category(task_weight_score)

    # 2. Extract Candidate Feature Vectors
    task_candidates = generate_task_candidate_features(db, task_id)
    candidates_vecs = task_candidates.candidates

    # Apply optional manager filters
    filtered_candidates: List[CandidateFeatureVector] = []
    for vec in candidates_vecs:
        if min_performance_score is not None and vec.dev_performance_score < min_performance_score:
            continue
        if min_completion_rate is not None and vec.dev_completion_rate < min_completion_rate:
            continue
        if availability_status is not None and str(vec.dev_availability_status).upper() != availability_status.upper():
            continue
        if max_workload_score is not None and vec.dev_workload_score > max_workload_score:
            continue
        if min_experience_years is not None and vec.dev_experience_years < min_experience_years:
            continue
        if min_skill_match_pct is not None and vec.weighted_skill_match_score < min_skill_match_pct:
            continue
        if min_streak is not None and vec.dev_current_streak < min_streak:
            continue
        filtered_candidates.append(vec)

    model = get_active_recommendation_model(model_version=model_version)
    model_meta = model.get_model_metadata()

    # 3. Predict Scores & Eligibility for candidate vectors
    eligible_scored = []
    excluded_scored = []

    for vec in filtered_candidates:
        score, contribs, eligibility, exclusion_reasons = model.predict_candidate_score(
            vec, task_weight_score=task_weight_score
        )
        item = (score, contribs, eligibility, exclusion_reasons, vec)
        if eligibility == "INELIGIBLE":
            excluded_scored.append(item)
        else:
            eligible_scored.append(item)

    # Sort eligible by score descending, then excluded by score descending
    eligible_scored.sort(key=lambda x: x[0], reverse=True)
    excluded_scored.sort(key=lambda x: x[0], reverse=True)

    all_scored = eligible_scored + excluded_scored

    # 4. Delete previous stored recommendations for task
    db.execute(delete(Recommendation).where(Recommendation.task_id == task_id))
    db.commit()

    # 5. Insert new Recommendations, Explanations & Audit Logs
    eligible_responses: List[RecommendationResponse] = []
    excluded_responses: List[RecommendationResponse] = []

    for rank_idx, (score, contribs, eligibility, exclusion_reasons, vec) in enumerate(all_scored, start=1):
        reasons_json = json.dumps(exclusion_reasons) if exclusion_reasons else None
        rec_orm = Recommendation(
            task_id=task_id,
            developer_id=vec.developer_id,
            model_version=model_meta.model_version,
            score=Decimal(str(score)),
            rank=rank_idx,
            eligibility_status=eligibility,
            exclusion_reasons=reasons_json,
            is_stale=False,
        )
        db.add(rec_orm)
        db.flush()

        exp_responses: List[RecommendationExplanationResponse] = []
        for c in contribs:
            exp_orm = RecommendationExplanation(
                recommendation_id=rec_orm.id,
                feature_name=c["feature_name"],
                feature_value=c["feature_value"],
                shap_value=Decimal(str(c["contribution_score"])),
                direction=c["direction"],
            )
            db.add(exp_orm)
            db.flush()
            exp_responses.append(
                RecommendationExplanationResponse(
                    id=exp_orm.id,
                    feature_name=exp_orm.feature_name,
                    feature_value=exp_orm.feature_value,
                    contribution_score=float(exp_orm.shap_value),
                    direction=exp_orm.direction,
                )
            )

        db.commit()
        db.refresh(rec_orm)

        # Record immutable recommendation audit log
        from app.services.outcome_dataset_service import record_recommendation_audit
        record_recommendation_audit(
            db=db,
            recommendation=rec_orm,
            feature_snapshot=vec.model_dump(),
            environment="production",
            model_name="deterministic_baseline",
        )

        resp = RecommendationResponse(
            id=rec_orm.id,
            task_id=rec_orm.task_id,
            developer_id=rec_orm.developer_id,
            developer_name=vec.user_name,
            developer_email=vec.user_email,
            experience_years=vec.dev_experience_years,
            availability_status=vec.dev_availability_status,
            workload_score=vec.dev_workload_score,
            skill_coverage_ratio=vec.skill_coverage_ratio,
            performance_score=vec.dev_performance_score,
            model_version=rec_orm.model_version,
            score=float(rec_orm.score),
            rank=rec_orm.rank,
            eligibility_status=eligibility,
            exclusion_reasons=exclusion_reasons,
            task_weight_score=task_weight_score,
            task_weight_category=task_category,
            is_stale=False,
            created_at=rec_orm.created_at,
            explanations=exp_responses,
        )

        if eligibility == "INELIGIBLE":
            excluded_responses.append(resp)
        else:
            eligible_responses.append(resp)

    return RecommendationListResponse(
        task_id=task.id,
        task_title=task.title,
        project_id=task.project_id,
        project_name=task.project.name if task.project else "System Project",
        model_type=model_meta.model_type,
        model_version=model_meta.model_version,
        freshness_status="FRESH",
        total_recommendations=len(eligible_responses),
        recommendations=eligible_responses,
        excluded_recommendations=excluded_responses,
    )


def get_persisted_task_recommendations(
    db: Session, task_id: uuid.UUID
) -> RecommendationListResponse:
    task_stmt = (
        select(Task)
        .options(joinedload(Task.project), joinedload(Task.task_skills))
        .where(Task.id == task_id)
    )
    task = db.execute(task_stmt).unique().scalar_one_or_none()
    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    recs_stmt = (
        select(Recommendation)
        .options(
            joinedload(Recommendation.developer_profile).joinedload(DeveloperProfile.user),
            joinedload(Recommendation.explanations),
        )
        .where(Recommendation.task_id == task_id)
        .order_by(Recommendation.rank.asc())
    )
    recs = db.execute(recs_stmt).unique().scalars().all()

    # Check if recommendations missing or marked stale
    if not recs or any(r.is_stale for r in recs):
        return generate_and_persist_task_recommendations(db, task_id, model_version="baseline-v2")

    model = get_active_recommendation_model(model_version=recs[0].model_version)
    model_meta = model.get_model_metadata()

    task_weight_score = (
        float(task.task_weight_score)
        if task.task_weight_score is not None
        else calculate_task_weight_score(task)
    )
    task_category = get_task_weight_category(task_weight_score)

    eligible_responses: List[RecommendationResponse] = []
    excluded_responses: List[RecommendationResponse] = []

    for r in recs:
        dev = r.developer_profile
        exp_responses = [
            RecommendationExplanationResponse(
                id=e.id,
                feature_name=e.feature_name,
                feature_value=e.feature_value,
                contribution_score=float(e.shap_value),
                direction=e.direction,
            )
            for e in (r.explanations or [])
        ]

        try:
            vec = extract_developer_task_feature_vector(db, r.developer_id, r.task_id)
            workload_val = float(vec.dev_workload_score)
            coverage_val = float(vec.skill_coverage_ratio)
        except Exception:
            workload_val = 0.0
            coverage_val = 1.0

        exclusion_reasons = []
        if r.exclusion_reasons:
            try:
                exclusion_reasons = json.loads(r.exclusion_reasons)
            except Exception:
                exclusion_reasons = [r.exclusion_reasons]

        resp = RecommendationResponse(
            id=r.id,
            task_id=r.task_id,
            developer_id=r.developer_id,
            developer_name=dev.user.name if dev and dev.user else "Unknown",
            developer_email=dev.user.email if dev and dev.user else "",
            experience_years=float(dev.experience_years) if dev else 0.0,
            availability_status=dev.availability_status if dev else AvailabilityStatus.AVAILABLE,
            workload_score=workload_val,
            skill_coverage_ratio=coverage_val,
            performance_score=float(dev.performance_score) if dev else 0.0,
            model_version=r.model_version,
            score=float(r.score),
            rank=r.rank,
            eligibility_status=r.eligibility_status or "ELIGIBLE",
            exclusion_reasons=exclusion_reasons,
            task_weight_score=task_weight_score,
            task_weight_category=task_category,
            is_stale=r.is_stale,
            created_at=r.created_at,
            explanations=exp_responses,
        )

        if r.eligibility_status == "INELIGIBLE":
            excluded_responses.append(resp)
        else:
            eligible_responses.append(resp)

    return RecommendationListResponse(
        task_id=task.id,
        task_title=task.title,
        project_id=task.project_id,
        project_name=task.project.name if task.project else "System Project",
        model_type=model_meta.model_type,
        model_version=model_meta.model_version,
        freshness_status="FRESH",
        total_recommendations=len(eligible_responses),
        recommendations=eligible_responses,
        excluded_recommendations=excluded_responses,
    )


def invalidate_task_recommendations(db: Session, task_id: uuid.UUID) -> int:
    """
    Marks all cached recommendations for a specific task as stale.
    """
    stmt = update(Recommendation).where(Recommendation.task_id == task_id).values(is_stale=True)
    res = db.execute(stmt)
    db.commit()
    return res.rowcount


def invalidate_all_recommendations(db: Session) -> int:
    """
    Marks all cached recommendations in the system as stale.
    """
    stmt = update(Recommendation).values(is_stale=True)
    res = db.execute(stmt)
    db.commit()
    return res.rowcount

