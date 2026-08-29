import os
import sys
import json
import uuid
from typing import Dict, Any
from sqlalchemy.orm import Session

# Ensure project root is in sys.path for safe resolution of research package
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.services.feature_engineering_service import extract_developer_task_feature_vector
from research.ml.explainability.global_explanation import generate_global_shap_importance
from research.ml.explainability.local_explanation import generate_local_shap_explanation


def get_global_shap_explanations() -> Dict[str, Any]:
    """
    Retrieves global SHAP feature importance analysis for the research XGBoost model.
    """
    artifacts_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "ml", "artifacts")
    )
    json_path = os.path.join(artifacts_dir, "shap_global_importance.json")

    if not os.path.exists(json_path):
        global_list = generate_global_shap_importance(artifacts_dir=artifacts_dir)
        return {
            "environment": "research",
            "dataset_version": "synthetic-v1",
            "model_version": "ml-v1-rf-xgb",
            "label_strategy": "suitability-v1",
            "global_feature_importance": global_list,
        }

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data


def get_local_shap_explanation_for_candidate(
    db: Session, developer_id: uuid.UUID, task_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Calculates candidate-level local SHAP feature attributions for a specific (Developer, Task) pair.
    Read-only research method. Production state remains unchanged.
    """
    vec = extract_developer_task_feature_vector(db, developer_id, task_id)
    feat_dict = vec.model_dump()

    artifacts_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "research", "ml", "artifacts")
    )

    return generate_local_shap_explanation(feat_dict, artifacts_dir=artifacts_dir)
