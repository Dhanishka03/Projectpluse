# BUILD-PLAN.md — Backend, Module by Module

> How to use this: work top to bottom. Do the "Before you start" checklist once.
> Then for each module, paste the prompt into your AI coding tool (Claude Code, Cursor,
> etc.) as-is — it already references BACKEND.md's conventions. Test each module before
> moving to the next; don't let two modules go unverified at once, or debugging gets
> confusing fast (this is the same "test on real repos early" advice PROJECT.md gives).

---

## 0. Before You Start — Things Only You Can Do

These are accounts/keys/installs an AI coding tool can't do for you. Get all of these
first so no module blocks on a missing credential mid-build.

- [ ] **Gemini API key** — go to [Google AI Studio](https://aistudio.google.com/apikey),
      sign in, click "Create API key." Free tier is generous enough for this scope per
      PROJECT.md. Save it somewhere temporary — you'll paste it into `.env` in Module 1.
- [ ] **GitHub Personal Access Token** — GitHub → Settings → Developer settings →
      Personal access tokens → Fine-grained tokens (or classic). You only need **public
      repo read access** unless you're testing against private repos. This raises your
      rate limit from 60/hr to 5,000/hr — PROJECT.md flags skipping this as something
      that "will silently break a demo."
- [ ] **Python 3.11+** installed locally, plus `pip` and the ability to make a virtual
      environment (`python -m venv venv`).
- [ ] **A handful of real past hackathon GitHub repos** (5–10) to test against — pick
      ones with messy READMEs, not clean toy examples. PROJECT.md is explicit that
      testing against synthetic/toy repos hides the real risk (messy claim extraction).
- [ ] Decide **where `.env` will live** (`backend/.env`, gitignored) — you'll fill in
      `GEMINI_API_KEY`, `GITHUB_TOKEN`, and `DATABASE_URL=sqlite:///./hackathon.db` in
      Module 1.
- [ ] Have **BACKEND.md and FRONTEND.md** open or attached in your coding tool's context
      for every module below — several prompts reference "the shapes in FRONTEND.md" and
      "the endpoints in BACKEND.md section 7" directly.

Nothing else needs setup ahead of time — no Docker, no Postgres, no queue service, per
BACKEND.md's explicit skip list.

---

## Module 1 — Project Scaffold, Models, DB

**Do this first. Nothing else works without it.**

> Prompt:
> ```
> Using BACKEND.md as the spec, scaffold the FastAPI backend project structure exactly
> as laid out in section 3 (main.py, config.py, database.py, models.py, schemas.py,
> routers/, services/, requirements.txt, .env.example). Implement:
> - config.py loading GEMINI_API_KEY, GITHUB_TOKEN, DATABASE_URL from a .env file
> - database.py with a SQLAlchemy engine/session for SQLite
> - models.py with the five ORM models exactly as defined in BACKEND.md section 5
>   (Hackathon, ProblemStatement, Submission, Claim, Evidence, Issue)
> - main.py that creates the FastAPI app, enables CORS for localhost:5173 and any
>   Lovable preview origin, and calls Base.metadata.create_all() on startup
> Do not implement any routes or services yet — just the scaffold, models, and a working
> `uvicorn main:app --reload` that starts cleanly with an empty database.
> ```

**Check before moving on:** server starts, `hackathon.db` file appears, no import errors.

---

## Module 2 — Hackathon CRUD + CSV Validation

> Prompt:
> ```
> Using BACKEND.md sections 6 and 7, implement routers/hackathons.py with:
> - POST /hackathons (accepts name, dates, problem statements, and either a CSV file
>   upload or pasted rows — expected columns per section 7.1)
> - POST /hackathons/{id}/validate — dry-run validation returning
>   {rowsParsed, validUrls, skipped: [{row, reason}]}, matching the inline validation
>   card behavior described in FRONTEND.md section 3.2.1 (invalid GitHub links are
>   skipped, not rejected)
> - GET /hackathons and GET /hackathons/{id}, the latter including a computed `stats`
>   object (totalSubmissions/analyzed/needsReview/failed) derived at read time from
>   Submission rows, not stored
> Response shapes must match the Hackathon and ProblemStatement TypeScript interfaces
> in FRONTEND.md section 5 exactly, including camelCase field names.
> Put CSV/paste parsing logic in services/csv_ingest.py, not inline in the router.
> ```

**Check before moving on:** POST a hackathon with a real CSV of 5–10 team rows (some
with bad/missing GitHub links) and confirm the validation summary matches what
FRONTEND.md 3.2.1 expects.

---

## Module 3 — GitHub Client

> Prompt:
> ```
> Using BACKEND.md section 8 ("github_client.py"), implement services/github_client.py
> with functions to fetch: repo metadata, README content (base64-decoded), the full file
> tree (recursive), and raw contents of specific files (for dependency manifests like
> requirements.txt/package.json and any file evidence search needs to read in full).
> Use the GITHUB_TOKEN from config for authenticated requests. Handle 404 (not found)
> and 403 (private/rate-limited) by returning a clear error/result object rather than
> raising — these need to become failure_reason values later, not crashes.
> ```

**Check before moving on:** run it against 2–3 of your real test repos directly (a
small script or a temporary debug endpoint is fine) and confirm README + file tree +
requirements.txt/package.json all come back correctly, including for a repo without
one of those manifest files.

---

## Module 4 — Claim Extraction (LLM)

> Prompt:
> ```
> Using BACKEND.md section 8 ("llm_client.py"), implement services/llm_client.py's
> extract_claims(readme_text) function using the Gemini API. One prompt: README text
> in, JSON array of short claim strings out, nothing else in the response. Strip
> markdown code fences before json.loads(), retry once on parse failure, and return an
> empty list (not an exception) if it fails twice. Keep this function isolated so the
> LLM provider can be swapped later without touching any caller.
> ```

**Check before moving on:** run it against your real test READMEs — including at
least one very short (2-line) and one very long (2,000+ word) README, since PROJECT.md
specifically warns both extremes need to work.

---

## Module 5 — Embeddings + Relevance Score

> Prompt:
> ```
> Using BACKEND.md section 8 ("embeddings.py"), implement services/embeddings.py that
> loads sentence-transformers' all-MiniLM-L6-v2 once at module import (not per-request),
> exposes embed(text) -> vector and cosine_similarity(a, b) -> float scaled to 0-100.
> Wire this into the ProblemStatement model so its embedding is computed once when a
> hackathon is created, and add relevance scoring (problem statement vs. README + claims
> summary) to be called during the pipeline in Module 8.
> ```

**Check before moving on:** confirm the first request after startup isn't unusably slow
(model should load once at boot, not per-call) — this is a common mistake worth catching
now before it hides inside the full pipeline.

---

## Module 6 — Evidence Search

**This is the biggest module — budget the most time here, per PROJECT.md.**

> Prompt:
> ```
> Using BACKEND.md section 8 ("evidence_search.py"), implement services/evidence_search.py.
> For a given claim and a repo's file tree/contents (from Module 3), search: (1) file and
> directory names for related keywords, (2) file contents for related keywords
> case-insensitively, (3) dependency manifest contents for related package names. Return
> a list of candidate evidence dicts with file, line (best-effort — none if not
> determinable), description, and found (bool). Start with plain keyword/filename search
> only — do not add Semgrep yet.
> ```

**Check before moving on:** run against a real repo where you already know an integration
exists (e.g. you know it uses the Calendar API) and confirm it's actually found — false
negatives here are the #1 risk PROJECT.md calls out.

---

## Module 7 — Verification Logic

> Prompt:
> ```
> Using BACKEND.md section 8 ("verification.py"), implement services/verification.py
> that takes a claim's evidence list from Module 6 and decides the outcome:
> - keyword hit AND matching dependency present -> VERIFIED, no LLM call
> - zero candidate evidence anywhere -> NOT_FOUND, no LLM call
> - everything else (partial matches, keyword-only, dependency-only) -> ambiguous,
>   call llm_client.judge_claim(claim, evidence) for the final status + one-sentence
>   finding
> judge_claim should be implemented in llm_client.py now if not already: it takes the
> claim and evidence, returns (status, finding) where status is one of
> "verified"/"partially_verified"/"not_found". Bias toward PARTIALLY_VERIFIED over a
> confident wrong NOT_FOUND when evidence is genuinely ambiguous, per BACKEND.md section 10.
> ```

**Check before moving on:** confirm most claims resolve without hitting the LLM at all
— if every claim is going through `judge_claim`, the shortcut logic isn't working and
you'll burn through LLM quota fast during a real batch.

---

## Module 8 — Pipeline Orchestration + Progress Endpoint

> Prompt:
> ```
> Using BACKEND.md sections 4 and 8 ("pipeline.py"), implement services/pipeline.py that
> orchestrates, per submission: GitHub fetch (Module 3) -> claim extraction (Module 4)
> -> relevance scoring (Module 5) -> evidence search + verification per claim
> (Modules 6-7) -> derive Issue rows from partially_verified/not_found claims -> write
> Submission/Claim/Evidence/Issue rows -> update submission status.
> Wrap each submission in try/except so one failing repo (private/deleted/rate-limited)
> doesn't stop the batch — mark it status="failed" with a failure_reason instead.
> Track in-memory progress per hackathon (a module-level dict keyed by hackathon id is
> fine at this scale) and implement:
> - POST /hackathons/{id}/analyze — runs the pipeline over all submissions synchronously,
>   setting hackathon status to "analyzing" then "complete"
> - GET /hackathons/{id}/progress — returns {total, completed, current: [{teamName,
>   status: "done"|"analyzing"|"queued"}]} per BACKEND.md section 7, for the
>   /analyzing progress screen in FRONTEND.md 3.3
> ```

**Check before moving on:** run the full analyze endpoint against your 5–10 real test
repos in one batch, including at least one you know is private/deleted, and confirm the
batch completes with one clean failure rather than crashing.

---

## Module 9 — Submission List + Detail Endpoints

> Prompt:
> ```
> Using BACKEND.md section 7, implement routers/submissions.py with:
> - GET /hackathons/{id}/submissions — list for the dashboard table, matching the
>   Submission shape in FRONTEND.md section 5 exactly (including nested claims and
>   issues arrays, or a lighter list-only shape if you prefer — but keep field names
>   and enum values identical either way)
> - GET /hackathons/{id}/submissions/{submissionId} — full detail including nested
>   claims (each with its evidence array split into found/not-found by the `found`
>   boolean) and issues, exactly matching FRONTEND.md's Claim/Evidence/Issue shapes
> Double-check every enum string and field name against FRONTEND.md section 5 —
> this is the module most likely to break the frontend integration if it drifts.
> ```

**Check before moving on:** hit both endpoints with a browser or `curl` after a real
analyze run and diff the JSON shape against FRONTEND.md's TypeScript interfaces
field-by-field.

---

## Module 10 — End-to-End Test on Real Repos

Not a coding prompt — this is manual verification, and PROJECT.md is explicit it's
"not optional":

- [ ] Run `POST /hackathons` → `POST /hackathons/{id}/analyze` → poll `/progress` →
      `GET /submissions` → `GET /submissions/{id}` against your 5–10 real repos.
- [ ] Confirm at least one messy/short README, one long README, one private/bad URL,
      and one repo with zero extractable claims all behave as BACKEND.md section 10
      describes rather than crashing the batch.
- [ ] Confirm relevance scores and verification statuses look *plausible* to you as a
      human reading the same repos — this is the actual quality bar, not just "the API
      returns 200."
- [ ] Wire the real base URL into the frontend (replacing its mock data) and click
      through the dashboard + detail page once with real data before considering the
      backend done.

---

## Order Recap

Modules 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10, in that order, each checked before the
next starts. This matches BACKEND.md section 9's build order and hour estimates —
expect Module 6 (evidence search) to be the single biggest time sink.
