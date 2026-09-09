import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List
from app.schemas.ai_planning import AIPlanningInput
from app.models.enums import AIPlanGranularity, AIProjectType, TaskPriority, TaskComplexity

logger = logging.getLogger(__name__)


class AIPlanningError(Exception):
    """Base exception for AI planning provider errors."""
    pass


class AIPlanningProvider(ABC):
    @abstractmethod
    def generate_project_plan(self, input_data: AIPlanningInput) -> Dict[str, Any]:
        """Generates structured project summary, modules, and tasks JSON."""
        pass


class HeuristicPlanningProvider(AIPlanningProvider):
    """
    Deterministic, heuristic-based AI planning generator.
    Produces high-quality, realistic structured project plans based on project description and options.
    """

    def generate_project_plan(self, input_data: AIPlanningInput) -> Dict[str, Any]:
        p_type = input_data.project_type
        granularity = input_data.granularity
        desc_lower = (input_data.project_description + " " + (input_data.functional_requirements or "")).lower()

        # Determine modules based on project type and text keywords
        modules = ["Authentication & Security", "Core Business Logic API", "Data Model & Database"]
        if "frontend" in desc_lower or "dashboard" in desc_lower or "ui" in desc_lower or p_type in (AIProjectType.WEB_APP, AIProjectType.E_COMMERCE, AIProjectType.MOBILE_APP):
          modules.append("Frontend Client Dashboard")
        if "payment" in desc_lower or "stripe" in desc_lower or "checkout" in desc_lower or p_type == AIProjectType.E_COMMERCE:
          modules.append("Payment & Checkout Integration")
        if "analytics" in desc_lower or "report" in desc_lower or "ai" in desc_lower or p_type == AIProjectType.AI_ML_SYSTEM:
          modules.append("Analytics & Intelligence Engine")
        if "cloud" in desc_lower or "kubernetes" in desc_lower or "docker" in desc_lower or "deploy" in desc_lower:
          modules.append("DevOps & Infrastructure")
        else:
          modules.append("Quality Assurance & Deployment")

        # Determine task templates by project type
        skill_sets = self._get_skill_sets_for_type(p_type, desc_lower)

        task_templates = [
            {
                "title": f"Design {p_type.value.replace('_', ' ').title()} Database Schema & Migrations",
                "description": "Define relational data models, tables, indexes, foreign keys, and Alembic migrations.",
                "module": "Data Model & Database",
                "priority": TaskPriority.HIGH,
                "complexity": TaskComplexity.HIGH,
                "estimated_hours": 16.0,
                "required_skills": skill_sets["db"],
                "dependencies": [],
                "acceptance_criteria": ["DB schema ERD finalized", "Migrations execute cleanly in CI"],
            },
            {
                "title": "Implement JWT Authentication & RBAC Middleware",
                "description": "Build user registration, password hashing, JWT token issuance, and role-based middleware.",
                "module": "Authentication & Security",
                "priority": TaskPriority.CRITICAL,
                "complexity": TaskComplexity.HIGH,
                "estimated_hours": 20.0,
                "required_skills": skill_sets["backend_security"],
                "dependencies": [f"Design {p_type.value.replace('_', ' ').title()} Database Schema & Migrations"],
                "acceptance_criteria": ["JWT token claims verified", "401/403 forbidden security guards tested"],
            },
            {
                "title": "Develop Core Domain REST API Endpoints",
                "description": "Construct CRUD endpoints, Pydantic validation schemas, and database service queries.",
                "module": "Core Business Logic API",
                "priority": TaskPriority.HIGH,
                "complexity": TaskComplexity.MEDIUM,
                "estimated_hours": 24.0,
                "required_skills": skill_sets["backend"],
                "dependencies": ["Implement JWT Authentication & RBAC Middleware"],
                "acceptance_criteria": ["REST endpoints conform to OpenAPI spec", "80%+ test coverage"],
            },
            {
                "title": "Build Responsive Application Shell & Navigation UI",
                "description": "Implement modern B2B SaaS navigation sidebar, top bar, role badges, and mobile drawer.",
                "module": "Frontend Client Dashboard",
                "priority": TaskPriority.MEDIUM,
                "complexity": TaskComplexity.MEDIUM,
                "estimated_hours": 16.0,
                "required_skills": skill_sets["frontend"],
                "dependencies": [],
                "acceptance_criteria": ["Responsive across desktop and mobile views", "Zero TypeScript compilation errors"],
            },
            {
                "title": "Integrate Interactive Frontend Dashboard Widgets",
                "description": "Connect frontend API client to backend REST endpoints with skeleton loaders and toast notifications.",
                "module": "Frontend Client Dashboard",
                "priority": TaskPriority.HIGH,
                "complexity": TaskComplexity.MEDIUM,
                "estimated_hours": 20.0,
                "required_skills": skill_sets["frontend"],
                "dependencies": [
                    "Develop Core Domain REST API Endpoints",
                    "Build Responsive Application Shell & Navigation UI",
                ],
                "acceptance_criteria": ["Live backend data populated", "Empty and loading UX states active"],
            },
        ]

        # Additional tasks depending on keywords / project type
        if "Kubernetes" in skill_sets["infra"] or "docker" in desc_lower or "kubernetes" in desc_lower:
            task_templates.append({
                "title": "Configure Docker Containerization & Kubernetes Deployment Manifests",
                "description": "Write Dockerfiles, docker-compose configuration, and Kubernetes ingress manifests.",
                "module": "DevOps & Infrastructure",
                "priority": TaskPriority.HIGH,
                "complexity": TaskComplexity.HIGH,
                "estimated_hours": 24.0,
                "required_skills": skill_sets["infra"],
                "dependencies": ["Develop Core Domain REST API Endpoints"],
                "acceptance_criteria": ["Containers pass security scans", "K8s manifests deploy cleanly"],
            })

        if "Payment & Checkout Integration" in modules:
            task_templates.append({
                "title": "Implement Payment Processing Gateway & Webhook Handlers",
                "description": "Integrate payment processing SDK, secure webhooks, and invoice generation ledger.",
                "module": "Payment & Checkout Integration",
                "priority": TaskPriority.CRITICAL,
                "complexity": TaskComplexity.HIGH,
                "estimated_hours": 28.0,
                "required_skills": skill_sets["backend_payment"],
                "dependencies": ["Develop Core Domain REST API Endpoints"],
                "acceptance_criteria": ["Stripe/Payment gateway webhooks verified", "Idempotent payment transactions"],
            })

        if "Analytics & Intelligence Engine" in modules:
            task_templates.append({
                "title": "Build Real-Time Analytics Aggregation & Data Visualization",
                "description": "Develop analytical queries, feature engineering aggregations, and interactive charting components.",
                "module": "Analytics & Intelligence Engine",
                "priority": TaskPriority.MEDIUM,
                "complexity": TaskComplexity.HIGH,
                "estimated_hours": 22.0,
                "required_skills": skill_sets["analytics"],
                "dependencies": ["Develop Core Domain REST API Endpoints"],
                "acceptance_criteria": ["Sub-second analytical queries", "Charts render without hydration errors"],
            })

        # Quality Assurance Task
        task_templates.append({
            "title": "Execute Comprehensive End-to-End Integration Testing Suite",
            "description": "Run Pytest backend suite, TypeScript strict checks, and end-to-end workflow validation.",
            "module": "Quality Assurance & Deployment",
            "priority": TaskPriority.HIGH,
            "complexity": TaskComplexity.MEDIUM,
            "estimated_hours": 14.0,
            "required_skills": skill_sets["qa"],
            "dependencies": [t["title"] for t in task_templates[-2:]],
            "acceptance_criteria": ["All automated tests pass", "0 TypeScript errors"],
        })

        # Adjust task count based on granularity
        if granularity == AIPlanGranularity.HIGH_LEVEL:
            final_tasks = task_templates[:5]
        elif granularity == AIPlanGranularity.DETAILED:
            # Duplicate / expand tasks with sub-modules if detailed
            final_tasks = task_templates
        else:
            final_tasks = task_templates

        summary = {
            "project_name": input_data.project_name,
            "business_objective": input_data.business_objective or f"Build scalable {p_type.value.replace('_', ' ')} solution addressing: {input_data.project_description[:100]}...",
            "primary_users": input_data.target_users or "Enterprise engineering leads, system managers, and end users.",
            "core_value_proposition": "Structured modular software decomposition with automated capability risk matching and transparent task weighting.",
            "identified_modules": modules,
        }

        return {
            "summary": summary,
            "tasks": final_tasks,
            "ai_provider": "heuristic",
            "ai_model": "heuristic-v1",
            "prompt_version": "v1.0",
        }

    def _get_skill_sets_for_type(self, p_type: AIProjectType, desc_lower: str) -> Dict[str, Any]:
        has_k8s = "kubernetes" in desc_lower or "k8s" in desc_lower

        db_skills = ["PostgreSQL"]
        backend_skills = ["Python", "FastAPI"]
        frontend_skills = ["React", "TypeScript"]
        infra_skills = ["Docker"]

        if has_k8s:
            infra_skills.append("Kubernetes")

        if p_type == AIProjectType.MOBILE_APP:
            frontend_skills = ["React Native", "TypeScript"]
        elif p_type == AIProjectType.AI_ML_SYSTEM:
            backend_skills.append("Machine Learning")
        elif p_type == AIProjectType.ENTERPRISE_SOFTWARE:
            backend_skills = ["Java", "Spring Boot"]

        return {
            "db": db_skills,
            "backend": backend_skills,
            "backend_security": backend_skills,
            "backend_payment": backend_skills + ["Payment Gateways"],
            "frontend": frontend_skills,
            "infra": infra_skills,
            "analytics": backend_skills + ["Data Analytics"],
            "qa": ["Software Testing"],
        }


