import os
import sys
import json
import joblib
from datetime import datetime
from typing import Dict, Any

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from research.ml.preprocessing import prepare_ml_data, SELECTED_FEATURES
from research.ml.train_random_forest import train_random_forest_model
from research.ml.train_xgboost import train_xgboost_model
from research.ml.model_selection import select_best_candidate_model
from research.ml.evaluate import evaluate_model_on_test_set, compare_ml_against_baseline_benchmark
from research.ml.explainability import extract_feature_importances


def run_ml_training_pipeline(
    processed_dir: str = os.path.join(os.path.dirname(__file__), "..", "dataset", "processed"),
    artifacts_dir: str = os.path.join(os.path.dirname(__file__), "artifacts"),
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Executes complete ML training, cross-validation, validation selection, test evaluation, and artifact saving pipeline.
    """
    os.makedirs(artifacts_dir, exist_ok=True)
    print(f"[ML Pipeline] 1. Loading and preprocessing dataset from {processed_dir}...")

    X_train, y_train, X_val, y_val, X_test, y_test, scaler = prepare_ml_data(processed_dir)
    print(f"[ML Pipeline] Prepared splits -> Train: {X_train.shape[0]}, Val: {X_val.shape[0]}, Test: {X_test.shape[0]}")

    print("[ML Pipeline] 2. Training Random Forest (class_weight='balanced') + 5-Fold Stratified CV...")
    rf_model, rf_cv_metrics = train_random_forest_model(X_train, y_train, random_state=random_state)

    print("[ML Pipeline] 3. Training XGBoost (scale_pos_weight) + 5-Fold Stratified CV...")
    xgb_model, xgb_cv_metrics = train_xgboost_model(X_train, y_train, random_state=random_state)

    print("[ML Pipeline] 4. Evaluating decision thresholds on val.csv & selecting model...")
    selection_results = select_best_candidate_model(rf_model, xgb_model, X_val, y_val)
    selected_name = selection_results["selected_model_name"]
    selected_model = selection_results["selected_model"]
    selected_th = selection_results["selected_threshold"]

    print(f"[ML Pipeline] Selected Model: {selected_name} (Optimal Val Threshold: {selected_th})")

    print("[ML Pipeline] 5. Performing isolated test evaluation on test.csv...")
    rf_test_eval = evaluate_model_on_test_set(rf_model, X_test, y_test, threshold=0.50)
    xgb_test_eval = evaluate_model_on_test_set(xgb_model, X_test, y_test, threshold=0.50)
    selected_test_eval = evaluate_model_on_test_set(selected_model, X_test, y_test, threshold=selected_th)

    ml_probs_test = selected_model.predict_proba(X_test)[:, 1]
    baseline_comp = compare_ml_against_baseline_benchmark(X_test, y_test, ml_probs_test)

    print("[ML Pipeline] 6. Extracting feature importances...")
    rf_importances = extract_feature_importances(rf_model, SELECTED_FEATURES)
    xgb_importances = extract_feature_importances(xgb_model, SELECTED_FEATURES)

    print(f"[ML Pipeline] 7. Exporting model artifacts to {artifacts_dir}...")
    joblib.dump(rf_model, os.path.join(artifacts_dir, "random_forest.joblib"))
    joblib.dump(xgb_model, os.path.join(artifacts_dir, "xgboost.joblib"))
    joblib.dump(scaler, os.path.join(artifacts_dir, "preprocessor.joblib"))

    with open(os.path.join(artifacts_dir, "selected_features.json"), "w", encoding="utf-8") as f:
        json.dump(SELECTED_FEATURES, f, indent=2)

    metadata = {
        "model_version": "ml-v1-rf-xgb",
        "training_timestamp": datetime.utcnow().isoformat() + "Z",
        "random_state": random_state,
        "selected_model": selected_name,
        "optimal_threshold": selected_th,
        "dataset_version": "synthetic-v1",
        "label_strategy": "suitability-v1",
        "feature_count": len(SELECTED_FEATURES),
        "production_status": "RESEARCH ONLY — baseline-v1 remains active production recommendation engine",
    }

    with open(os.path.join(artifacts_dir, "model_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    metrics_report = {
        "cross_validation": {
            "random_forest": rf_cv_metrics,
            "xgboost": xgb_cv_metrics,
        },
        "validation_selection": {
            "random_forest": selection_results["rf_summary"],
            "xgboost": selection_results["xgb_summary"],
            "selected_model": selected_name,
            "selected_threshold": selected_th,
        },
        "test_evaluation": {
            "random_forest": rf_test_eval,
            "xgboost": xgb_test_eval,
            "selected_model": selected_test_eval,
            "baseline_comparison": baseline_comp,
        },
        "feature_importances": {
            "random_forest": rf_importances[:10],
            "xgboost": xgb_importances[:10],
        },
    }

    with open(os.path.join(artifacts_dir, "evaluation_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)

    print("[ML Pipeline] [SUCCESS] Research ML Training Pipeline completed successfully!")
    return metrics_report


if __name__ == "__main__":
    run_ml_training_pipeline()
