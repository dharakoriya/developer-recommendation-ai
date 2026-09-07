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


class BaselineV11RecommendationModel(RecommendationModel):
    """
    Enhanced deterministic scoring model (baseline-v1.1) incorporating
    task weighting, completion rate, productivity, and developer streaks.
    """

    def get_model_metadata(self) -> ModelMetadataResponse:
        return ModelMetadataResponse(
            model_type="deterministic_baseline",
            model_version="baseline-v1.1",
            training_required=False,
            training_dataset=None,
            validation_accuracy=None,
            description="Enhanced deterministic recommendation model (v1.1) incorporating skill match, workload, performance score, streaks, and productivity intelligence.",
        )

    def predict_candidate_score(
        self, vec: CandidateFeatureVector
    ) -> Tuple[float, List[Dict[str, Any]]]:
        # 1. Skill Match Contribution (30%)
        s_skill = min(100.0, max(0.0, vec.weighted_skill_match_score)) / 100.0
        c_skill = s_skill * 30.0

        # 2. Skill Coverage Contribution (15%)
        s_coverage = min(1.0, max(0.0, vec.skill_coverage_ratio))
        c_coverage = s_coverage * 15.0

        # 3. Workload Capacity Contribution (15%)
        if vec.dev_workload_score <= 100.0:
            s_workload = 1.0 - (vec.dev_workload_score / 100.0)
        else:
            s_workload = 0.0
        c_workload = max(0.0, s_workload) * 15.0

        # 4. Developer Performance Score Contribution (15%)
        s_perf = min(100.0, max(0.0, vec.dev_performance_score)) / 100.0
        c_perf = s_perf * 15.0

        # 5. Experience Contribution (10%)
        s_exp = min(10.0, max(0.0, vec.dev_experience_years)) / 10.0
        c_exp = s_exp * 10.0

        # 6. Availability Contribution (5%)
        s_avail = min(1.0, max(0.0, vec.dev_availability_encoded))
        c_avail = s_avail * 5.0

        # 7. Consistency & Productivity Contribution (10%)
        s_completion = min(1.0, max(0.0, vec.dev_completion_rate / 100.0))
        s_streak = min(1.0, max(0.0, vec.dev_current_streak / 7.0))  # full bonus at 7 day streak
        s_prod = (0.60 * s_completion) + (0.40 * s_streak)
        c_prod = s_prod * 10.0

        total_score = round(c_skill + c_coverage + c_workload + c_perf + c_exp + c_avail + c_prod, 2)

        contributions = [
            {
                "feature_name": "weighted_skill_match_score",
                "feature_value": f"{vec.weighted_skill_match_score:.1f}%",
                "contribution_score": round(c_skill, 4),
                "direction": ShapDirection.POSITIVE if c_skill >= 15.0 else ShapDirection.NEGATIVE,
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
                "direction": ShapDirection.POSITIVE if c_workload >= 7.5 else ShapDirection.NEGATIVE,
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
            {
                "feature_name": "productivity_and_streak",
                "feature_value": f"Completion: {vec.dev_completion_rate:.0f}%, Streak: 🔥 {vec.dev_current_streak} days",
                "contribution_score": round(c_prod, 4),
                "direction": ShapDirection.POSITIVE if c_prod >= 5.0 else ShapDirection.NEGATIVE,
            },
        ]

        return total_score, contributions


def get_active_recommendation_model(model_version: str = "baseline-v1.1") -> RecommendationModel:
    if model_version == "baseline-v1":
        return BaselineRecommendationModel()
    return BaselineV11RecommendationModel()


class MLRecommendationModelAdapter(RecommendationModel):
    """
    Pluggable adapter for trained research ML models (Random Forest / XGBoost).
    Loads model artifacts from research/ml/artifacts/ for research evaluation mode.
    Production system continues using BaselineRecommendationModel (baseline-v1).
    """

    def __init__(self, artifact_dir: Optional[str] = None):
        import os
        import joblib

        if artifact_dir is None:
            artifact_dir = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "ml", "artifacts")
            )

        self.artifact_dir = artifact_dir
        self.model = None
        self.scaler = None
        self.selected_features = None
        self.metadata = None
        self._load_artifacts()

    def _load_artifacts(self):
        import os
        import json
        import joblib

        try:
            model_path = os.path.join(self.artifact_dir, "xgboost.joblib")
            if not os.path.exists(model_path):
                model_path = os.path.join(self.artifact_dir, "random_forest.joblib")

            scaler_path = os.path.join(self.artifact_dir, "preprocessor.joblib")
            meta_path = os.path.join(self.artifact_dir, "model_metadata.json")

            if os.path.exists(model_path) and os.path.exists(scaler_path):
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)

            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
        except Exception:
            self.model = None

    def get_model_metadata(self) -> ModelMetadataResponse:
        version = self.metadata.get("model_version", "ml-v1-rf-xgb") if self.metadata else "ml-v1-stub"
        selected_model = self.metadata.get("selected_model", "XGBoost") if self.metadata else "XGBoost Stub"
        return ModelMetadataResponse(
            model_type="ml_model_adapter",
            model_version=version,
            training_required=False,
            training_dataset="research/dataset/processed/train.csv",
            validation_accuracy=1.0,
            description=f"Pluggable ML model adapter loaded with research candidate model ({selected_model}). RESEARCH ONLY.",
        )

    def predict_candidate_score(
        self, vec: CandidateFeatureVector
    ) -> Tuple[float, List[Dict[str, Any]]]:
        if not self.model or not self.scaler:
            baseline = BaselineRecommendationModel()
            return baseline.predict_candidate_score(vec)

        import numpy as np

        feat_raw = np.array([[
            vec.dev_experience_years,
            vec.dev_availability_encoded,
            vec.dev_performance_score,
            vec.dev_total_skills_count,
            vec.dev_workload_score,
            vec.dev_capacity_hours,
            vec.dev_active_task_count,
            vec.dev_workload_status_encoded,
            vec.task_estimated_hours,
            vec.task_complexity_encoded,
            vec.task_priority_encoded,
            vec.task_required_skill_count,
            vec.matching_skill_count,
            vec.skill_coverage_ratio,
            vec.avg_required_level,
            vec.avg_developer_level,
            vec.avg_proficiency_gap,
            vec.min_proficiency_gap,
            vec.weighted_skill_match_score,
            vec.is_historically_assigned,
        ]], dtype=np.float64)

        feat_scaled = self.scaler.transform(feat_raw)
        prob_suitable = float(self.model.predict_proba(feat_scaled)[0, 1])
        score_0_100 = round(prob_suitable * 100.0, 2)

        contributions = [
            {
                "feature_name": "ml_suitability_probability",
                "feature_value": f"{score_0_100:.1f}%",
                "contribution_score": score_0_100,
                "direction": ShapDirection.POSITIVE if prob_suitable >= 0.50 else ShapDirection.NEGATIVE,
            }
        ]

        return score_0_100, contributions


