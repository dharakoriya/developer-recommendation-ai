import numpy as np
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
)
from typing import Dict, Any


def evaluate_model_on_test_set(
    model: Any, X_test: np.ndarray, y_test: np.ndarray, threshold: float = 0.50
) -> Dict[str, Any]:
    """
    Evaluates a trained model on the isolated test set (test.csv).
    """
    y_probs = model.predict_proba(X_test)[:, 1]
    y_preds = (y_probs >= threshold).astype(int)

    p = float(precision_score(y_test, y_preds, zero_division=0))
    r = float(recall_score(y_test, y_preds, zero_division=0))
    f1 = float(f1_score(y_test, y_preds, zero_division=0))
    roc = float(roc_auc_score(y_test, y_probs))
    pr = float(average_precision_score(y_test, y_probs))
    cm = confusion_matrix(y_test, y_preds).tolist()

    return {
        "threshold": threshold,
        "precision": p,
        "recall": r,
        "f1": f1,
        "roc_auc": roc,
        "pr_auc": pr,
        "confusion_matrix": cm,
        "total_test_samples": len(y_test),
        "positive_test_samples": int(np.sum(y_test == 1)),
        "negative_test_samples": int(np.sum(y_test == 0)),
    }


def compare_ml_against_baseline_benchmark(
    X_test: np.ndarray, y_test: np.ndarray, ml_probs: np.ndarray
) -> Dict[str, Any]:
    """
    Computes candidate ranking quality comparison between ML prediction and baseline.
    """
    # High weighted skill match index is column index 18 ('weighted_skill_match_score')
    weighted_skill_col = 18
    baseline_scores = X_test[:, weighted_skill_col]

    ml_pr = float(average_precision_score(y_test, ml_probs))
    base_pr = float(average_precision_score(y_test, baseline_scores))

    ml_roc = float(roc_auc_score(y_test, ml_probs))
    base_roc = float(roc_auc_score(y_test, baseline_scores))

    return {
        "ml_pr_auc": ml_pr,
        "baseline_pr_auc": base_pr,
        "ml_roc_auc": ml_roc,
        "baseline_roc_auc": base_roc,
        "comparison_note": "ML model predicts candidate suitability probability (binary label_target). Baseline-v1 provides multi-criteria weighted scoring.",
    }
