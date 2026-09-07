import pytest
from app.schemas.feature import CandidateFeatureVector
from app.services.recommendation_service import (
    BaselineRecommendationModel,
    BaselineV11RecommendationModel,
    get_active_recommendation_model,
)


def test_baseline_v11_model_metadata():
    model = BaselineV11RecommendationModel()
    meta = model.get_model_metadata()
    assert meta.model_version == "baseline-v1.1"
    assert meta.model_type == "deterministic_baseline"


def test_get_active_recommendation_model_selection():
    m1 = get_active_recommendation_model("baseline-v1")
    assert m1.get_model_metadata().model_version == "baseline-v1"

    m11 = get_active_recommendation_model("baseline-v1.1")
    assert m11.get_model_metadata().model_version == "baseline-v1.1"


def test_baseline_v11_score_calculation():
    vec = CandidateFeatureVector(
        developer_id="11111111-1111-1111-1111-111111111111",
        user_name="Test Dev",
        user_email="test@dev.com",
        task_id="22222222-2222-2222-2222-222222222222",
        task_title="Test Task",
        project_id="33333333-3333-3333-3333-333333333333",
        project_name="Test Project",
        dev_experience_years=5.0,
        dev_availability_status="AVAILABLE",
        dev_availability_encoded=1.0,
        dev_performance_score=90.0,
        dev_total_skills_count=4,
        dev_workload_score=20.0,
        dev_capacity_hours=40.0,
        dev_active_task_count=1,
        dev_workload_status="AVAILABLE",
        dev_workload_status_encoded=0,
        dev_completion_rate=100.0,
        dev_on_time_rate=100.0,
        dev_weighted_productivity=120.0,
        dev_current_streak=5,
        task_estimated_hours=10.0,
        task_complexity="MEDIUM",
        task_complexity_encoded=2,
        task_priority="HIGH",
        task_priority_encoded=3,
        task_status="TODO",
        task_required_skill_count=2,
        task_weight_score=60.0,
        matching_skill_count=2,
        skill_coverage_ratio=1.0,
        avg_required_level=80.0,
        avg_developer_level=85.0,
        avg_proficiency_gap=5.0,
        min_proficiency_gap=0.0,
        weighted_skill_match_score=100.0,
        is_historically_assigned=0,
    )

    model = BaselineV11RecommendationModel()
    score, contribs = model.predict_candidate_score(vec)

    assert 0.0 <= score <= 100.0
    assert len(contribs) == 7
    feature_names = [c["feature_name"] for c in contribs]
    assert "productivity_and_streak" in feature_names
