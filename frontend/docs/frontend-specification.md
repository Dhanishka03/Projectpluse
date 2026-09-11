# Frontend Specification — Projectpluse

> This document defines the UI/UX requirements for the Projectpluse frontend.
> It was originally written as a Lovable build spec. The frontend has been implemented
> against mock data. API integration with the FastAPI backend comes next.

---

## 1. Product Brief

Build a web app for hackathon organizers to review GitHub-based hackathon submissions.

The core idea: instead of trusting a README, the app shows what a team _claimed_ to build next to what evidence was actually found in their code, so organizers can verify submissions quickly across a large batch.

**Tone:** calm, evidence-driven, and professional — like a code review tool or an audit dashboard, not a gamified leaderboard. Think Linear or Vercel's dashboard aesthetic: clean, data-dense but not cluttered, confident use of whitespace, no unnecessary decoration.

---

## 2. Pages / Routes

| Route                                       | Purpose                                                                 | Priority |
| ------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| `/`                                         | Landing / hackathon list                                                | P1       |
| `/hackathons/new`                           | Create a hackathon (name, dates, problem statement, upload submissions) | P1       |
| `/hackathons/:id`                           | Dashboard — overview stats + submission table                           | P1       |
| `/hackathons/:id/submissions/:submissionId` | Detail page — claims, evidence, verification                            | P1       |
| `/hackathons/:id/analyzing`                 | Progress screen shown while analysis runs                               | P2       |
| `/hackathons/:id/settings`                  | Edit problem statements, re-run analysis                                | P3       |

---

## 3. Page-by-Page Detail

### 3.1 `/` — Hackathon List

- Simple list/grid of hackathon cards: name, submission count, date range, status badge (`Draft` / `Analyzing` / `Complete`).
- Empty state: centered message + "Create Hackathon" button — clean typography, no clipart.
- Primary CTA button top-right: "New Hackathon".

### 3.2 `/hackathons/new` — Create Hackathon

A short linear form (one scrollable page for MVP):

1. **Hackathon name** — text input
2. **Submission period** — two datetime pickers (start / end)
3. **Problem statement(s)** — repeatable block: title + description textarea. "+ Add another problem statement" link below.
4. **Submissions** — CSV upload dropzone OR "paste rows" textarea. Expected columns shown as hint: `id, teamname, problem statement, github link`.
5. Submit button: "Validate & Continue" → runs client-side validation before allowing submission.

**Validation feedback (shown inline, not in a modal):**

```
✓ 42 rows parsed
✓ 40 valid GitHub URLs
⚠ 2 rows missing a GitHub link — will be skipped
```

### 3.3 `/hackathons/:id/analyzing` — Progress Screen

- Large centered progress indicator: "Analyzing 8 of 42 submissions"
- Progress bar
- Live-updating list showing each submission: `Team Alpha — done ✓`, `Team Nova — analyzing...`, `Team Vertex — queued`
- "This may take a few minutes" caption.

### 3.4 `/hackathons/:id` — Organizer Dashboard

**Top stat bar** (4 stat cards, horizontal row):

```
[ 42 Submissions ]  [ 38 Analyzed ]  [ 3 Need Review ]  [ 1 Failed ]
```

**Submission table columns:**

| #   | Team | Problem Statement | Relevance | Claims Verified | Issues | Status | →   |
| --- | ---- | ----------------- | --------- | --------------- | ------ | ------ | --- |

- `Relevance`: colored pill (green ≥80, amber 50–79, red <50).
- `Claims Verified`: `8/10` with a small dot cluster (●●●●●●●●○○).
- `Issues`: count badge; 0 issues in muted gray, 1+ in amber/red.
- `Status`: text badge (`Verified` / `Review` / `Failed`).
- Row click → navigates to submission detail page.
- Table is sortable by Relevance, Claims Verified, Issues.

**Filter bar above table**: dropdown filters for Problem Statement, Status, and a relevance range slider. Client-side filtering — no reload.

### 3.5 `/hackathons/:id/submissions/:submissionId` — Submission Detail

This is where the actual product value is shown. Structure top to bottom:

**Header block:**

```
TEAM ALPHA
AI Task Manager
[GitHub link icon] github.com/team-alpha/task-manager

Problem Statement: Automating Repetitive Tasks
Relevance: 94/100          Overall Verification: 8/10 (HIGH)
```

**Claims list** — collapsed by default, expands on click (accordion):

