# Local AI & Ollama Beginner Guidebook

Welcome to the DevAlign AI Planning documentation! This guide is designed for beginners who want to understand how DevAlign AI generates project plans, how to run AI completely locally on your own computer, and the differences between various AI methods. 

---

## IMPORTANT — Current DevAlign AI Behavior

Before we begin, here are the quick facts about how DevAlign AI is currently configured:

- **Do I need an API key?** No. 
- **Do I need Ollama?** No. 
- **Can the application run without Ollama?** Yes. By default, it uses a built-in rule-based system.
- **Is the heuristic planner real AI?** No. It is a deterministic, rule-based algorithm that maps your inputs to predefined task templates.
- **Is Ollama real generative AI?** Yes. Ollama runs a real Large Language Model (LLM) on your local machine.
- **Does Ollama cost API money?** No. It is completely free from API charges.
- **Does local AI require computer resources?** Yes. It will use your laptop's CPU, GPU (if available), RAM, and disk space.
- **What happens if Ollama is unavailable?** The system will automatically fall back to the heuristic planner. DevAlign AI will not crash.
- **Does the system automatically assign developers?** No. AI Planning only suggests tasks. Developer assignment is a separate human-controlled workflow using the `baseline-v2` recommendation engine.

---

## How DevAlign AI Planning Works

DevAlign AI separates *project planning* from *developer assignment*. The flow works like this:

1. **User enters project information** (name, description, tech stack).
2. **DevAlign AI Planning Provider** receives the request.
3. **Selected provider** (Heuristic, Ollama, or OpenAI) analyzes the data.
4. **Plan generation** occurs.
5. **Tasks + dependencies + skills + estimates** are returned as a draft.
6. **Manager reviews plan** in the UI.
7. **Manager approves** the plan.
8. **Real Project + Tasks are created** in the database.
9. **baseline-v2 recommendation engine** analyzes the new tasks.
10. **Developer recommendations** are presented for human assignment.

**AI planning suggests tasks. Approval creates real database records. AI does NOT automatically assign developers.**

---

## The Three Providers

DevAlign AI supports three different "Providers" for generating plans.

| Provider | What it is | Requires API key? | Requires internet? | Requires model download? | Costs money? | Runs locally? | Quality/type of output | Recommended use |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Heuristic** | Rule-based code logic | No | No | No | Free | Yes | Highly structured, predictable, template-based | Instant, reliable plans without setup. |
| **Ollama** | Local Generative AI (LLM) | No | No (after download) | Yes | Free (uses hardware) | Yes | Creative, nuanced, context-aware | Private, real generative AI without API costs. |
| **OpenAI** | Cloud Generative AI (LLM) | Yes | Yes | No | Yes (API billing) | No | Creative, highly intelligent, state-of-the-art | Maximum intelligence when privacy/cost is not a concern. |

### Heuristic
The `HeuristicPlanningProvider` uses rule-based logic written in Python code. It is **NOT** a Large Language Model. It simply looks for keywords (like "React" or "PostgreSQL") in your description and builds a plan from high-quality templates. It is free, instant, and requires no external tools.

### Ollama
Ollama is software that allows a Large Language Model (LLM) to run locally on your computer. 
**Flow:** DevAlign AI → Ollama → Local LLM → Generated project plan.
Ollama itself is not the AI model; it is the runtime (like a media player) that runs models (like movies). We currently support models like `llama3`.

### OpenAI
OpenAI uses a remote API. 
**Flow:** DevAlign AI → Internet → OpenAI API → LLM response → DevAlign AI.
This requires an active API key and an internet connection, and you are billed per request.

---

## What Does "Free" Actually Mean?

There is a difference between a "Free API" and "Free local AI".

When you use **Ollama**, there is **no per-request API charge** because the model runs on your own computer. You don't need a credit card or an API key.

