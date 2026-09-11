# DEVAlign COMPLETE VIVA GUIDE — System Defense Manual

This guide provides deep technical defenses, 20-second elevator pitches, 1-minute detailed explanations, and answers to examiner questions across all core features of DevAlign AI.

---

## Feature Defense Specifications

### 1. Deterministic Recommendation Engine (`baseline-v2`)
- **What it does**: Matches unassigned tasks with optimal developers based on skill overlap, availability status, current workload capacity, and historical performance metrics.
- **20-Second Pitch**: "DevAlign AI uses a enterprise-grade deterministic decision engine that applies strict hard constraints—such as blocking overloaded developers over 100% capacity—and calculates multi-vector compatibility scores without non-deterministic AI hallucinations."
- **1-Minute Explanation**: "In production resource management, allocation systems must be 100% predictable and sub-millisecond fast. `baseline-v2` takes required task skills and developer profiles, verifies availability, and applies hard filters. For eligible candidates, it computes a weighted linear sum of skill match percentage (45%), availability (25%), performance (15%), and workload penalty (15%). It logs recommendation audits and candidate explanations for manager transparency."

---

### 2. Multi-Provider AI Project Planner Wizard (`/ai-planning`)
- **What it does**: Translates high-level natural language project descriptions into structured system module decompositions, estimated task effort, priority ratings, and skill requirement sets.
- **20-Second Pitch**: "Our AI Project Planner translates natural language system requirements into structured delivery plans, automatically creating projects, tasks, and skill requirements in PostgreSQL through a modular multi-provider architecture."
- **1-Minute Explanation**: "The planner supports 3 providers: a built-in Heuristic Fallback Provider, a Local Ollama LLM Provider (running Llama3/Mistral locally), and an OpenAI Provider. Managers can input project goals, target users, and tech stacks across a 3-step wizard. The system generates a draft plan that managers can review, edit, and approve before it automatically seeds the database."
