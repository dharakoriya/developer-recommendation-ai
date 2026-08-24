import numpy as np
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
)
from typing import Dict, Any, List, Tuple

THRESHOLDS = [0.30, 0.40, 0.50, 0.60, 0.70]


def evaluate_threshold_curves(
    model: Any, X_val: np.ndarray, y_val: np.ndarray
) -> Tuple[Dict[float, Dict[str, float]], float, float]:
    """
    Evaluates probability decision thresholds on validation set (val.csv).
    Returns (threshold_results, best_threshold, best_f1).
    """
    y_val_probs = model.predict_proba(X_val)[:, 1]

    results = {}
    best_threshold = 0.50
    best_f1 = -1.0

    for th in THRESHOLDS:
        y_preds = (y_val_probs >= th).astype(int)
        p = float(precision_score(y_val, y_preds, zero_division=0))
        r = float(recall_score(y_val, y_preds, zero_division=0))
        f1 = float(f1_score(y_val, y_preds, zero_division=0))
        cm = confusion_matrix(y_val, y_preds).tolist()

        results[th] = {
            "threshold": th,
            "precision": p,
            "recall": r,
            "f1": f1,
            "confusion_matrix": cm,
        }

        if f1 > best_f1:
            best_f1 = f1
            best_threshold = th

    return results, best_threshold, best_f1


def select_best_candidate_model(
    rf_model: Any,
    xgb_model: Any,
    X_val: np.ndarray,
    y_val: np.ndarray,
) -> Dict[str, Any]:
    """
    Performs validation set model selection between Random Forest and XGBoost.
    """
    rf_val_probs = rf_model.predict_proba(X_val)[:, 1]
    xgb_val_probs = xgb_model.predict_proba(X_val)[:, 1]

    rf_roc = float(roc_auc_score(y_val, rf_val_probs))
    rf_pr = float(average_precision_score(y_val, rf_val_probs))
    rf_th_curve, rf_best_th, rf_best_f1 = evaluate_threshold_curves(rf_model, X_val, y_val)

    xgb_roc = float(roc_auc_score(y_val, xgb_val_probs))
    xgb_pr = float(average_precision_score(y_val, xgb_val_probs))
    xgb_th_curve, xgb_best_th, xgb_best_f1 = evaluate_threshold_curves(xgb_model, X_val, y_val)

    rf_summary = {
        "model_name": "Random Forest",
        "roc_auc": rf_roc,
        "pr_auc": rf_pr,
        "best_threshold": rf_best_th,
        "best_val_f1": rf_best_f1,
        "threshold_curves": rf_th_curve,
    }

    xgb_summary = {
        "model_name": "XGBoost",
        "roc_auc": xgb_roc,
        "pr_auc": xgb_pr,
        "best_threshold": xgb_best_th,
        "best_val_f1": xgb_best_f1,
        "threshold_curves": xgb_th_curve,
    }

    # Selection decision (prioritizes PR-AUC and F1 score on validation set)
    if xgb_pr > rf_pr or (xgb_pr == rf_pr and xgb_best_f1 >= rf_best_f1):
        selected_model_name = "XGBoost"
        selected_model = xgb_model
        selected_threshold = xgb_best_th
    else:
        selected_model_name = "Random Forest"
        selected_model = rf_model
        selected_threshold = rf_best_th

    return {
        "selected_model_name": selected_model_name,
        "selected_model": selected_model,
        "selected_threshold": selected_threshold,
        "rf_summary": rf_summary,
        "xgb_summary": xgb_summary,
    }