```
✓ Gmail integration                              VERIFIED
✓ Task extraction                                VERIFIED
✓ Calendar integration                           VERIFIED
⚠ Automatic scheduling                    PARTIALLY VERIFIED
✗ Voice interaction                              NOT FOUND
```

- ✓ green (VERIFIED), ⚠ amber (PARTIALLY VERIFIED), ✗ muted gray-red (NOT FOUND)
- Expanding a claim reveals the evidence panel inline:

```
FOUND:
  ✓ tools/calendar.py:42 — Calendar API client usage
  ✓ requirements.txt:8 — Google API dependency

NOT FOUND:
  ✗ No event-creation / scheduling logic detected

FINDING:
  The repository supports calendar access, but sufficient evidence
  for automatic meeting scheduling was not found.
```

- Evidence file paths are monospace links → open GitHub file in new tab (`github.com/.../blob/main/{path}#L{line}`)

**Issues summary panel** (above claims list):

```
2 Issues Found

⚠ CLAIM OVERSTATED — "Automatic scheduling"
   Calendar integration exists, but event creation/scheduling logic was not found.

⚠ CLAIM NOT VERIFIED — "Voice interaction"
   No relevant voice-processing implementation was found.
```

Each issue scrolls/jumps to the corresponding claim when clicked.

---

## 4. Design Direction

- **Palette:** neutral base (off-white / very light gray background, near-black text), teal/indigo accent for primary actions. Status colors: green/amber/gray-red — muted, professional.
- **Typography:** Inter for UI text; JetBrains Mono for code-related content (file paths, line numbers, evidence).
- **Density:** data-review tool used for scanning many submissions. Compact rows, clear hierarchy.
- **No illustrations, no gradients, no decorative icons.** Icons used functionally only.
- **Motion:** minimal. Accordion expand/collapse has subtle transition; avoid page-transition animations.

---

## 5. Data Models

```typescript
interface Hackathon {
  id: string;
  name: string;
  submissionStart: string; // ISO date
  submissionEnd: string;
  problemStatements: ProblemStatement[];
  status: "draft" | "analyzing" | "complete";
  stats: {
    totalSubmissions: number;
    analyzed: number;
    needsReview: number;
    failed: number;
  };
}

interface ProblemStatement {
  id: string;
  title: string;
  description: string;
}

interface Submission {
  id: string;
  teamName: string;
  projectName: string;
  githubUrl: string;
  problemStatementId: string;
  relevanceScore: number; // 0-100
  claimsVerifiedCount: number;
  claimsTotalCount: number;
  issuesCount: number;
  status: "verified" | "review" | "failed";
  failureReason?: string;
  claims: Claim[];
  issues: Issue[];
}

interface Claim {
  id: string;
  text: string;
  status: "verified" | "partially_verified" | "not_found";
  evidence: Evidence[];
  finding: string; // one-sentence explanation
}

interface Evidence {
  file: string;
  line?: number;
  type: "code" | "dependency";
  description: string;
  found: boolean; // true = "found" list, false = "not found" list
}

interface Issue {
  id: string;
  claimId: string;
  type: "overstated" | "not_verified";
  title: string;
  description: string;
}
```

---

## 6. States to Handle

- **Empty state** — no hackathons / no submissions yet
- **Loading state** — skeleton rows in the table while data loads
- **Analyzing state** — dedicated progress page
- **Partial failure** — submission that failed to analyze shown with "Failed" badge and reason tooltip, not hidden
- **Zero-claims edge case** — "No claims could be extracted from this README."

---

## 7. Build Priority

1. Submission table on the dashboard — most judged demo screen
2. Submission detail page with expandable claims + evidence
3. Hackathon creation form
4. Landing / hackathon list page
5. Analyzing / progress page
6. Filters + sorting on the table
7. Stretch: confidence distribution chart, "Mark as Reviewed" checkbox, settings page

---

## 8. Future Backend Integration

The frontend is designed to replace mock data with real API calls once the FastAPI backend is ready.

Expected API surface (not yet implemented):

| Endpoint                                        | Purpose                |
| ----------------------------------------------- | ---------------------- |
| `GET /hackathons`                               | List all hackathons    |
| `POST /hackathons`                              | Create a hackathon     |
| `GET /hackathons/:id`                           | Get hackathon + stats  |
| `GET /hackathons/:id/submissions`               | List submissions       |
| `GET /hackathons/:id/submissions/:submissionId` | Get submission detail  |
| `POST /hackathons/:id/analyze`                  | Trigger analysis job   |
| `GET /hackathons/:id/analysis-status`           | Poll analysis progress |

All state management should assume eventual async API calls (React Query is already set up).
