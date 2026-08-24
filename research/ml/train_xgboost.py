import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)
from typing import Dict, Any, Tuple


def train_xgboost_model(
    X_train: np.ndarray, y_train: np.ndarray, random_state: int = 42
) -> Tuple[XGBClassifier, Dict[str, Any]]:
    """
    Trains XGBoost Classifier with scale_pos_weight = neg_count / pos_count to handle severe class imbalance.
    Performs 5-Fold Stratified Cross-Validation on training set.
    """
    pos_count = np.sum(y_train == 1)
    neg_count = np.sum(y_train == 0)
    scale_pos_weight = float(neg_count / pos_count) if pos_count > 0 else 1.0

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)

    cv_precisions, cv_recalls, cv_f1s, cv_rocs, cv_praucs = [], [], [], [], []

    for fold, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train), start=1):
        X_fold_tr, y_fold_tr = X_train[train_idx], y_train[train_idx]
        X_fold_va, y_fold_va = X_train[val_idx], y_train[val_idx]

        xgb_fold = XGBClassifier(
            n_estimators=100,
            scale_pos_weight=scale_pos_weight,
            random_state=random_state,
            eval_metric="logloss",
            n_jobs=-1,
        )
        xgb_fold.fit(X_fold_tr, y_fold_tr)

        y_fold_probs = xgb_fold.predict_proba(X_fold_va)[:, 1]
        y_fold_preds = (y_fold_probs >= 0.50).astype(int)

        cv_precisions.append(precision_score(y_fold_va, y_fold_preds, zero_division=0))
        cv_recalls.append(recall_score(y_fold_va, y_fold_preds, zero_division=0))
        cv_f1s.append(f1_score(y_fold_va, y_fold_preds, zero_division=0))
        cv_rocs.append(roc_auc_score(y_fold_va, y_fold_probs))
        cv_praucs.append(average_precision_score(y_fold_va, y_fold_probs))

    cv_metrics = {
        "scale_pos_weight": scale_pos_weight,
        "precision_mean": float(np.mean(cv_precisions)),
        "precision_std": float(np.std(cv_precisions)),
        "recall_mean": float(np.mean(cv_recalls)),
        "recall_std": float(np.std(cv_recalls)),
        "f1_mean": float(np.mean(cv_f1s)),
        "f1_std": float(np.std(cv_f1s)),
        "roc_auc_mean": float(np.mean(cv_rocs)),
        "roc_auc_std": float(np.std(cv_rocs)),
        "pr_auc_mean": float(np.mean(cv_praucs)),
        "pr_auc_std": float(np.std(cv_praucs)),
    }

    # Fit final model on full training set
    xgb_final = XGBClassifier(
        n_estimators=100,
        scale_pos_weight=scale_pos_weight,
        random_state=random_state,
        eval_metric="logloss",
        n_jobs=-1,
    )
    xgb_final.fit(X_train, y_train)

    return xgb_final, cv_metrics
