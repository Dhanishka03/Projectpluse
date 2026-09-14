# FRONTEND.md — Hackathon Submission Verifier (Lovable Build Spec)

> This doc is written to be pasted into Lovable directly (in full, or section by section).
> It assumes Lovable builds the **frontend only**, against **mock data** first, with API
> calls wired in afterward. Backend is FastAPI (see PROJECT.md) — this spec doesn't
> depend on it existing yet.

---

## 1. One-Paragraph Brief (paste this first)

Build a web app for hackathon organizers to review GitHub-based hackathon submissions.
The core idea: instead of trusting a README, the app shows what a team *claimed* to
build next to what evidence was actually found in their code, so organizers can verify
submissions quickly across a large batch. The tone is **calm, evidence-driven, and
professional** — like a code review tool or an audit dashboard, not a gamified leaderboard.
Think Linear or Vercel's dashboard aesthetic: clean, data-dense but not cluttered,
confident use of whitespace, no unnecessary decoration.

---

## 2. Pages / Routes

| Route | Purpose | Priority |
|---|---|---|
| `/` | Landing / hackathon list | P1 |
| `/hackathons/new` | Create a hackathon (name, dates, problem statement, upload submissions) | P1 |
| `/hackathons/:id` | Dashboard — overview stats + submission table | P1 |
| `/hackathons/:id/submissions/:submissionId` | Detail page — claims, evidence, verification | P1 |
| `/hackathons/:id/analyzing` | Progress screen shown while analysis runs | P2 |
| `/hackathons/:id/settings` | Edit problem statements, re-run analysis | P3 |

Build P1 pages fully first. P2/P3 can be stubs or skipped in the first pass.

---

## 3. Page-by-Page Detail

### 3.1 `/` — Hackathon List

- Simple list/grid of hackathon cards: name, submission count, date range, status badge (`Draft` / `Analyzing` / `Complete`).
- Empty state: centered illustration-free message + "Create Hackathon" button — no clipart, just clean typography and a button.
- Primary CTA button top-right: "New Hackathon".

### 3.2 `/hackathons/new` — Create Hackathon

A short linear form (not a wizard with progress steps — keep it to one scrollable page for the MVP):

1. **Hackathon name** — text input
2. **Submission period** — two datetime pickers (start / end)
3. **Problem statement(s)** — repeatable block: title + description textarea. "+ Add another problem statement" link below.
4. **Submissions** — CSV upload dropzone OR a "paste rows" textarea as fallback. Expected columns shown as a hint: `id, teamname, problem statement, github link`.
5. Submit button: "Validate & Continue" → runs client-side validation (see 3.2.1) before allowing submission.

**3.2.1 Validation feedback (show inline, not just on submit):**
```
✓ 42 rows parsed
✓ 40 valid GitHub URLs
⚠ 2 rows missing a GitHub link — will be skipped
```
Style this as a small inline summary card, not a modal or toast — the organizer should see it while still looking at the form.

### 3.3 `/hackathons/:id/analyzing` — Progress Screen

- Large centered progress indicator: "Analyzing 8 of 42 submissions"
- Progress bar
- Live-updating list below showing each submission as it completes: `Team Alpha — done ✓`, `Team Nova — analyzing...`, `Team Vertex — queued`
- No cancel button needed for MVP; a "This may take a few minutes" caption is enough.

### 3.4 `/hackathons/:id` — Organizer Dashboard (the main screen)

**Top stat bar** (4 stat cards, horizontal row):
```
[ 42 Submissions ]  [ 38 Analyzed ]  [ 3 Need Review ]  [ 1 Failed ]
```

**Secondary row (optional, P2):** small bar/donut chart of verification confidence distribution (High / Medium / Low), and problem-statement distribution if there are multiple.

**Submission table** — this is the core UI element. Columns:

| Rank | Team | Problem Statement | Relevance | Claims Verified | Issues | Status | ↳ |
|---|---|---|---|---|---|---|---|

- `Relevance`: numeric score styled as a small colored pill (green ≥80, amber 50–79, red <50) — not a raw number alone, the color should carry meaning at a glance.
- `Claims Verified`: shown as `8/10` with a tiny inline progress bar or dot cluster (●●●●●●●●○○).
- `Issues`: a count badge; 0 issues shown in muted gray, 1+ shown in amber/red.
- `Status`: text badge (`Verified` / `Review` / `Failed`).
- Row click → navigates to submission detail page.
- Table is sortable by Relevance, Claims Verified, Issues.
- **Filter bar above the table**: dropdown filters for Problem Statement, Status, and a relevance range slider. Filters should feel instant (client-side filtering against loaded data, no reload).

