import os
import json
import joblib
import numpy as np
import shap
from typing import Tuple, List, Dict, Any

from research.ml.preprocessing import SELECTED_FEATURES


class SHAPExplainerManager:
    """
    Manages SHAP TreeExplainer initialization and calculation for the trained XGBoost model.
    Loads artifacts from research/ml/artifacts/. Does NOT retrain the model.
    """

    def __init__(self, artifacts_dir: str = None):
        if artifacts_dir is None:
            artifacts_dir = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "artifacts")
            )
        self.artifacts_dir = artifacts_dir
        self.model = None
        self.scaler = None
        self.explainer = None
        self.selected_features = SELECTED_FEATURES
        self.base_value = 0.0
        self._load_and_init()

    def _load_and_init(self):
        model_path = os.path.join(self.artifacts_dir, "xgboost.joblib")
        scaler_path = os.path.join(self.artifacts_dir, "preprocessor.joblib")

        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            raise FileNotFoundError(f"Model artifacts not found in {self.artifacts_dir}.")

        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)

        # Initialize SHAP TreeExplainer
        self.explainer = shap.TreeExplainer(self.model)

        # Base value (expected output of model in log-odds / margin output)
        if hasattr(self.explainer, "expected_value"):
            ev = self.explainer.expected_value
            if isinstance(ev, (list, np.ndarray)):
                self.base_value = float(ev[0])
            else:
                self.base_value = float(ev)

    def compute_shap_values(self, X_scaled: np.ndarray) -> np.ndarray:
        """
        Computes SHAP values matrix for scaled input feature matrix X_scaled.
        """
        shap_vals = self.explainer.shap_values(X_scaled)
        if isinstance(shap_vals, list):
            # For binary classification lists, take class 1 output
            shap_vals = shap_vals[1] if len(shap_vals) > 1 else shap_vals[0]
        return shap_vals
