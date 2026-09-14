# PROJECT.md — Hackathon Submission Verifier

> Scoped for a **realistic weekend build** (24–48 hours of actual coding, 1–3 people).
> If you have longer (2–4 weeks), see the "If You Have More Time" section at the end —
> the core architecture doesn't change, only how much of each layer you build out.

---

## 1. What This Actually Is

**One sentence:** A tool that reads a hackathon README, extracts what the team *claims*
they built, searches their GitHub repo for evidence, and shows judges a side-by-side of
claim vs. proof — instead of asking judges to trust a README or a 3-minute demo.

**What it is not:** An AI that scores or ranks projects. It never says "Score: 91."
It says "they claimed X, here's what we found, here's what's missing" and lets a human
decide. This distinction is the entire product — don't let scope creep turn it into
an auto-grader.

**Who uses it:** Hackathon organizers/judges, reviewing 10–100 GitHub submissions in a
short judging window, with no time to read every repo themselves.

---

## 2. Realistic Scope: What You Can Actually Build in a Weekend

The original spec (Semgrep rule library, AST analysis, timeline/git-history forensics,
LLM-abstracted providers, full dashboard with judge override workflow) is a **3–6 month
production roadmap**, not a weekend build. Here's the cut that keeps the core idea intact:

| Layer | Full spec | Weekend-realistic version |
|---|---|---|
| Claim extraction | LLM + rule classification (code-verifiable / textual / human-judgment) | LLM extracts a flat list of claims from README. Skip classification. |
| Evidence search | Semgrep rule library (20+ custom `.yml` rules) + AST + dependency parsing | Keyword/regex search across file names + file contents + dependency manifests. Add Semgrep only if time remains — use 3–5 of Semgrep's **existing registry rules**, don't write your own. |
| Verification | 5-state status (VERIFIED / PARTIAL / NOT FOUND / CONTRADICTED / UNABLE) | 3-state: VERIFIED / PARTIALLY VERIFIED / NOT FOUND. Contradicted/unable-to-verify are edge cases you don't need for a demo. |
| Timeline/git-history check | Full commit distribution analysis | **Cut entirely.** Gameable, low signal, not worth the build time. |
| Problem-statement relevance | Embeddings + cosine similarity | Keep — this is cheap (one sentence-transformers call) and demos well. |
| Ingestion | Google Sheets API | Cut Google Sheets for the demo — accept a **CSV upload or paste**. Add Sheets API later if organizers actually need it; it's a small addition once the core loop works. |
| Frontend | Full React dashboard with judge override, audit trail, filters | Submission table + one detail page showing claims/evidence. Cut judge override/audit trail — a judge can just read the evidence and decide in their own head. |
| Scale target | 100 repos | **5–10 repos for the demo.** Prove the pipeline works before worrying about scale. |

This cut list is the actual project plan. Everything in the "full spec, weekend-realistic"
column that you cut is a legitimate stretch goal, in priority order, if time remains.

---

## 3. The Core Loop (Don't Cut This)

```
README  ──LLM──▶  Claims (list of strings)
                        │
Problem statement ──embed──▶ similarity score
                        │
For each claim:
  keyword search over repo files + deps ──▶ candidate evidence
        │
  ambiguous? ──▶ one small LLM call: "does this evidence support this claim?"
        │
  VERIFIED / PARTIALLY VERIFIED / NOT FOUND + one-sentence reason
                        │
                        ▼
              Submission table + detail page
```

If you build nothing else, build this. It's the whole pitch.

---

## 4. Recommended Stack

| Component | Pick | Why |
|---|---|---|
| Backend | **FastAPI (Python)** | Async-friendly, minimal boilerplate, easy GitHub API + LLM integration. Matches the original spec — no reason to deviate. |
| Frontend | **React + Vite + TypeScript + Tailwind** | Fast to scaffold, good for tables/filters/detail panes. Skip Next.js/SSR — you don't need it and it adds setup time. |
| Database | **SQLite** | Zero setup, file-based, fine for 5–100 submissions. Don't reach for Postgres for a weekend build. |
| Embeddings | **`sentence-transformers` (`all-MiniLM-L6-v2`)**, run locally | Free, no API quota, fast enough on CPU, no network dependency during judging. |
| LLM | **Gemini API free tier** (or Claude/GPT if you have credits) | Free tier is generous enough for claim extraction + a handful of ambiguous-case calls per repo at this scale. Wrap it behind one `llm_client.py` function so swapping providers later is a one-file change. |
| Code evidence | **Plain-text/regex search first.** Add **3–5 Semgrep registry rules** (not custom ones) only if time allows, for one or two "impressive" checks (e.g. detecting real Gmail/Calendar API usage vs. just an import). | Writing custom Semgrep rules is the single most time-expensive part of the original spec. Don't do it in a weekend. |
| Repo access | **GitHub REST API** (`requests` + a PAT) | You need: repo metadata, README content, file tree, raw file contents. That's 3–4 endpoints. Don't set up a GitHub App for a demo. |
| Hosting for demo | **Local / localhost, or a single Render/Railway free-tier deploy** | Don't spend build hours on infra you'll only use once. |

