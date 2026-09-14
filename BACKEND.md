# BACKEND.md — Hackathon Submission Verifier (Backend Build Spec)

> This doc is written to be pasted into an AI coding tool (Claude Code, Cursor, etc.)
> directly — in full, or section by section. It assumes the **weekend-realistic scope**
> from PROJECT.md and implements the exact data shapes already defined in FRONTEND.md,
> so the React frontend can be wired to real endpoints with zero shape changes.
> Backend: **FastAPI (Python)**. Database: **SQLite**. No auth, no Docker, no queue.

---

## 1. One-Paragraph Brief (paste this first)

Build the backend for a hackathon submission verifier. Organizers create a hackathon
with a problem statement and a list of team GitHub URLs. The backend pulls each repo's
README, extracts a flat list of claims via an LLM, searches the repo's files and
dependency manifests for evidence of each claim, verifies each claim as
VERIFIED / PARTIALLY VERIFIED / NOT FOUND (using a small LLM call only for ambiguous
cases), scores problem-statement relevance via local sentence-transformer embeddings,
and exposes all of this through a REST API whose response shapes match the TypeScript
interfaces already defined in FRONTEND.md exactly — field names, casing, and enum
values included. Processing is synchronous per repo with a polling-friendly progress
endpoint; there is no job queue for this scope.

---

## 2. Tech Stack (do not deviate)

| Component | Pick | Notes |
|---|---|---|
| Framework | **FastAPI** | async endpoints, pydantic models double as request/response schemas |
| Server | **uvicorn** | `uvicorn main:app --reload` for dev |
| Database | **SQLite** via **SQLAlchemy** (or SQLModel) | one file, `hackathon.db`, checked into `.gitignore` |
| Migrations | Skip Alembic — call `Base.metadata.create_all()` on startup | fine at this scope |
| Embeddings | `sentence-transformers`, model `all-MiniLM-L6-v2`, run locally | load once at startup, keep in memory |
| LLM | Gemini API free tier (swap-friendly) | wrap ALL calls in a single `llm_client.py` — one function `extract_claims()`, one function `judge_claim()` |
| GitHub access | `requests` + a personal access token from env var `GITHUB_TOKEN` | 5,000 req/hr authenticated |
| CSV parsing | `pandas` or stdlib `csv` | either is fine, pandas is faster to write |
| CORS | `fastapi.middleware.cors` | allow the Lovable-hosted frontend origin + `localhost:5173` |
| Env config | `python-dotenv` + `.env` | `GITHUB_TOKEN`, `GEMINI_API_KEY`, `DATABASE_URL` |

Explicitly skip: Celery/Redis, Postgres, Docker, Alembic, OAuth/JWT auth, AST parsers,
custom Semgrep rules (use 3–5 existing registry rules only if time remains), git-history
analysis.

---

## 3. Project Structure

```
backend/
  main.py                 # FastAPI app, CORS, startup hook (create tables, load embedding model)
  config.py                # env var loading
  database.py               # SQLAlchemy engine/session
  models.py                  # SQLAlchemy ORM models (section 5)
  schemas.py                  # Pydantic request/response models — MUST mirror FRONTEND.md types exactly (section 6)
  routers/
    hackathons.py               # /hackathons routes
    submissions.py                # /submissions routes
  services/
    github_client.py               # repo metadata, README, file tree, raw file content
    llm_client.py                    # extract_claims(), judge_claim() — single point of LLM contact
    embeddings.py                     # load model once, embed(), cosine_similarity()
    evidence_search.py                 # keyword/filename/dependency search over repo files
    verification.py                     # ties evidence_search + llm_client into VERIFIED/PARTIAL/NOT_FOUND
    csv_ingest.py                        # parse uploaded CSV/pasted rows into submission rows
    pipeline.py                           # orchestrates the full per-submission analysis (section 8)
  requirements.txt
  .env.example
```

---

## 4. Core Loop (implement exactly this, don't reorder)

```
POST /hackathons  (name, dates, problem statements, CSV/paste of teams)
        │
        ▼
For each submission row:
  1. GitHub client pulls: README, file tree, raw contents of key files, requirements.txt/package.json
  2. LLM extracts claims from README            → List[str]
  3. Embed problem statement (once per hackathon) + embed submission summary (README + claims)
     → cosine similarity → relevanceScore (0-100)
  4. For each claim:
       a. evidence_search finds candidate evidence (filenames, keyword matches, dependency hits)
       b. Clear case (keyword hit + dependency present) → VERIFIED, no LLM call
       c. Ambiguous case → one small LLM call: judge_claim(claim, evidence) → verified/partial/not_found + one-sentence finding
  5. Derive issues[] from any claim that is "partially_verified" (overstated) or "not_found" (not_verified)
  6. Write Submission + Claim + Evidence + Issue rows, update Hackathon.stats
        │
        ▼
GET endpoints serve the data in the exact shapes FRONTEND.md expects
```

If a repo is private, missing, or the README yields zero parseable claims, do not crash
the batch — mark that submission `status: "failed"` (bad URL/private repo) and continue
to the next one. Zero claims but a valid repo is not a failure — it's a submission whose
`claims: []`, which the frontend already renders as "No claims could be extracted."

