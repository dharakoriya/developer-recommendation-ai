import os
import json
from typing import List, Dict, Any

from app.schemas.recommendation_audit import ModelRegistryResponse


def get_model_registry_governance() -> List[ModelRegistryResponse]:
    """
    Returns registered model governance records for production and research environments.
    Enforces explicit version tracking and environment separation.
    """
    artifacts_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "ml", "artifacts")
    )
    metrics_path = os.path.join(artifacts_dir, "evaluation_metrics.json")

    rf_metrics = {}
    xgb_metrics = {}
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                rf_metrics = data.get("test_evaluation", {}).get("random_forest", {})
                xgb_metrics = data.get("test_evaluation", {}).get("selected_model", {})
        except Exception:
            pass

    records = [
        ModelRegistryResponse(
            model_name="deterministic_baseline",
            model_version="baseline-v1",
            dataset_version="none",
            label_strategy="deterministic_rules_v1",
            feature_version="v1.0-21-attr",
            training_date=None,
            training_rows=0,
            validation_rows=0,
            test_rows=0,
            threshold=0.50,
            evaluation_metrics={"type": "rule_based_weighted_scoring"},
            artifact_location="backend/app/services/recommendation_service.py",
            environment="production",
            status="PRODUCTION_ACTIVE",
        ),
        ModelRegistryResponse(
            model_name="random_forest",
            model_version="ml-v1-rf-xgb",
            dataset_version="synthetic-v1",
            label_strategy="suitability-v1",
            feature_version="v1.0-20-scaled",
            training_date="2026-08-24",
            training_rows=1049,
            validation_rows=224,
            test_rows=227,
            threshold=0.50,
            evaluation_metrics=rf_metrics,
            artifact_location="research/ml/artifacts/random_forest.joblib",
            environment="research",
            status="EXPERIMENTAL",
        ),
        ModelRegistryResponse(
            model_name="xgboost",
            model_version="ml-v1-rf-xgb",
            dataset_version="synthetic-v1",
            label_strategy="suitability-v1",
            feature_version="v1.0-20-scaled",
            training_date="2026-08-24",
            training_rows=1049,
            validation_rows=224,
            test_rows=227,
            threshold=0.30,
            evaluation_metrics=xgb_metrics,
            artifact_location="research/ml/artifacts/xgboost.joblib",
            environment="research",
            status="EXPERIMENTAL",
        ),
    ]

    return records
