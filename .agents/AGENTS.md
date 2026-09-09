# AGENTS.md — Projectpluse Workspace

## Workspace Structure

```
Projectpluse/
├── frontend/           # React/TanStack Start frontend (current focus)
│   ├── src/
│   ├── docs/
│   ├── AGENTS.md       # Frontend-specific agent instructions
│   └── README.md       # Project README
├── FRONTEND (1).md     # Original frontend specification (reference)
└── PROJECT (2).md      # Original project specification (reference)
```

## Project Purpose

Projectpluse is an AI-powered hackathon submission verification platform.

It helps hackathon organizers verify whether a team's GitHub repository actually supports the claims made in their README.

**Core workflow:**
```
Hackathon → Submissions → GitHub Repository
  → README Analysis → Claim Extraction
  → Repository / Code Analysis → Evidence Detection
  → Claim Verification → Relevance + Verification Score
  → Organizer Dashboard
```

**Core concept:**
```
Claim → Evidence → Reasoning → Verification Result
```

## Current State

The `frontend/` directory contains a functional React frontend with mock data.

The backend (FastAPI + GitHub analysis + LLM reasoning) has **not yet been implemented**.

## Key Instructions

- Always inspect `frontend/` before making changes.
- Read `frontend/AGENTS.md` for frontend-specific instructions.
- Read `frontend/docs/frontend-specification.md` for UI/UX requirements.
- Do not implement backend behavior as if it were real.
- Use mock data until a real backend exists.
- Never commit API keys, tokens, or credentials.
- Do not rebuild the frontend from scratch.
- Preserve the existing architecture and visual style.

## Planned Future Directories

```
Projectpluse/
├── frontend/     # This directory (React frontend)
├── backend/      # Planned: FastAPI backend
└── docs/         # Planned: shared architecture documentation
```
