# AGENTS.md

## Project Overview

Projectpulse is an AI-powered hackathon submission verification platform. It compares claims in a team's README with evidence found in its GitHub repository.

The system will:

- Accept hackathon problem statements and submissions.
- Analyze GitHub repositories and README files.
- Extract and verify project claims.
- Classify claims as `verified`, `partially_verified`, or `not_found`.
- Identify unsupported or overstated claims.
- Calculate relevance and verification scores.
- Display clear evidence to organizers.

The current repository primarily contains the frontend. Do not assume the AI backend is implemented.

## Instructions for AI Agents

- Inspect existing code before making changes.
- Reuse existing components, hooks, utilities, and styles.
- Make small, focused changes.
- Do not rewrite unrelated code.
- Do not delete files without checking imports and generated status.
- Avoid unnecessary dependencies.
- Preserve the existing architecture and visual style.
- Keep the frontend compatible with the planned FastAPI backend.
- Handle loading, empty, error, and analyzing states.
- Never expose secrets or credentials.

## Technology Stack

- React
- TypeScript
- TanStack Start
- TanStack Router
- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI

Follow the existing stack and package manager.

## Main Routes

```text
/                                          Hackathon list
/hackathons/new                            Create hackathon
/hackathons/:id/analyzing                  Analysis progress
/hackathons/:id                            Organizer dashboard
/hackathons/:id/submissions/:submissionId  Submission details
```

## Core UI Requirements

The dashboard should show:

- Submission statistics
- Relevance scores
- Verified claims
- Issues
- Status
- Filtering and sorting

Submission details should show:

- Team and project information
- GitHub link
- Claims
- Verification status
- Supporting evidence
- Issues and findings

Evidence should be clear and link to GitHub files or lines when possible.

## Data and Verification

Use the existing data models unless the backend contract requires changes.

Verification must be evidence-driven:

```text
Claim → Evidence → Reasoning → Result
```

Do not present AI conclusions as unquestionable facts. Clearly communicate uncertainty.

## Generated Files

Do not manually edit generated files such as:

```text
src/routeTree.gen.ts
```

Modify the source routes or configuration instead.

## Code Quality

- Use clear TypeScript types.
- Avoid `any` when possible.
- Keep components and functions focused.
- Use descriptive names.
- Keep API, business logic, and presentation reasonably separated.
- Preserve accessibility and responsive design.
- Run formatting, linting, and build checks when available.

## Security

Treat GitHub repositories and user input as untrusted.

Do not execute submitted code directly. Never commit API keys, tokens, passwords, or environment variables.

## Core Principle

Projectpulse should help organizers answer:

> Does the submitted GitHub repository actually support what the team claims it supports?

Every feature should make that answer clearer and evidence-based.