class OpenAIPlanningProvider(AIPlanningProvider):
    """
    OpenAI-based AI planning generator using structured JSON schema output.
    Falls back to HeuristicPlanningProvider if API key is invalid or request fails.
    """

    def __init__(self, api_key: str | None = None, model_name: str = "gpt-4o"):
        self.api_key = api_key or os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.model_name = model_name or os.getenv("AI_MODEL", "gpt-4o")

    def generate_project_plan(self, input_data: AIPlanningInput) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("No OpenAI API key configured. Falling back to HeuristicPlanningProvider.")
            return HeuristicPlanningProvider().generate_project_plan(input_data)

        try:
            import urllib.request
            # Calls OpenAI API using standard library or openai SDK if installed
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            prompt_content = f"""
            Analyze the following software project and decompose it into a structured engineering delivery plan.
            Project Name: {input_data.project_name}
            Project Type: {input_data.project_type.value}
            Granularity: {input_data.granularity.value}
            Description: {input_data.project_description}
            Business Objective: {input_data.business_objective or 'N/A'}
            Functional Requirements: {input_data.functional_requirements or 'N/A'}
            Technical Requirements: {input_data.technical_requirements or 'N/A'}
            Tech Stack: {input_data.technology_stack or 'N/A'}

            Respond ONLY with a valid JSON object matching this schema:
            {{
              "summary": {{
                "project_name": "...",
                "business_objective": "...",
                "primary_users": "...",
                "core_value_proposition": "...",
                "identified_modules": ["Module 1", "Module 2"]
              }},
              "tasks": [
                {{
                  "title": "Task Title",
                  "description": "Detailed explanation",
                  "module": "Module Name",
                  "priority": "HIGH" | "MEDIUM" | "LOW" | "CRITICAL",
                  "complexity": "HIGH" | "MEDIUM" | "LOW",
                  "estimated_hours": 16.0,
                  "required_skills": [{{"skill_name": "Python", "required_level": 80}}],
                  "dependencies": ["Preceding Task Title"],
                  "acceptance_criteria": ["Criteria 1"]
                }}
              ]
            }}
            """

            payload = {
                "model": self.model_name,
                "messages": [
                    {"role": "system", "content": "You are a senior software architect and project manager AI assistant."},
                    {"role": "user", "content": prompt_content},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2,
            }

            req = urllib.request.Request(
                "https://api.openai.com/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                content_str = res_body["choices"][0]["message"]["content"]
                parsed = json.loads(content_str)
                parsed["ai_provider"] = "openai"
                parsed["ai_model"] = self.model_name
                parsed["prompt_version"] = "v1.0-openai"
                return parsed

        except Exception as e:
            logger.error(f"OpenAI API planning call failed: {str(e)}. Falling back to HeuristicPlanningProvider.")
            mock_res = HeuristicPlanningProvider().generate_project_plan(input_data)
            mock_res["ai_provider"] = "openai-fallback-heuristic"
            return mock_res



class OllamaPlanningProvider(AIPlanningProvider):
    """
    Ollama-based AI planning generator using local models.
    Falls back to HeuristicPlanningProvider if connection fails.
    """

    def __init__(self, host: str | None = None, model_name: str = "llama3"):
        self.host = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model_name = model_name or os.getenv("AI_MODEL", "llama3")

    def generate_project_plan(self, input_data: AIPlanningInput) -> Dict[str, Any]:
        try:
            import urllib.request
            import json
            headers = {
                "Content-Type": "application/json",
            }
            prompt_content = f"""
            Analyze the following software project and decompose it into a structured engineering delivery plan.
            Project Name: {input_data.project_name}
            Project Type: {input_data.project_type.value}
            Granularity: {input_data.granularity.value}
            Description: {input_data.project_description}
            Business Objective: {input_data.business_objective or 'N/A'}
            Functional Requirements: {input_data.functional_requirements or 'N/A'}
            Technical Requirements: {input_data.technical_requirements or 'N/A'}
            Tech Stack: {input_data.technology_stack or 'N/A'}

            Respond ONLY with a valid JSON object matching this schema:
            {{
              "summary": {{
                "project_name": "...",
                "business_objective": "...",
                "primary_users": "...",
                "core_value_proposition": "...",
                "identified_modules": ["Module 1", "Module 2"]
              }},
              "tasks": [
                {{
                  "title": "Task Title",
                  "description": "Detailed explanation",
                  "module": "Module Name",
                  "priority": "HIGH",
                  "complexity": "MEDIUM",
                  "estimated_hours": 16.0,
                  "required_skills": [{{"skill_name": "Python", "required_level": 80}}],
                  "dependencies": ["Preceding Task Title"],
                  "acceptance_criteria": ["Criteria 1"]
                }}
              ]
            }}
            """

            payload = {
                "model": self.model_name,
                "prompt": prompt_content,
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }

            req = urllib.request.Request(
                f"{self.host}/api/generate",
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=60) as response:
                res_body = json.loads(response.read().decode("utf-8"))
                content_str = res_body["response"]
                parsed = json.loads(content_str)
                parsed["ai_provider"] = "ollama"
                parsed["ai_model"] = self.model_name
                parsed["prompt_version"] = "v1.0-ollama"
                return parsed

        except Exception as e:
            logger.error(f"Ollama API planning call failed: {str(e)}. Falling back to HeuristicPlanningProvider.")
            mock_res = HeuristicPlanningProvider().generate_project_plan(input_data)
            mock_res["ai_provider"] = "ollama-fallback-heuristic"
            return mock_res

def get_ai_planning_provider() -> AIPlanningProvider:
    """Factory returning configured AI planning provider."""
    provider_type = os.getenv("AI_PROVIDER", "heuristic").lower()
    if provider_type == "openai":
        return OpenAIPlanningProvider()
    if provider_type == "ollama":
        return OllamaPlanningProvider()
    return HeuristicPlanningProvider()

def get_available_providers() -> List[Dict[str, Any]]:
    import urllib.request
    import urllib.error
    
    providers = []
    
    # Heuristic
    providers.append({
        "id": "heuristic",
        "name": "Heuristic Rule-Based Engine",
        "type": "Rule-Based Heuristic",
        "is_active": True,
        "description": "Deterministic, rule-based planner. Fast, offline, and reliable."
    })
    
    # OpenAI
    api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY")
    providers.append({
        "id": "openai",
        "name": "OpenAI Models",
        "type": "Generative AI",
        "is_active": bool(api_key),
        "description": "Cloud-based LLM planning. Requires API Key."
    })
    
    # Ollama
    host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    is_ollama_active = False
    try:
        req = urllib.request.Request(f"{host}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=2) as response:
            if response.status == 200:
                is_ollama_active = True
    except Exception:
        pass
        
    providers.append({
        "id": "ollama",
        "name": "Ollama Local LLM",
        "type": "Generative AI",
        "is_active": is_ollama_active,
        "description": f"Local LLM via Ollama ({host}). Free and private."
    })
    
    return providers
