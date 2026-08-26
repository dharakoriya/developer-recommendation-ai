import os
import sys
import pytest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from research.ml.explainability.shap_explainer import SHAPExplainerManager
from research.ml.explainability.global_explanation import generate_global_shap_importance
from research.ml.explainability.local_explanation import generate_local_shap_explanation
from app.services.ml_explainability_service import get_global_shap_explanations


@pytest.fixture
def artifacts_dir():
    return os.path.join(PROJECT_ROOT, "research", "ml", "artifacts")


def test_shap_explainer_initialization(artifacts_dir):
    manager = SHAPExplainerManager(artifacts_dir=artifacts_dir)
    assert manager.model is not None
    assert manager.scaler is not None
    assert manager.explainer is not None
    assert len(manager.selected_features) == 20


def test_global_shap_importance_generation(artifacts_dir):
    global_features = generate_global_shap_importance(artifacts_dir=artifacts_dir)
    assert len(global_features) == 20
    assert global_features[0]["rank"] == 1
    assert global_features[0]["mean_abs_shap"] >= global_features[1]["mean_abs_shap"]

    # Verify JSON file structure
    json_data = get_global_shap_explanations()
    assert json_data["environment"] == "research"
    assert json_data["model_version"] == "ml-v1-rf-xgb"
    assert json_data["dataset_version"] == "synthetic-v1"
    assert len(json_data["global_feature_importance"]) == 20


def test_local_shap_explanation_generation(artifacts_dir):
    dummy_feat_dict = {
        "developer_id": "00000000-0000-0000-0000-000000000001",
        "task_id": "00000000-0000-0000-0000-000000000002",
        "user_name": "Alice Dev",
        "task_title": "Build Auth API",
        "dev_experience_years": 6.0,
        "dev_availability_encoded": 1.0,
        "dev_performance_score": 92.0,
        "dev_total_skills_count": 6,
        "dev_workload_score": 15.0,
        "dev_capacity_hours": 40.0,
        "dev_active_task_count": 1,
        "dev_workload_status_encoded": 1,
        "task_estimated_hours": 12.0,
        "task_complexity_encoded": 2,
        "task_priority_encoded": 3,
        "task_required_skill_count": 2,
        "matching_skill_count": 2,
        "skill_coverage_ratio": 1.0,
        "avg_required_level": 70.0,
        "avg_developer_level": 88.0,
        "avg_proficiency_gap": 18.0,
        "min_proficiency_gap": 12.0,
        "weighted_skill_match_score": 100.0,
        "is_historically_assigned": 0,
    }

    res = generate_local_shap_explanation(dummy_feat_dict, artifacts_dir=artifacts_dir)

    assert res["environment"] == "research"
    assert res["model_version"] == "ml-v1-rf-xgb"
    assert res["developer_name"] == "Alice Dev"
    assert 0.0 <= res["suitability_probability"] <= 1.0
    assert len(res["feature_attributions"]) == 20
    assert "research_disclaimer" in res

    # Verify direction tags
    for attr in res["feature_attributions"]:
        assert attr["direction"] in ("POSITIVE", "NEGATIVE")
        assert "rank" in attr


def test_research_only_protection():
    from app.services.recommendation_service import get_active_recommendation_model
    active_model = get_active_recommendation_model()
    meta = active_model.get_model_metadata()

    # Verify active production recommendation engine remains strictly deterministic baseline-v1
    assert meta.model_type == "deterministic_baseline"
    assert meta.model_version == "baseline-v1"
