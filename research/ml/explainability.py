import numpy as np
from typing import List, Dict, Any


def extract_feature_importances(
    model: Any, feature_names: List[str]
) -> List[Dict[str, Any]]:
    """
    Extracts Gini / Mean Decrease in Impurity (MDI) feature importances from tree-based models.
    """
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    else:
        importances = np.zeros(len(feature_names))

    items = []
    for name, imp in zip(feature_names, importances):
        items.append({
            "feature_name": name,
            "importance_score": float(imp),
            "percentage": float(round(imp * 100.0, 2)),
        })

    items.sort(key=lambda x: x["importance_score"], reverse=True)
    return items