**Explicitly skip:** Google Sheets API, AST parsers (`tree-sitter`), git-history/timeline
analysis, job queues (Celery/Redis) — run analysis synchronously per-repo with a progress
counter, it's fine at 5–10 repos, PostgreSQL, auth/roles, Docker sandboxing.

---

## 5. Minimal Data Model

```
Hackathon        (id, name, problem_statement_title, problem_statement_text, embedding)
Submission       (id, team_name, github_url, readme_text, status)
Claim             (id, submission_id, text)
Evidence          (id, claim_id, file_path, snippet, source: "keyword"|"semgrep"|"dependency")
Verification      (id, claim_id, status, reason, confidence)
```

Five tables. That's the whole schema. Resist adding more until the loop works end to end.

---

## 6. Weekend Build Order (with rough hours)

1. **Repo ingestion (2–3h)** — given a GitHub URL, pull README + file tree + file contents + `requirements.txt`/`package.json` via the API. Store raw.
2. **Claim extraction (2h)** — one LLM prompt: README text in, JSON list of claims out. Test on 2–3 real READMEs first, not synthetic ones — messy real READMEs are the actual risk here.
3. **Problem relevance (1–2h)** — embed problem statement once, embed a project summary (README + claims), cosine similarity, done.
4. **Evidence search (4–6h)** — this is the biggest chunk. Keyword/filename search first (cheap, works surprisingly well), then dependency-file parsing, then Semgrep registry rules if time allows.
5. **Verification logic (2–3h)** — clear cases (keyword hit + dependency present) → VERIFIED directly, no LLM call. Ambiguous cases → one small LLM call asking "does this evidence support this claim, yes/partial/no + one sentence why." This is where you save your LLM budget.
6. **Submission table + detail page (4–6h)** — table of teams with relevance score + verified/total claims; click into a team to see each claim with its evidence and status.
7. **Polish + test on 5–10 real repos (remaining time)** — this step is not optional. Test against actual past hackathon repos, not toy examples, before you consider it done.

That's roughly 15–22 hours of core build, leaving buffer for debugging, which always takes longer than planned with LLM output parsing and GitHub API rate limits.

---

## 7. Where This Will Actually Break (Plan For It)

- **Messy READMEs.** Some teams write two lines, some write 2,000 words. Your claim-extraction prompt needs a fallback for both — don't assume a clean bullet list of features.
- **LLM JSON parsing.** Claude/Gemini will occasionally wrap JSON in prose or markdown fences. Strip and retry once before failing.
- **GitHub rate limits.** Use a personal access token (5,000 req/hr) not unauthenticated calls (60/hr) — this alone will silently break a demo if missed.
- **False "NOT FOUND."** Keyword search will miss real evidence written in unexpected variable names. When demoing, prefer showing PARTIALLY VERIFIED with an honest "we couldn't confirm this" over a confident wrong NOT FOUND — this matters more for trust than accuracy percentage.

---

## 8. Demo Script (What to Actually Show Judges)

Don't demo the dashboard first. Demo the *reasoning*:

1. Show one README with 4–5 claims.
2. Show the repo.
3. Show the tool extracting claims automatically.
4. Show it finding evidence for 3, partially for 1, missing for 1 — with the exact file and line.
5. *Then* show the table view with all submissions ranked by relevance + verification.

The one-claim walkthrough is what makes people understand why this is different from an
LLM scoring a README. Lead with that.

---

## 9. If You Have More Time (2–4 Weeks Instead of a Weekend)

Add back, in this order:
1. Google Sheets ingestion (replaces CSV upload)
2. Custom Semgrep rule library for common integrations (Gmail, Calendar, Slack, OpenAI/Gemini/Claude SDKs)
3. 5-state verification (add CONTRADICTED, UNABLE TO VERIFY)
4. Judge override + audit trail
5. Optional git-history/timeline check (keep expectations low — it's a weak signal even fully built)
6. Move SQLite → Postgres if you need concurrent judges
7. Scale-test at 50–100 repos, add basic job queuing (Celery/RQ) once synchronous processing becomes too slow

Do not build these first. The weekend scope above is the version that proves the idea
works; everything here is refinement on top of a working core loop.
