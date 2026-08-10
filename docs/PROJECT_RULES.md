# Project Rules & Development Guidelines

This document outlines the coding standards, repository conventions, ethical AI guidelines, and architectural rules for **Project Dhara**. All contributors must strictly adhere to these practices.

---

## 1. Architectural & Design Principles

1. **Strict Separation of Concerns**:
   - `frontend/`: UI/UX components, state management, and XAI visualization.
   - `backend/`: Business logic, database access, RESTful APIs, and authentication.
   - `ai-engine/`: ML model training, feature extraction, SHAP/LIME inference, and workload capacity scoring.
   - `docs/`: Authoritative technical specifications.

2. **Human-in-the-Loop (HITL) Guarantee**:
   - The AI recommendation engine must **never** execute automatic task assignments without project manager confirmation.
   - Every AI recommendation output **must** be accompanied by a valid SHAP/LIME explanation payload.

3. **Stateless API & Async Processing**:
   - FastAPI endpoints must remain stateless. Heavy ML model execution or batch dataset preprocessing must be dispatched to background tasks or dedicated async worker threads.

---

## 2. Code Quality & Language Standards

### 🐍 Python Guidelines (Backend & AI Engine)
- **Style Standard**: Strict adherence to **PEP 8**.
- **Type Annotations**: All function parameters and return types must be fully type-hinted (`typing` / Python 3.10+ native syntax).
- **Docstrings**: Use Google-style docstrings for modules, classes, and public methods.
- **Error Handling**: Use custom HTTPExceptions with clear problem details. Silent exception handling (`except: pass`) is prohibited.
- **Dependencies**: Keep dependencies organized in `requirements.txt`. Do not introduce unvetted third-party ML modules.

```python
# Example Code Pattern
def calculate_workload_score(
    active_tasks_count: int,
    complexity_weight: float,
    estimated_hours: float
) -> float:
    """Calculates normalized developer workload capacity score.

    Args:
        active_tasks_count: Number of currently assigned in-progress tasks.
        complexity_weight: Weighted average complexity of assigned tasks.
        estimated_hours: Sum of remaining estimated work hours.

    Returns:
        Float value between 0.0 and 100.0 representing capacity load percentage.
    """
    if active_tasks_count < 0 or estimated_hours < 0:
        raise ValueError("Task count and estimated hours must be non-negative.")
    
    score = (active_tasks_count * complexity_weight * 10) + (estimated_hours * 0.5)
    return min(score, 100.0)
```

### ⚛️ TypeScript & React Guidelines (Frontend)
- **Style Standard**: Strict ESLint + Prettier rules.
- **Component Architecture**: Functional components using React Hooks (`useState`, `useEffect`, `useMemo`).
- **Typing**: Explicit TypeScript interfaces for all components, props, API responses, and state objects (`no-explicit-any`).
- **Styling**: Tailwind CSS utility classes; avoid inline styles.

---

## 3. Ethical AI & Data Privacy Rules

1. **Developer Anonymization**:
   - Developer records used for training or evaluating public ML models must strip sensitive Personal Identifiable Information (PII). Developer IDs (`DEV-XXXX`) must be used in model datasets.
2. **Fairness Constraints**:
   - Recommendation ranking must enforce maximum workload limits ($Workload\ Score \le 85\%$). Highly skilled developers who are near capacity must be penalized in ranking scores to prevent burnout.
3. **Transparency Requirement**:
   - Low confidence recommendations ($\text{Confidence} < 60\%$) must display a warning pill in the UI recommending manual manager review.

---

## 4. Git Workflow & Commit Guidelines

### Branching Strategy
- `main`: Production-ready releases only.
- `develop`: Integration branch for ongoing sprint work.
- `feature/<feature-name>`: Dedicated feature development (e.g., `feature/shap-explanation-panel`).
- `fix/<bug-name>`: Bug fixes (e.g., `fix/workload-score-overflow`).

### Commit Message Format
Strict enforcement of **Conventional Commits**:
- `feat`: A new user-facing feature or API endpoint.
- `fix`: A bug fix.
- `docs`: Documentation updates.
- `xai`: Modifications specifically related to SHAP/LIME or model explainability.
- `refactor`: Code improvements without functionality changes.
- `test`: Adding or modifying unit/integration tests.

*Example:* `feat(ai-engine): add SHAP waterfall calculation for developer suitability`

---

## 5. Testing & Quality Assurance

- **Backend**: PyTest coverage must exceed **85%** for core service methods.
- **AI Engine**: Model cross-validation scripts must log evaluation metrics (Precision, Recall, F1-Score, Workload Variance) on every training run.
- **Frontend**: Component unit testing using React Testing Library / Vitest.
