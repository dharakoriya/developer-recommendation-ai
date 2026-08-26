import os
import numpy as np
from typing import Dict, Any, List

from research.ml.preprocessing import SELECTED_FEATURES
from research.ml.explainability.shap_explainer import SHAPExplainerManager


def generate_local_shap_explanation(
    feature_dict: Dict[str, Any],
    artifacts_dir: str = None,
) -> Dict[str, Any]:
    """
    Generates local SHAP feature attributions for a single candidate pair feature vector.
    """
    if artifacts_dir is None:
        artifacts_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "artifacts")
        )

    manager = SHAPExplainerManager(artifacts_dir=artifacts_dir)

    feat_raw = np.array([[float(feature_dict.get(col, 0.0)) for col in SELECTED_FEATURES]], dtype=np.float64)
    feat_scaled = manager.scaler.transform(feat_raw)

    prob_suitable = float(manager.model.predict_proba(feat_scaled)[0, 1])
    shap_vals = manager.compute_shap_values(feat_scaled)[0]

    feature_attributions = []
    positive_factors = []
    negative_factors = []

    for feat_name, raw_val, shap_val in zip(SELECTED_FEATURES, feat_raw[0], shap_vals):
        direction = "POSITIVE" if shap_val > 0 else "NEGATIVE"
        attr_item = {
            "feature_name": feat_name,
            "raw_value": float(raw_val),
            "shap_contribution": float(round(shap_val, 6)),
            "direction": direction,
        }
        feature_attributions.append(attr_item)

        if shap_val > 0.05:
            positive_factors.append(f"+ {feat_name}: {raw_val:.1f} (SHAP +{shap_val:.3f})")
        elif shap_val < -0.05:
            negative_factors.append(f"- {feat_name}: {raw_val:.1f} (SHAP {shap_val:.3f})")

    # Sort feature attributions by absolute SHAP contribution descending
    feature_attributions.sort(key=lambda x: abs(x["shap_contribution"]), reverse=True)
    for rank, item in enumerate(feature_attributions, start=1):
        item["rank"] = rank

    return {
        "environment": "research",
        "model_version": "ml-v1-rf-xgb",
        "dataset_version": "synthetic-v1",
        "label_strategy": "suitability-v1",
        "developer_id": str(feature_dict.get("developer_id", "")),
        "task_id": str(feature_dict.get("task_id", "")),
        "developer_name": feature_dict.get("user_name", "Candidate Developer"),
        "task_title": feature_dict.get("task_title", "Candidate Task"),
        "suitability_probability": prob_suitable,
        "suitability_percentage": float(round(prob_suitable * 100.0, 2)),
        "base_value": manager.base_value,
        "positive_factors": positive_factors,
        "negative_factors": negative_factors,
        "feature_attributions": feature_attributions,
        "research_disclaimer": "These explanations describe the behavior of the research XGBoost model trained on synthetic-v1 data. They do not establish real-world recommendation accuracy.",
    }