However, local AI is **NOT literally zero-cost**. The costs are paid in computer resources:
- Electricity
- Disk storage (models are large files, often 4GB - 8GB)
- RAM usage
- CPU/GPU usage (your laptop may get warm and fans may spin loudly)
- Time required to download the model

If your friend installs Ollama and a local model: They will have no OpenAI API bill, but their laptop will perform the heavy mathematical computation itself.

---

## What is a Local LLM?

**LLM** stands for **Large Language Model**.

A model is a large collection of mathematical parameters stored in a huge file on your hard drive. It has "learned" how to understand and generate text by analyzing vast amounts of data.

**Simple Analogy:**
- **Ollama** = The Media Player (VLC, Windows Media Player)
- **LLM Model** = The Movie File (.mp4)
- **DevAlign AI** = You, asking the media player to play the movie.

*(Note: This analogy is just for understanding. Models generate responses dynamically; they are not pre-recorded videos!)*

---

## Exact Ollama Setup Guide for Windows

Follow these steps to run a real AI on your laptop.

### STEP 1: Check Laptop Specifications
Before installing, check your laptop specs (Task Manager -> Performance tab).
- **RAM**: 8GB is the minimum. 16GB is the comfortable recommendation.
- **CPU/GPU**: A dedicated GPU helps, but modern CPUs can run small models fine.
- **Free Disk Space**: You need at least 5GB to 10GB of free space.

