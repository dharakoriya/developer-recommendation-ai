import uuid
from decimal import Decimal
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, delete

from app.models.developer import DeveloperProfile
from app.models.task import Task
from app.models.recommendation import Recommendation, RecommendationExplanation
from app.models.enums import ShapDirection
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


class RecommendationModel(ABC):
    @abstractmethod
    def get_model_metadata(self) -> ModelMetadataResponse:
        pass

    @abstractmethod
    def predict_candidate_score(
        self, vec: CandidateFeatureVector
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Returns (total_score_0_to_100, list_of_contributions)
        """
        pass


class BaselineRecommendationModel(RecommendationModel):
    def get_model_metadata(self) -> ModelMetadataResponse:
        return ModelMetadataResponse(
            model_type="deterministic_baseline",
            model_version="baseline-v1",
            training_required=False,
            training_dataset=None,
            validation_accuracy=None,
            description="Transparent deterministic weighted scoring model combining skill match, coverage, workload, performance, experience, and availability.",
        )

    def predict_candidate_score(
        self, vec: CandidateFeatureVector
    ) -> Tuple[float, List[Dict[str, Any]]]:
        # 1. Skill Match Contribution (35%)
        s_skill = min(100.0, max(0.0, vec.weighted_skill_match_score)) / 100.0
        c_skill = s_skill * 35.0

        # 2. Skill Coverage Contribution (15%)
        s_coverage = min(1.0, max(0.0, vec.skill_coverage_ratio))
        c_coverage = s_coverage * 15.0

        # 3. Workload Capacity Contribution (20%)
        if vec.dev_workload_score <= 100.0:
            s_workload = 1.0 - (vec.dev_workload_score / 100.0)
        else:
            s_workload = 0.0
        c_workload = max(0.0, s_workload) * 20.0

        # 4. Performance Rating Contribution (15%)
        s_perf = min(100.0, max(0.0, vec.dev_performance_score)) / 100.0
        c_perf = s_perf * 15.0

        # 5. Experience Contribution (10%)
        s_exp = min(10.0, max(0.0, vec.dev_experience_years)) / 10.0
        c_exp = s_exp * 10.0

        # 6. Availability Contribution (5%)
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

        return total_score, contributions


class MLRecommendationModelAdapter(RecommendationModel):
    """
    Pluggable adapter stub for future trained ML models (e.g. Random Forest / XGBoost).
    Active when supervised model artifacts exist.
    """

    def get_model_metadata(self) -> ModelMetadataResponse:
        return ModelMetadataResponse(
            model_type="ml_model_adapter",
            model_version="ml-v1-stub",
            training_required=True,
            training_dataset="devalign_recommendation_features.csv",
            validation_accuracy=None,
            description="Pluggable ML model adapter stub for future supervised models.",
        )

    def predict_candidate_score(
        self, vec: CandidateFeatureVector
    ) -> Tuple[float, List[Dict[str, Any]]]:
        # Delegates to baseline until ML model artifacts are loaded
        baseline = BaselineRecommendationModel()
        return baseline.predict_candidate_score(vec)


def get_active_recommendation_model() -> RecommendationModel:
    return BaselineRecommendationModel()


def generate_and_persist_task_recommendations(
    db: Session, task_id: uuid.UUID
) -> RecommendationListResponse:
    # 1. Query Task
    task_stmt = (
        select(Task)
        .options(joinedload(Task.project))
        .where(Task.id == task_id)
    )
    task = db.execute(task_stmt).scalar_one_or_none()
    if not task:
        raise ValueError(f"Task with ID {task_id} not found.")

    # 2. Extract Candidate Feature Vectors for all developers
    task_candidates = generate_task_candidate_features(db, task_id)
    candidates_vecs = task_candidates.candidates

    if not candidates_vecs:
        return RecommendationListResponse(
            task_id=task.id,
            task_title=task.title,
            project_id=task.project_id,
            project_name=task.project.name if task.project else "System Project",
            model_type="deterministic_baseline",
            model_version="baseline-v1",
            total_recommendations=0,
            recommendations=[],
        )

    model = get_active_recommendation_model()
    model_meta = model.get_model_metadata()

    # 3. Predict Scores for all candidates
    scored_candidates: List[Tuple[float, List[Dict[str, Any]], CandidateFeatureVector]] = []
    for vec in candidates_vecs:
        score, contribs = model.predict_candidate_score(vec)
        scored_candidates.append((score, contribs, vec))

    # 4. Sort by score descending
    scored_candidates.sort(key=lambda x: x[0], reverse=True)

    # 5. Delete previous recommendations for this task
    db.execute(delete(Recommendation).where(Recommendation.task_id == task_id))
    db.commit()

    # 6. Insert new Recommendations & Explanations into PostgreSQL
    rec_responses: List[RecommendationResponse] = []
    for rank_idx, (score, contribs, vec) in enumerate(scored_candidates, start=1):
        rec_orm = Recommendation(
            task_id=task_id,
            developer_id=vec.developer_id,
            model_version=model_meta.model_version,
            score=Decimal(str(score)),
            rank=rank_idx,
        )
        db.add(rec_orm)
        db.flush()

        explanation_responses: List[RecommendationExplanationResponse] = []
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

            explanation_responses.append(
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

        rec_responses.append(
            RecommendationResponse(
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
                created_at=rec_orm.created_at,
                explanations=explanation_responses,
            )
        )

    return RecommendationListResponse(
        task_id=task.id,
        task_title=task.title,
        project_id=task.project_id,
        project_name=task.project.name if task.project else "System Project",
        model_type=model_meta.model_type,
        model_version=model_meta.model_version,
        total_recommendations=len(rec_responses),
        recommendations=rec_responses,
    )


def get_persisted_task_recommendations(
    db: Session, task_id: uuid.UUID
) -> RecommendationListResponse:
    task_stmt = (
        select(Task)
        .options(joinedload(Task.project))
        .where(Task.id == task_id)
    )
    task = db.execute(task_stmt).scalar_one_or_none()
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

    if not recs:
        # If not persisted yet, generate dynamically
        return generate_and_persist_task_recommendations(db, task_id)

    model = get_active_recommendation_model()
    model_meta = model.get_model_metadata()

    rec_responses: List[RecommendationResponse] = []
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

        rec_responses.append(
            RecommendationResponse(
                id=r.id,
                task_id=r.task_id,
                developer_id=r.developer_id,
                developer_name=dev.user.name if dev and dev.user else "Unknown",
                developer_email=dev.user.email if dev and dev.user else "",
                experience_years=float(dev.experience_years) if dev else 0.0,
                availability_status=dev.availability_status if dev else AvailabilityStatus.AVAILABLE,
                workload_score=0.0,
                skill_coverage_ratio=0.0,
                performance_score=float(dev.performance_score) if dev else 0.0,
                model_version=r.model_version,
                score=float(r.score),
                rank=r.rank,
                created_at=r.created_at,
                explanations=exp_responses,
            )
        )

    return RecommendationListResponse(
        task_id=task.id,
        task_title=task.title,
        project_id=task.project_id,
        project_name=task.project.name if task.project else "System Project",
        model_type=model_meta.model_type,
        model_version=model_meta.model_version,
        total_recommendations=len(rec_responses),
        recommendations=rec_responses,
    )
