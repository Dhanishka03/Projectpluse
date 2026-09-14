"""
pipeline.py — Orchestrates the full analysis pipeline per hackathon submission.

Step-by-step per submission:
  1. Pulls GitHub repo bundle (README, file tree, manifests) -> services.github_client
  2. Extracts claims from README -> services.llm_client
  3. Computes relevance score against problem statement -> services.embeddings
  4. Searches evidence + verifies each claim -> services.evidence_search & services.verification
  5. Derives Issue objects from non-verified claims
  6. Writes Submission, Claim, Evidence, Issue rows to database
  7. Updates in-memory progress dict for polling

Resilience: Individual submission failures (404, 403, network errors) are caught,
marked as status="failed" with failure_reason, and the batch continues cleanly.
"""

from datetime import datetime, timezone
import threading
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from models import Claim, Evidence, Hackathon, Issue, ProblemStatement, Submission
from services.embeddings import compute_relevance_score
from services.evidence_search import search_evidence_for_claim
from services.github_client import fetch_repository_bundle
from services.llm_client import extract_claims
from services.verification import verify_claim

# In-memory progress tracker keyed by hackathon_id
# Shape: { hackathon_id: { "total": int, "completed": int, "current": [{"team_name": str, "status": str}] } }
_PROGRESS: dict[str, dict[str, Any]] = {}
_PROGRESS_LOCK = threading.Lock()


def get_hackathon_progress(hackathon_id: str, db: Session) -> dict[str, Any]:
    """Returns current analysis progress for a hackathon."""
    with _PROGRESS_LOCK:
        if hackathon_id in _PROGRESS:
            return _PROGRESS[hackathon_id]

    # Fallback to querying DB if not in memory
    stmt = select(Submission).where(Submission.hackathon_id == hackathon_id)
    submissions = db.scalars(stmt).all()
    total = len(submissions)
    completed = sum(1 for s in submissions if s.status in ("verified", "review", "failed") and (s.claims_total_count > 0 or s.status == "failed"))
    current = [
        {
            "teamName": s.team_name,
            "status": "done" if s.status in ("verified", "review", "failed") and (s.claims_total_count > 0 or s.status == "failed") else "queued",
        }
        for s in submissions
    ]
    return {
        "total": total,
        "completed": completed,
        "current": current,
    }


def analyze_submission(submission_id: str, db: Session) -> None:
    """Analyzes a single submission and writes results to the database."""
    stmt = (
        select(Submission)
        .options(
            selectinload(Submission.problem_statement),
            selectinload(Submission.claims),
            selectinload(Submission.issues),
        )
        .where(Submission.id == submission_id)
    )
    sub = db.scalar(stmt)
    if not sub:
        return

    # 1. Fetch GitHub bundle
    bundle = fetch_repository_bundle(sub.github_url)
    if not bundle.success:
        sub.status = "failed"
        sub.failure_reason = bundle.failure_reason or "Failed to access GitHub repository."
        db.commit()
        return

    sub.readme_text = bundle.readme_text
    if (not sub.project_name or sub.project_name == "") and bundle.repo:
        sub.project_name = bundle.repo.replace("-", " ").replace("_", " ").title()


    # 2. Extract claims from README
    extracted_claim_strings = extract_claims(bundle.readme_text)

    # 3. Compute relevance score against problem statement
    ps_title = sub.problem_statement.title if sub.problem_statement else "General Hackathon"
    ps_desc = sub.problem_statement.description if sub.problem_statement else ""
    ps_emb = sub.problem_statement.embedding if sub.problem_statement else None

    sub.relevance_score = compute_relevance_score(
        problem_title=ps_title,
        problem_description=ps_desc,
        readme_text=bundle.readme_text,
        claims=extracted_claim_strings,
        saved_problem_embedding=ps_emb,
    )

    # Clear prior claims/evidence/issues if re-analyzing
    for c in list(sub.claims):
        db.delete(c)
    for i in list(sub.issues):
        db.delete(i)
    db.flush()

    verified_claims_count = 0
    issues_list: list[Issue] = []

    # 4. Search evidence and verify each claim
    for claim_text in extracted_claim_strings:
        evidence_data_list = search_evidence_for_claim(bundle, claim_text)
        res = verify_claim(claim_text, evidence_data_list)

        claim_record = Claim(
            submission_id=sub.id,
            text=claim_text,
            status=res.status,
            finding=res.finding,
        )
        db.add(claim_record)
        db.flush()

        if res.status == "verified":
            verified_claims_count += 1

        # Add evidence records
        for ev_dict in res.evidence:
            ev_record = Evidence(
                claim_id=claim_record.id,
                file=ev_dict.get("file", "codebase"),
                line=ev_dict.get("line"),
                type=ev_dict.get("type", "code"),
                description=ev_dict.get("description", ""),
                found=ev_dict.get("found", True),
                source=ev_dict.get("source", "keyword"),
            )
            db.add(ev_record)

        # Add issue if generated
        if res.issue:
            issue_record = Issue(
                submission_id=sub.id,
                claim_id=claim_record.id,
                type=res.issue["type"],
                title=res.issue["title"],
                description=res.issue["description"],
            )
            db.add(issue_record)
            issues_list.append(issue_record)

    db.flush()

    # 5. Set counts and submission overall status
    sub.claims_total_count = len(extracted_claim_strings)
    sub.claims_verified_count = verified_claims_count
    sub.issues_count = len(issues_list)

    if sub.claims_total_count > 0 and sub.claims_verified_count == sub.claims_total_count and len(issues_list) == 0:
        sub.status = "verified"
    else:
        sub.status = "review"

    db.commit()


def run_hackathon_pipeline(hackathon_id: str, db: Session) -> None:
    """Runs the analysis pipeline over all submissions in a hackathon."""
    hackathon = db.get(Hackathon, hackathon_id)
    if not hackathon:
        return

    hackathon.status = "analyzing"
    db.commit()

    stmt = select(Submission).where(Submission.hackathon_id == hackathon_id)
    submissions = db.scalars(stmt).all()
    total = len(submissions)

    with _PROGRESS_LOCK:
        _PROGRESS[hackathon_id] = {
            "total": total,
            "completed": 0,
            "current": [
                {"teamName": s.team_name, "status": "queued"}
                for s in submissions
            ],
        }

    for idx, sub in enumerate(submissions):
        with _PROGRESS_LOCK:
            if hackathon_id in _PROGRESS and idx < len(_PROGRESS[hackathon_id]["current"]):
                _PROGRESS[hackathon_id]["current"][idx]["status"] = "analyzing"

        try:
            analyze_submission(sub.id, db)
        except Exception as e:
            sub.status = "failed"
            sub.failure_reason = f"Analysis error: {str(e)}"
            db.commit()

        with _PROGRESS_LOCK:
            if hackathon_id in _PROGRESS and idx < len(_PROGRESS[hackathon_id]["current"]):
                _PROGRESS[hackathon_id]["current"][idx]["status"] = "done"
                _PROGRESS[hackathon_id]["completed"] += 1

    hackathon = db.get(Hackathon, hackathon_id)
    if hackathon:
        hackathon.status = "complete"
        db.commit()