### STEP 2: Install Ollama
Download Ollama from the official website: [https://ollama.com/download](https://ollama.com/download)
Run the Windows installer.

### STEP 3: Verify Installation
Open a terminal (PowerShell or Command Prompt) and type:
```bash
ollama --version
```
It should print the installed version.

### STEP 4: Download a Model
A model must be downloaded once. We will use `llama3`. Type:
```bash
ollama pull llama3
```
This will download a large file. It occupies disk space, but future usage does not require downloading it again.

### STEP 5: Run the Model
To verify the model works, type:
```bash
ollama run llama3
```
You can chat with it in the terminal. Type `/bye` to exit.

### STEP 6: Verify Ollama is Responding
Ollama runs a background server. Open your web browser and go to:
`http://localhost:11434`
It should display "Ollama is running".

### STEP 7: Configure DevAlign AI
In your DevAlign AI `backend/.env` file, set these environment variables:
```env
AI_PROVIDER=ollama
AI_MODEL=llama3
OLLAMA_HOST=http://localhost:11434
```

### STEP 8: Start Backend
Open a terminal in the `backend` folder and run:
```bash
uvicorn app.main:app --reload --port 8000
```

### STEP 9: Start Frontend
Open a new terminal in the `frontend` folder and run:
```bash
npm run dev
```

### STEP 10: Open AI Planning
Open your browser to `http://localhost:3000/ai-planning`. You can now generate plans using your local AI!

---

## Understanding the Ollama Server (`http://localhost:11434`)

When you see `http://localhost:11434`:
- **localhost** means "this same computer".
- **11434** is the port number where Ollama listens for requests.

This does **NOT** mean the model is running on the internet. Your data never leaves your laptop.

**Data Flow:**
Browser → DevAlign Frontend (localhost:3000) → DevAlign FastAPI (localhost:8000) → Ollama (localhost:11434) → Local LLM.

---

## What Happens Without Ollama?

If Ollama is not installed, the application will still work flawlessly.
DevAlign AI will automatically use the `HeuristicPlanningProvider`.
No Ollama installation is mandatory unless you specifically want local generative AI.

## What Happens if Ollama Fails?

Because DevAlign AI is built for resilience, here is exactly what happens in failure scenarios (e.g., Ollama is stopped, model is missing, connection refused, or it times out):
- **Does it show an error?** No. 
- **Does generation continue?** Yes. 
- **What does DevAlign AI do?** It logs an internal error and automatically falls back to the `HeuristicPlanningProvider`.
- **How will you know?** The "Planned by" badge in the UI will display `Rule-Based Heuristic`, and the exact provider string in the database will be recorded as `ollama-fallback-heuristic`.

---

## OpenAI vs Ollama vs Heuristic (Decision Guide)

- If you want **"No installation, completely simple"** → **Heuristic**
- If you want **"Real generative AI without API charges"** → **Ollama + local model**
- If you want **"Cloud LLM"** → **OpenAI**

---

## How Will My Friend Run This Project?

### SETUP A — WITHOUT LOCAL AI (Easiest)
Your friend installs Git, Node.js, Python, PostgreSQL, and project dependencies. They start the app. 
**Ollama is NOT required.** The heuristic planner works automatically.

### SETUP B — WITH LOCAL AI (Advanced)
Everything above PLUS: Ollama and a compatible local model (`ollama pull llama3`).
The application code does **not** need to be changed. Your friend just updates their `.env` file to set `AI_PROVIDER=ollama`.
*(Reminder: Never commit your `.env` file to Git!)*

---

## Beginner Setup Checklist

- [ ] Git installed
- [ ] Node.js installed
- [ ] Python installed
- [ ] PostgreSQL installed/running
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Database configured (`.env` file created)
- [ ] Migrations applied (`alembic upgrade head`)
- [ ] DevAlign backend running (`uvicorn`)
- [ ] DevAlign frontend running (`npm run dev`)
- [ ] Heuristic planner verified (generate a plan without Ollama)
- [ ] Ollama installed (optional)
- [ ] Ollama model downloaded (optional)
- [ ] Ollama server verified (`http://localhost:11434`)
- [ ] DevAlign connected to Ollama (`.env` updated)
- [ ] AI planning test completed with Ollama

---

## First-Time Ollama Walkthrough (Do This Exactly)

1. **Install Ollama** from ollama.com.
2. **Open terminal** and type `ollama --version`.
3. **Download model** by typing `ollama pull llama3`. Wait for it to finish.
4. **Check Ollama** by opening `http://localhost:11434` in your browser.
5. **Configure DevAlign** by setting `AI_PROVIDER=ollama` in `backend/.env`.
6. **Start backend** (`uvicorn app.main:app --reload`).
7. **Start frontend** (`npm run dev`).
8. **Open AI Planning** in your browser (`http://localhost:3000/ai-planning`).
9. **Generate a plan** by filling out the form.
10. **Verify provider**: On the plan page, look below the description. The badge should say "Planned by: 🤖 Generative AI" and "Model: llama3".
11. **Stop Ollama** (Quit the Ollama app from your Windows system tray).
12. **Generate another plan** in the UI.
13. **Verify fallback**: The new plan's badge will say "Planned by: 🧠 Rule-Based Heuristic". The fallback works!

---

## Demo Script for College / Viva

*"First, I will show the project planner in heuristic mode. The system uses a deterministic algorithm to generate tasks without any external APIs."*
*(Generate plan)*
*"Now, I will enable Ollama. The application detects the local provider."*
*(Change `.env`, generate plan)*
*"This new plan is generated by a local LLM running directly on my laptop, rather than a cloud API."*
*"Next, I will simulate an AI failure by stopping Ollama."*
*(Stop Ollama, generate plan)*
*"As you can see, the system automatically falls back to the deterministic heuristic planner. This means the application remains completely functional and production-safe even if the AI service crashes."*

---

## Data Privacy

- **Heuristic**: No external AI request. Everything stays in Python memory.
- **Ollama**: Your project prompt stays entirely on your local machine. No data is sent to the internet.
- **OpenAI**: Data is sent to the external API (OpenAI's servers) according to their API configuration and policies.

---

## Troubleshooting

| Problem | Possible cause | How to check | How to fix |
| :--- | :--- | :--- | :--- |
| `ollama` command not found | Not installed or not in PATH | Type `ollama` in terminal | Reinstall Ollama and restart terminal |
| `localhost:11434` unavailable | Ollama service is stopped | Go to URL in browser | Start the Ollama app from Start menu |
| Model not found / wrong name | Typo in `.env` or not downloaded | Run `ollama list` | Run `ollama pull llama3` or fix `.env` |
| DevAlign says provider unavailable | Backend not reading `.env` | Check backend terminal logs | Restart backend terminal |
| Heuristic fallback unexpectedly triggered | Ollama timeout or error | Check backend terminal for `logger.error` | Ensure Ollama is running and model exists |
| Laptop becomes slow | Model is consuming RAM/CPU | Open Task Manager | Close heavy apps, or use a smaller model |
| Insufficient disk space | Drive is full | Check Windows File Explorer | Delete old models with `ollama rm <model>` |

---

## Explaining Performance

Local AI can be slower than cloud AI like ChatGPT.
- **CPU vs GPU Inference**: Cloud providers use massive server GPUs. Your laptop likely uses its CPU, which calculates tokens much slower.
- **RAM**: LLMs require significant RAM. If your laptop runs out of RAM, it uses the hard drive (swap), which is extremely slow.
- **Model Size**: Larger models are smarter but slower. `llama3` (8B parameters) is a good balance for modern laptops.

---

## Model Downloads & Storage

When you run `ollama pull llama3`, the model is downloaded locally to your laptop. It remains on your hard drive (typically in `C:\Users\<YourUser>\.ollama\models` on Windows). Deleting the model (`ollama rm llama3`) frees up disk space immediately. Changing to a different model means you must download that new model file.

---

## Security & Git Rules

- **Never commit API keys** to GitHub.
- Never commit your `.env` files. Ensure `.env` is in your `.gitignore`.
- Ollama **does not** require an OpenAI API key.
- Safe values to commit: `OLLAMA_HOST=http://localhost:11434` (it's just a local URL, not a secret).
- Unsafe values: `OPENAI_API_KEY=sk-...`

---

## Architecture Diagrams

**A. Heuristic Mode**
```text
[DevAlign Backend] ---> [Heuristic Rules Engine] ---> [Generated Plan]
```

**B. Ollama Mode**
```text
[DevAlign Backend] ---> [Localhost:11434 (Ollama)] ---> [Local LLM] ---> [Generated Plan]
```

**C. OpenAI Mode**
```text
[DevAlign Backend] ---> [Internet] ---> [OpenAI API] ---> [Generated Plan]
```

**D. Fallback Architecture**
```text
[DevAlign Backend] ---> [Ollama / OpenAI] --(Fails)--> [Heuristic Rules Engine] ---> [Generated Plan]
```

---

## Provider Status Explanation

DevAlign AI includes an endpoint:
`GET /api/v1/ai-planning/providers`

**What it checks**: It actively reads your `.env` file and attempts to ping `http://localhost:11434/api/tags` to see if Ollama is awake.
**What it returns**: An array of providers indicating if they are `is_active: true` or `false`.
**How the frontend uses it**: The AI Planning dashboard reads this array and displays the name of the currently active provider in the Preview Card.
**"Planned by" Badge**: After a plan is created, the backend saves the `ai_provider` string in the database. The frontend reads this string and renders either a "Rule-Based Heuristic" or "Generative AI" visual badge.

---

## Quick Answer Summary

- **Heuristic planner** = Free, no API key required, no Ollama required.
- **Ollama** = Free local software for running an LLM.
- **Local LLM** = A downloaded model running directly on your computer's hardware.
- **Ollama itself does not charge per API request.**
- **Local AI still consumes computer resources** (RAM, CPU, disk space).
- **OpenAI** = An optional cloud provider requiring paid API access.
- **DevAlign will continue working without Ollama** through the built-in heuristic fallback.
- **Developer assignment remains a separate human-controlled workflow.** (AI only suggests the tasks).
