# AGENTS.md — Projectpulse Workspace

## Structure
Projectpulse/
├── frontend/ # React/TanStack Start (mock data)
├── backend/ # FastAPI (in progress, see BACKEND.md + BUILD-PLAN.md)
├── BACKEND.md # backend architecture, data model, API spec
├── BUILD-PLAN.md # module build order + prompts
├── FRONTEND.md # original frontend spec
└── PROJECT.md # original project spec

## Purpose
Verifies hackathon GitHub repos against README claims:
`Claim → Evidence → Reasoning → Verification Result`

## Rules
- Read `BACKEND.md` + `BUILD-PLAN.md` before touching `backend/`. Build one module at a time, in order — don't skip ahead of an unverified module.
- Backend response shapes must match `FRONTEND.md` section 5 exactly (field names, enum values). Never restructure for backend convenience.
- All LLM calls go through `services/llm_client.py` — nowhere else.
- Don't rebuild the frontend from scratch; keep it on mock data until a real endpoint replaces it.
- Never commit API keys/secrets — `.env` only.
- Stay in scope: no Google Sheets, custom Semgrep, 5-state verification, judge override, git-history analysis, Postgres, job queues, Docker, or auth unless explicitly asked (see `BACKEND.md`).