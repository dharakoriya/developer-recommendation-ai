import os
import json
import numpy as np
from typing import List, Dict, Any

from research.ml.preprocessing import load_dataset_split, SELECTED_FEATURES
from research.ml.explainability.shap_explainer import SHAPExplainerManager


def generate_global_shap_importance(
    dataset_csv_path: str = None,
    artifacts_dir: str = None,
) -> List[Dict[str, Any]]:
    """
    Calculates global mean absolute SHAP values across research dataset samples.
    Exports shap_global_importance.json.
    """
    if artifacts_dir is None:
        artifacts_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "artifacts")
        )
    if dataset_csv_path is None:
        dataset_csv_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "dataset", "processed", "full_dataset.csv")
        )

    manager = SHAPExplainerManager(artifacts_dir=artifacts_dir)
    X_raw, _, _ = load_dataset_split(dataset_csv_path)
    X_scaled = manager.scaler.transform(X_raw)

    shap_matrix = manager.compute_shap_values(X_scaled)

    # Mean absolute SHAP value for each feature
    mean_abs_shap = np.mean(np.abs(shap_matrix), axis=0)
    total_shap_sum = float(np.sum(mean_abs_shap))
    if total_shap_sum == 0.0:
        total_shap_sum = 1.0

    global_features = []
    for feat_name, mean_val in zip(SELECTED_FEATURES, mean_abs_shap):
        pct = float(round((mean_val / total_shap_sum) * 100.0, 2))
        global_features.append({
            "feature_name": feat_name,
            "mean_abs_shap": float(round(mean_val, 6)),
            "percentage": pct,
        })

    # Sort descending by importance
    global_features.sort(key=lambda x: x["mean_abs_shap"], reverse=True)

    for rank, item in enumerate(global_features, start=1):
        item["rank"] = rank

    output_path = os.path.join(artifacts_dir, "shap_global_importance.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "environment": "research",
            "dataset_version": "synthetic-v1",
            "model_version": "ml-v1-rf-xgb",
            "total_samples_analyzed": X_scaled.shape[0],
            "global_feature_importance": global_features,
        }, f, indent=2)

    return global_features


if __name__ == "__main__":
    generate_global_shap_importance()
