# Projectpluse

**AI-powered hackathon submission verification.**

Projectpluse helps hackathon organizers verify whether a team's GitHub repository actually supports the claims made in their submission — quickly, at scale, with clear evidence.

---

## The Problem

Hackathon organizers receive dozens or hundreds of submissions, each with a README that claims to implement various features. Manually reviewing each repository is slow, inconsistent, and doesn't scale. Teams may overstate what they built — or genuinely implement something the README fails to describe well.

## The Solution

Projectpluse analyzes each submitted GitHub repository and compares the claims in the README with actual evidence found in the code. Instead of showing an opaque AI score, it shows _why_ a claim is verified or not — with file paths, line numbers, and a concise finding.

## How It Works

```
Hackathon → Submissions → GitHub Repository
  → README Analysis → Claim Extraction
  → Repository / Code Analysis → Evidence Detection
  → Claim Verification → Relevance + Verification Score
  → Organizer Dashboard
```

The core concept:

```
Claim → Evidence → Reasoning → Verification Result
```

Possible results per claim:

- **Verified** — clear supporting evidence found
- **Partially Verified** — some evidence found, claim likely overstated
- **Not Found** — no relevant evidence detected (may mean missing, not necessarily false)

---

## Main Features

- **Hackathon management** — create hackathons with problem statements and submission CSV uploads
- **Analysis progress tracking** — live view of per-submission analysis status
- **Organizer dashboard** — submission table with relevance scores, claims verified, issues, status; sortable and filterable
- **Submission detail view** — expandable claim cards with found/not-found evidence, file links, and AI findings
- **Issue highlighting** — overstated or unverified claims surfaced prominently
- **Evidence-linked file paths** — each piece of evidence links to the actual GitHub file/line

---

## Frontend Technology

| Technology      | Role                                |
| --------------- | ----------------------------------- |
| React 19        | UI framework                        |
| TypeScript      | Type-safe development               |
| TanStack Start  | Full-stack React framework (SSR)    |
| TanStack Router | File-based routing                  |
| Vite            | Build tool                          |
| Tailwind CSS v4 | Utility-first styling               |
| shadcn/ui       | Accessible UI components (Radix UI) |
| Lucide React    | Icons                               |

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/Radix UI primitives (used ones only)
│   │   └── verifier/         # Projectpluse-specific components
│   │       ├── pills.tsx     # Status badges, relevance pills, claims meter
│   │       └── shell.tsx     # App shell layout and breadcrumbs
│   ├── hooks/                # Reusable React hooks
│   ├── lib/
│   │   ├── types.ts          # Shared TypeScript types
│   │   ├── mock-data.ts      # Mock data (used until backend is ready)
│   │   ├── utils.ts          # Utility functions (cn, etc.)
│   │   ├── error-capture.ts  # Server-side error capture
│   │   ├── error-page.ts     # SSR error page renderer
│   │   └── lovable-error-reporting.ts  # Error reporting bridge
│   ├── routes/
│   │   ├── __root.tsx        # Root layout, QueryClient, meta
│   │   ├── index.tsx         # / — Hackathon list
│   │   └── hackathons/
│   │       ├── new.tsx       # /hackathons/new — Create hackathon
│   │       └── $id/
│   │           ├── index.tsx          # /hackathons/:id — Dashboard
│   │           ├── analyzing.tsx      # /hackathons/:id/analyzing
│   │           ├── settings.tsx       # /hackathons/:id/settings
│   │           └── submissions/
│   │               └── $submissionId.tsx  # Submission detail
│   ├── routeTree.gen.ts      # Auto-generated — do NOT edit manually
│   ├── router.tsx            # Router configuration
│   ├── server.ts             # TanStack Start server entry / SSR wrapper
│   ├── start.ts              # Application entry, middleware setup
│   └── styles.css            # Global styles and design tokens
├── docs/
│   └── frontend-specification.md  # Detailed UI/UX specification
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── components.json           # shadcn/ui configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── AGENTS.md                 # Instructions for AI coding agents
└── FRONTEND.md               # Original frontend specification (preserved)
```

---

## Current Implementation Status

| Feature                           | Status                               |
| --------------------------------- | ------------------------------------ |
| Hackathon list page               | ✅ Implemented (mock data)           |
| Create hackathon form             | ✅ Implemented (client-side only)    |
| Analysis progress page            | ✅ Implemented (simulated)           |
| Organizer dashboard               | ✅ Implemented (mock data)           |
| Submission detail + evidence view | ✅ Implemented (mock data)           |
| Sorting and filtering             | ✅ Implemented (client-side)         |
| Real backend API integration      | ❌ Not yet — planned FastAPI backend |
| GitHub repository analysis        | ❌ Not yet — planned AI pipeline     |
| Authentication                    | ❌ Not yet — planned                 |

---

## Planned Backend

The frontend is designed to connect to a future FastAPI backend:

```
Frontend (React / TanStack)
  ↓
FastAPI Backend
  ↓ GitHub API
  ↓ Repository cloning / analysis
  ↓ README parsing → Claim extraction
  ↓ Code search → Evidence detection
  ↓ LLM reasoning → Verification result
  ↓ Database (PostgreSQL)
  ↓
Frontend (results display)
```

The data models in `src/lib/types.ts` are designed to match the expected API contract.

---

## Installation & Development

```bash
# Clone the repository
git clone <repository-url>
cd Projectpluse/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run lint
npm run lint
```

> **Node.js** is required. Install via [nvm](https://github.com/nvm-sh/nvm).

---

## Documentation

- [`AGENTS.md`](./AGENTS.md) — Instructions for AI coding agents working on this project
- [`docs/frontend-specification.md`](./docs/frontend-specification.md) — Detailed UI/UX specification
- [`FRONTEND.md`](./FRONTEND.md) — Original Lovable build specification (preserved for reference)
