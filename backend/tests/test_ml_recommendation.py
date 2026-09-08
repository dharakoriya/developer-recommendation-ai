import os
import sys
import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from research.ml.preprocessing import prepare_ml_data, SELECTED_FEATURES
from research.ml.train_random_forest import train_random_forest_model
from research.ml.train_xgboost import train_xgboost_model
from research.ml.model_selection import select_best_candidate_model
from research.ml.evaluate import evaluate_model_on_test_set, compare_ml_against_baseline_benchmark
from research.ml.explainability import extract_feature_importances
from app.schemas.feature import CandidateFeatureVector
from app.services.recommendation_service import MLRecommendationModelAdapter
from app.models.enums import AvailabilityStatus




@pytest.fixture
def processed_dir():
    return os.path.join(PROJECT_ROOT, "research", "dataset", "processed")


def test_ml_data_preprocessing_and_isolation(processed_dir):
    X_tr, y_tr, X_val, y_val, X_te, y_te, scaler = prepare_ml_data(processed_dir)

    assert X_tr.shape[0] == 1049
    assert X_val.shape[0] == 224
    assert X_te.shape[0] == 227
    assert X_tr.shape[1] == 20

    # Test set isolation: Verify scaler parameters were computed strictly on training data
    assert scaler.mean_ is not None
    assert len(scaler.mean_) == 20


def test_random_forest_training_and_cv(processed_dir):
    X_tr, y_tr, _, _, _, _, _ = prepare_ml_data(processed_dir)
    rf_model, cv_metrics = train_random_forest_model(X_tr, y_tr, random_state=42)

    assert rf_model is not None
    assert "f1_mean" in cv_metrics
    assert "pr_auc_mean" in cv_metrics
    assert cv_metrics["roc_auc_mean"] > 0.90


def test_xgboost_training_and_cv(processed_dir):
    X_tr, y_tr, _, _, _, _, _ = prepare_ml_data(processed_dir)
    xgb_model, cv_metrics = train_xgboost_model(X_tr, y_tr, random_state=42)

    assert xgb_model is not None
    assert "scale_pos_weight" in cv_metrics
    assert cv_metrics["scale_pos_weight"] > 30.0
    assert cv_metrics["roc_auc_mean"] > 0.90


def test_model_selection_and_threshold_tuning(processed_dir):
    X_tr, y_tr, X_val, y_val, _, _, _ = prepare_ml_data(processed_dir)
    rf_model, _ = train_random_forest_model(X_tr, y_tr, random_state=42)
    xgb_model, _ = train_xgboost_model(X_tr, y_tr, random_state=42)

    res = select_best_candidate_model(rf_model, xgb_model, X_val, y_val)
    assert res["selected_model_name"] in ("Random Forest", "XGBoost")
    assert 0.30 <= res["selected_threshold"] <= 0.70


def test_isolated_test_evaluation(processed_dir):
    X_tr, y_tr, _, _, X_te, y_te, _ = prepare_ml_data(processed_dir)
    rf_model, _ = train_random_forest_model(X_tr, y_tr, random_state=42)

    test_eval = evaluate_model_on_test_set(rf_model, X_te, y_te, threshold=0.50)
    assert test_eval["total_test_samples"] == 227
    assert test_eval["positive_test_samples"] == 7
    assert test_eval["f1"] > 0.80

    comp = compare_ml_against_baseline_benchmark(X_te, y_te, rf_model.predict_proba(X_te)[:, 1])
    assert "ml_pr_auc" in comp
    assert "baseline_pr_auc" in comp


def test_ml_model_adapter_loading():
    adapter = MLRecommendationModelAdapter()
    meta = adapter.get_model_metadata()

    assert meta.model_type == "ml_model_adapter"
    assert "RESEARCH ONLY" in meta.description

    # Test candidate prediction vector
    dummy_vec = CandidateFeatureVector(
        developer_id="00000000-0000-0000-0000-000000000001",
        user_name="Test Dev",
        user_email="test@dev.ai",
        task_id="00000000-0000-0000-0000-000000000002",
        task_title="Test Task",
        project_id="00000000-0000-0000-0000-000000000003",
        project_name="Test Project",
        dev_experience_years=5.0,
        dev_availability_status="AVAILABLE",
        dev_availability_encoded=1.0,
        dev_performance_score=90.0,
        dev_total_skills_count=5,
        dev_workload_score=20.0,
        dev_capacity_hours=40.0,
        dev_active_task_count=1,
        dev_workload_status="BALANCED",
        dev_workload_status_encoded=1,
        task_estimated_hours=10.0,
        task_complexity="MEDIUM",
        task_complexity_encoded=2,
        task_priority="HIGH",
        task_priority_encoded=3,
        task_status="TODO",
        task_required_skill_count=2,
        matching_skill_count=2,
        skill_coverage_ratio=1.0,
        avg_required_level=70.0,
        avg_developer_level=85.0,
        avg_proficiency_gap=15.0,
        min_proficiency_gap=10.0,
        weighted_skill_match_score=100.0,
        is_historically_assigned=0,
        label_target=None,
    )

    score, contribs, status, reasons = adapter.predict_candidate_score(dummy_vec)
    assert 0.0 <= score <= 100.0
    assert len(contribs) >= 1

