# AI and Machine Learning Design

## 1. Objective

The ML component recommends suitable developers for software development tasks.

The system should rank developers rather than automatically assign a task.

## 2. Input Data

### Developer Features

* Skill proficiency
* Experience years
* Previous similar tasks
* Performance score
* Availability
* Current workload

### Task Features

* Required skills
* Required skill levels
* Task category
* Complexity
* Priority
* Estimated effort
* Deadline pressure

## 3. Recommendation Concept

For each task:

```text
Task
  +
Developer Profile
  ↓
Feature Vector
  ↓
ML Model
  ↓
Suitability Score
```

The suitability score is used to rank developers.

## 4. Candidate Models

The project will initially investigate:

### Random Forest

Advantages:

* Handles multiple features
* Suitable for tabular data
* Relatively easy to train
* Provides feature importance

### XGBoost

Advantages:

* Strong performance on tabular data
* Handles complex relationships
* Suitable for structured datasets

### Decision Tree

Advantages:

* Simple
* Easy to interpret
* Useful as a baseline

Neural Network is not required for the initial implementation.

## 5. Model Selection

Models will be evaluated using:

* Accuracy
* Precision
* Recall
* F1-score

The final model should be selected based on evaluation results rather than assuming a particular algorithm will always perform best.

## 6. Training Pipeline

```text
Dataset
  ↓
Data Cleaning
  ↓
Feature Engineering
  ↓
Train/Test Split
  ↓
Model Training
  ↓
Model Evaluation
  ↓
Model Comparison
  ↓
Best Model
  ↓
Save Model
```

## 7. Dataset Strategy

The system should use historical software-development assignment data when available.

If a suitable real dataset is unavailable, a synthetic dataset may be created for the prototype/research demonstration.

Synthetic data must be documented as synthetic.

The project must not present generated data as real-world observations.

## 8. Feature Engineering

Potential derived features:

* Skill match percentage
* Experience match
* Similar task count
* Workload percentage
* Availability score
* Deadline pressure
* Estimated effort
* Task complexity
* Historical performance

## 9. Recommendation Ranking

The model produces suitability scores.

Example:

```text
Developer A → 0.92
Developer B → 0.84
Developer C → 0.76
```

Developers are ranked by score.

Workload and availability constraints should prevent obviously unsuitable or overloaded candidates from being blindly promoted.

## 10. Explainability

SHAP is the primary XAI mechanism.

SHAP values explain how individual features contributed to a recommendation.

Example:

```text
Developer A

Positive:
Java skill           +0.31
Similar experience   +0.22
Availability         +0.15

Negative:
Current workload     -0.08
```

The UI should convert technical feature names into understandable explanations.

## 11. Workload Integration

Recommendation should consider workload.

A developer with excellent skills but excessive workload should not automatically receive the highest recommendation.

Workload can be used as:

* A model feature
* A filtering condition
* A ranking adjustment

The exact implementation should be evaluated during development.

## 12. Model Versioning

Every stored recommendation should record the model version used.

Example:

```text
model_version = rf_v1
```

When a new model is deployed:

```text
model_version = xgb_v2
```

Historical recommendations should remain traceable.

## 13. Model Storage

Trained models should be stored separately from application source code where practical.

Example:

```text
ml/models/
```

The model should be loaded by the backend when required.

## 14. ML Testing

Tests should cover:

* Feature generation
* Prediction output
* Ranking
* Invalid input
* Missing data
* Workload edge cases
* SHAP explanation generation

## 15. Research Comparison

The research should compare candidate models and document:

* Dataset
* Features
* Training procedure
* Evaluation metrics
* Results
* Selected model
* Limitations

## 16. Important Limitation

Recommendation quality depends heavily on dataset quality.

A high-performing model trained on unrealistic or synthetic data does not prove real-world effectiveness.

This limitation must be documented honestly in the final research evaluation.