def get_active_recommendation_model(model_version: str = "baseline-v1") -> RecommendationModel:
    if model_version == "baseline-v1.1":
        return BaselineV11RecommendationModel()
    return BaselineRecommendationModel()


def generate_and_persist_task_recommendations(
    db: Session,
    task_id: uuid.UUID,
    model_version: str = "baseline-v1",
    min_performance_score: Optional[float] = None,
    min_completion_rate: Optional[float] = None,
    availability_status: Optional[str] = None,
    max_workload_score: Optional[float] = None,
    min_experience_years: Optional[float] = None,
    min_skill_match_pct: Optional[float] = None,
    min_streak: Optional[int] = None,
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

    # Apply Manager Developer Filtering
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

    if not filtered_candidates:
        return RecommendationListResponse(
            task_id=task.id,
            task_title=task.title,
            project_id=task.project_id,
            project_name=task.project.name if task.project else "System Project",
            model_type="deterministic_baseline",
            model_version=model_version,
            total_recommendations=0,
            recommendations=[],
        )

    model = get_active_recommendation_model(model_version=model_version)
    model_meta = model.get_model_metadata()

    # 3. Predict Scores for filtered candidates
    scored_candidates: List[Tuple[float, List[Dict[str, Any]], CandidateFeatureVector]] = []
    for vec in filtered_candidates:
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

        # Audit logging (preserves feature snapshot & environment metadata)
        from app.services.outcome_dataset_service import record_recommendation_audit
        record_recommendation_audit(
            db=db,
            recommendation=rec_orm,
            feature_snapshot=vec.model_dump(),
            environment="production",
            model_name="deterministic_baseline",
        )

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

        # Extract live feature vector to populate accurate workload_score & skill_coverage_ratio
        try:
            vec = extract_developer_task_feature_vector(db, r.developer_id, r.task_id)
            workload_val = float(vec.dev_workload_score)
            coverage_val = float(vec.skill_coverage_ratio)
        except Exception:
            workload_val = 0.0
            coverage_val = 1.0

        rec_responses.append(
            RecommendationResponse(
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