### 3.5 `/hackathons/:id/submissions/:submissionId` — Submission Detail (the second most important screen)

This is where the actual product value is shown. Structure top to bottom:

**Header block:**
```
TEAM ALPHA
AI Task Manager
[GitHub link icon] github.com/team-alpha/task-manager

Problem Statement: Automating Repetitive Tasks
Relevance: 94/100 (HIGH)          Overall Verification: 8/10 (HIGH)
```

**Claims list** — this is the centerpiece. Each claim is a card/row that's collapsed by default and expands on click:

```
✓ Gmail integration                              VERIFIED
✓ Task extraction                                VERIFIED
✓ Calendar integration                           VERIFIED
⚠ Automatic scheduling                    PARTIALLY VERIFIED
✗ Voice interaction                              NOT FOUND
```

- Icon + color per status: ✓ green (VERIFIED), ⚠ amber (PARTIALLY VERIFIED), ✗ gray-red (NOT FOUND). Keep the "not found" color muted rather than alarm-red — it's a gap, not necessarily a failure.
- Expanding a claim reveals the evidence panel underneath it, inline (accordion style, not a separate modal):

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

- Each evidence line with a file path should be a link-styled mono-font element (visually distinct from prose) — clicking it can open the file on GitHub in a new tab (`github.com/.../blob/main/{path}#L{line}`).

**Issues summary panel** (sits either above or beside the claims list, your call — above is simpler):
```
2 Issues Found

⚠ CLAIM OVERSTATED — "Automatic scheduling"
   Calendar integration exists, but event creation/scheduling
   logic was not found.

⚠ CLAIM NOT VERIFIED — "Voice interaction"
   No relevant voice-processing implementation was found.
```
Each issue should scroll/jump to its corresponding claim when clicked.

**No judge-override controls for the MVP** — this is a read-only evidence view. If you want a stretch feature, add a simple "Mark as Reviewed" checkbox per submission, nothing more elaborate.

---

## 4. Design Direction

- **Palette:** neutral base (off-white / very light gray background, near-black text), one accent color used sparingly for primary actions and links (e.g. indigo or teal — avoid default Tailwind blue-600, pick something slightly less generic). Status colors: green/amber/gray-red, muted rather than saturated — this is a professional tool, not a game.
- **Typography:** a clean sans-serif for UI text (Inter or similar), and a **monospace font for anything code-related** — file paths, line numbers, claim evidence snippets. This distinction matters: it visually signals "this is verifiable data" vs. "this is prose."
- **Density:** this is a data-review tool used by people scanning many submissions quickly. Favor compact rows and clear hierarchy over generous card-based spacing everywhere. The submission table especially should be information-dense, not airy.
- **No illustrations, no gradients, no decorative icons.** Use icons only functionally (status icons, external-link icons, sort arrows).
- **Motion:** minimal. Accordion expand/collapse can have a subtle transition; avoid page-transition animations or anything that slows down scanning many rows.

---

## 5. Data Shapes (for mock data + later API wiring)

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

Ask Lovable to generate **5–8 mock submissions** using this shape, with a realistic mix of
statuses (mostly verified, a couple with review flags, one with a failed/low-relevance
outlier) so the empty/warning states are visible without needing a real backend yet.

---

## 6. States to Handle Explicitly

- **Empty state** — no hackathons yet / no submissions yet.
- **Loading state** — skeleton rows in the table, not a spinner overlay, while data loads.
- **Analyzing state** — the dedicated progress page (3.3).
- **Partial failure** — a submission that failed to analyze (bad URL, private repo) shown distinctly in the table with a "Failed" badge and a reason tooltip, not just hidden.
- **Zero-claims edge case** — if a claim list is empty (extraction failed), show "No claims could be extracted from this README" rather than a blank section.

---

## 7. Build Priority for Lovable (in order)

1. Submission table on the dashboard, with mock data — this is the screen most people will judge the demo on.
2. Submission detail page with expandable claims + evidence.
3. Hackathon creation form.
4. Landing/hackathon list page.
5. Analyzing/progress page.
6. Filters + sorting on the table.
7. Stretch: confidence distribution chart, "Mark as Reviewed" checkbox, settings page.

Build and visually polish 1–2 before moving to the rest — those two screens are the
entire product pitch; everything else is scaffolding around them.