---

## 5. Database Models (SQLAlchemy)

Five tables, matching PROJECT.md's data model, extended slightly so every field the
frontend needs has a column to come from:

```python
class Hackathon(Base):
    id: str (uuid, pk)
    name: str
    submission_start: datetime
    submission_end: datetime
    status: str            # "draft" | "analyzing" | "complete"
    created_at: datetime

class ProblemStatement(Base):
    id: str (uuid, pk)
    hackathon_id: str (fk)
    title: str
    description: str
    embedding: bytes        # pickled/serialized vector, computed once on creation

class Submission(Base):
    id: str (uuid, pk)
    hackathon_id: str (fk)
    team_name: str
    project_name: str        # derived from README title, fallback to repo name
    github_url: str
    problem_statement_id: str (fk)
    readme_text: text
    relevance_score: int       # 0-100
    claims_verified_count: int
    claims_total_count: int
    issues_count: int
    status: str                 # "verified" | "review" | "failed"
    failure_reason: str | None    # populated only when status == "failed"

class Claim(Base):
    id: str (uuid, pk)
    submission_id: str (fk)
    text: str
    status: str          # "verified" | "partially_verified" | "not_found"
    finding: str           # one-sentence explanation

class Evidence(Base):
    id: str (uuid, pk)
    claim_id: str (fk)
    file: str
    line: int | None
    type: str          # "code" | "dependency"
    description: str
    found: bool          # true = "found" list, false = "not found" list
    source: str            # "keyword" | "semgrep" | "dependency"  (internal, not exposed to frontend)

class Issue(Base):
    id: str (uuid, pk)
    submission_id: str (fk)
    claim_id: str (fk)
    type: str      # "overstated" | "not_verified"
    title: str
    description: str
```

`Hackathon.stats` (totalSubmissions/analyzed/needsReview/failed) is **computed at read
time** from the Submission rows, not stored — one query, avoids sync bugs.

---

## 6. Pydantic Response Schemas — Must Match FRONTEND.md Exactly

Copy the TypeScript interfaces from FRONTEND.md section 5 field-for-field into Pydantic
models with the same field names (camelCase, not snake_case — use `alias_generator` or
`Field(alias=...)` plus `model_config = {"populate_by_name": True}` so FastAPI serializes
camelCase JSON while Python code stays snake_case internally). Do not rename or restructure
any field — the frontend was built against these shapes verbatim:

- `Hackathon` (with nested `problemStatements: ProblemStatement[]` and `stats`)
- `ProblemStatement`
- `Submission` (with nested `claims: Claim[]` and `issues: Issue[]`)
- `Claim` (with nested `evidence: Evidence[]`)
- `Evidence`
- `Issue`

Enum values are strings and must match exactly: `"draft" | "analyzing" | "complete"`,
`"verified" | "review" | "failed"`, `"verified" | "partially_verified" | "not_found"`,
`"code" | "dependency"`, `"overstated" | "not_verified"`.

---

## 7. API Endpoints

| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/hackathons` | Create hackathon: name, dates, problem statements, CSV file or pasted rows | Validates rows before saving (section 7.1); returns created `Hackathon` with `status: "draft"` |
| POST | `/hackathons/{id}/validate` | Dry-run validation of CSV/pasted rows without saving | Returns `{rowsParsed, validUrls, skipped: [{row, reason}]}` — powers the inline validation card in FRONTEND.md 3.2.1 |
| GET | `/hackathons` | List all hackathons | For `/` list page |
| GET | `/hackathons/{id}` | Full hackathon incl. computed `stats` | For dashboard |
| POST | `/hackathons/{id}/analyze` | Kick off synchronous analysis of all submissions | Runs `pipeline.py` per submission in a loop; sets `status: "analyzing"` then `"complete"` |
| GET | `/hackathons/{id}/progress` | Poll during analysis | Returns `{total, completed, current: [{teamName, status: "done"|"analyzing"|"queued"}]}` — powers the `/analyzing` progress screen |
| GET | `/hackathons/{id}/submissions` | List submissions for the table view | Supports query params `sort`, `status`, `problemStatementId`, `minRelevance`, `maxRelevance` — but do server-side filtering only as a fallback; frontend does client-side filtering against the full loaded list per FRONTEND.md 3.4 |
| GET | `/hackathons/{id}/submissions/{submissionId}` | Full submission detail incl. claims + evidence + issues | For the detail page |
| PATCH | `/hackathons/{id}/submissions/{submissionId}` | Stretch only: `{reviewed: true}` toggle | Matches the optional "Mark as Reviewed" checkbox — do not build until core loop works |

### 7.1 CSV validation rules
Expected columns: `id, teamname, problem statement, github link` (case-insensitive,
whitespace-tolerant). A row is invalid if the GitHub link is missing or doesn't match
`github.com/{owner}/{repo}` — invalid rows are skipped, not rejected outright, matching
FRONTEND.md's "2 rows missing a GitHub link — will be skipped" behavior.

---

## 8. Service Layer Details

**`github_client.py`** — needs exactly 3–4 endpoints: repo metadata (`GET /repos/{owner}/{repo}`),
README (`GET /repos/{owner}/{repo}/readme`, decode base64), file tree (`GET
/repos/{owner}/{repo}/git/trees/{sha}?recursive=1`), raw file contents for dependency
manifests (`requirements.txt`, `package.json`) and any file the evidence search flags as
worth reading in full. Always send the `Authorization: token {GITHUB_TOKEN}` header.
Handle 404 (repo not found) and 403 (private/rate-limited) as `failure_reason` values,
not exceptions that crash the batch.

**`llm_client.py`** — two functions only:
- `extract_claims(readme_text: str) -> list[str]` — one prompt, ask for a JSON array of
  short claim strings, nothing else. Strip markdown fences before `json.loads`; retry
  once on parse failure; on second failure, return `[]` and let the submission proceed
  with zero claims rather than failing the whole submission.
- `judge_claim(claim: str, evidence: list[dict]) -> tuple[str, str]` — returns
  `(status, one_sentence_finding)` where status is one of the three enum values. Only
  called for ambiguous cases — never for clear keyword+dependency hits or clear misses.

**`embeddings.py`** — load `all-MiniLM-L6-v2` once at startup (module-level singleton,
not per-request). `embed(text: str) -> np.ndarray`, `cosine_similarity(a, b) -> float`
scaled to 0–100 for `relevanceScore`.

**`evidence_search.py`** — for each claim, search: (1) file/directory names for related
keywords, (2) file contents for related keywords (grep-style, case-insensitive), (3)
dependency manifest contents for related package names. Return a list of candidate
evidence dicts with `file`, `line` (best-effort), `description`, `found`. This is the
biggest chunk of build time per PROJECT.md — build keyword/filename search first, add
Semgrep registry rules only if time remains (3–5 rules, not custom).

**`verification.py`** — decides VERIFIED vs. needs-LLM-judgment:
- Clear VERIFIED: keyword hit in code AND a matching dependency present.
- Clear NOT_FOUND: zero candidate evidence found anywhere.
- Everything else (partial matches, keyword-only, dependency-only) → ambiguous → call
  `judge_claim`.
This ordering is what "save your LLM budget" in PROJECT.md means concretely — most
claims should resolve without an LLM call.

**`pipeline.py`** — orchestrates steps 1–6 from section 4 per submission, wrapped in a
try/except per submission so one bad repo doesn't kill the batch; updates progress state
(in-memory dict keyed by hackathon id is fine at this scale, no need for a DB table).

---

## 9. Build Order (mirrors PROJECT.md's hour estimates)

1. **Project scaffold + models + DB (1h)** — FastAPI app, SQLAlchemy models, `create_all()` on startup, CORS.
2. **Hackathon CRUD + CSV validation (2h)** — `POST /hackathons`, `POST /hackathons/{id}/validate`, `GET /hackathons`, `GET /hackathons/{id}`.
3. **GitHub client (2–3h)** — pull README, tree, raw file contents for 2–3 real repos to sanity-check before wiring into the pipeline.
4. **Claim extraction (2h)** — `llm_client.extract_claims`, test on messy real READMEs first per PROJECT.md's warning.
5. **Embeddings + relevance score (1–2h)** — load model, embed once per hackathon, cosine similarity.
6. **Evidence search (4–6h)** — the biggest chunk; keyword/filename search, then dependency parsing.
7. **Verification logic (2–3h)** — clear-case shortcuts + `judge_claim` for the rest.
8. **Pipeline orchestration + progress endpoint (2h)** — wire steps 3–7 together per submission, in-memory progress tracking.
9. **Submission list/detail endpoints (1–2h)** — serialize to the exact FRONTEND.md shapes.
10. **Test end-to-end against 5–10 real repos (remaining time)** — not optional, per PROJECT.md.

---

## 10. Known Failure Modes to Handle (don't skip)

- **LLM JSON parsing** — strip code fences, retry once, fall back to `[]` rather than crashing.
- **GitHub rate limits** — always use the authenticated token; surface 403s as a failed-submission reason, not a 500.
- **Private/deleted repos** — `failure_reason: "Repository not found or private"`, `status: "failed"`, batch continues.
- **Empty README or zero claims** — valid state, not a failure; `claims: []` on the submission.
- **False NOT_FOUND from keyword search** — bias `judge_claim` prompts toward PARTIALLY_VERIFIED over a confident wrong NOT_FOUND when evidence is ambiguous, per PROJECT.md's trust-over-accuracy note.

---

## 11. What NOT to Build (explicitly out of scope)

Google Sheets ingestion, custom Semgrep rules, 5-state verification (CONTRADICTED/UNABLE),
judge override + audit trail persistence beyond the optional reviewed flag, git-history/
timeline analysis, Postgres, Celery/RQ job queue, Docker sandboxing, auth/roles. All of
these are the documented "if you have more time" list in PROJECT.md — build the core
loop first, end to end, against real repos, before touching any of them.
