"""
routers/submissions.py — Submissions list and detail endpoints.

Endpoints:
  - GET /hackathons/{hackathon_id}/submissions: list submissions for a hackathon
  - GET /hackathons/{hackathon_id}/submissions/{submission_id}: full submission detail with claims, evidence, and issues

CRITICAL: Response shapes match FRONTEND.md §5 verbatim.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Claim, Evidence, Hackathon, Issue, Submission
from schemas import (
    ClaimResponse,
    EvidenceResponse,
    IssueResponse,
    SubmissionResponse,
)

router = APIRouter(prefix="/hackathons/{hackathon_id}/submissions", tags=["submissions"])


def build_submission_response(sub: Submission) -> SubmissionResponse:
    """Builds a Pydantic SubmissionResponse from ORM model with nested claims & issues."""
    claims_out: list[ClaimResponse] = []
    for c in sub.claims:
        evidence_out = [
            EvidenceResponse(
                file=ev.file,
                line=ev.line,
                type=ev.type,
                description=ev.description,
                found=ev.found,
            )
            for ev in c.evidence
        ]
        claims_out.append(
            ClaimResponse(
                id=c.id,
                text=c.text,
                status=c.status,
                finding=c.finding,
                evidence=evidence_out,
            )
        )

    issues_out = [
        IssueResponse(
            id=iss.id,
            claim_id=iss.claim_id,
            type=iss.type,
            title=iss.title,
            description=iss.description,
        )
        for iss in sub.issues
    ]

    return SubmissionResponse(
        id=sub.id,
        team_name=sub.team_name,
        project_name=sub.project_name or sub.team_name,
        github_url=sub.github_url,
        problem_statement_id=sub.problem_statement_id,
        relevance_score=sub.relevance_score,
        claims_verified_count=sub.claims_verified_count,
        claims_total_count=sub.claims_total_count,
        issues_count=sub.issues_count,
        status=sub.status,
        failure_reason=sub.failure_reason,
        claims=claims_out,
        issues=issues_out,
    )


@router.get("", response_model=list[SubmissionResponse])
def list_submissions(
    hackathon_id: str,
    status: Optional[str] = Query(None),
    problem_statement_id: Optional[str] = Query(None, alias="problemStatementId"),
    min_relevance: Optional[int] = Query(None, alias="minRelevance"),
    max_relevance: Optional[int] = Query(None, alias="maxRelevance"),
    db: Session = Depends(get_db),
):
    """
    List all submissions for a hackathon.
    Supports optional filters (while frontend can also filter client-side).
    """
    hackathon = db.get(Hackathon, hackathon_id)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    stmt = (
        select(Submission)
        .options(
            selectinload(Submission.claims).selectinload(Claim.evidence),
            selectinload(Submission.issues),
        )
        .where(Submission.hackathon_id == hackathon_id)
    )

    if status:
        stmt = stmt.where(Submission.status == status)
    if problem_statement_id:
        stmt = stmt.where(Submission.problem_statement_id == problem_statement_id)
    if min_relevance is not None:
        stmt = stmt.where(Submission.relevance_score >= min_relevance)
    if max_relevance is not None:
        stmt = stmt.where(Submission.relevance_score <= max_relevance)

    stmt = stmt.order_by(Submission.relevance_score.desc(), Submission.team_name.asc())
    submissions = db.scalars(stmt).all()
    return [build_submission_response(s) for s in submissions]


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    hackathon_id: str,
    submission_id: str,
    db: Session = Depends(get_db),
):
    """
    Full detail of a single submission, including its claims, evidence items, and issues.
    """
    hackathon = db.get(Hackathon, hackathon_id)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")

    stmt = (
        select(Submission)
        .options(
            selectinload(Submission.claims).selectinload(Claim.evidence),
            selectinload(Submission.issues),
        )
        .where(
            Submission.hackathon_id == hackathon_id,
            Submission.id == submission_id,
        )
    )
    sub = db.scalar(stmt)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    return build_submission_response(sub)
