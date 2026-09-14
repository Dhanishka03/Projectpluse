"""
routers/hackathons.py — Hackathon CRUD, CSV validation, analysis, and progress endpoints.

Endpoints (in route registration order — specific paths before path params):
  POST /hackathons                      — create hackathon
  POST /hackathons/validate             — dry-run CSV validation (pre-creation)
  GET  /hackathons                      — list all hackathons
  POST /hackathons/{id}/validate        — dry-run CSV validation (existing hackathon)
  POST /hackathons/{id}/analyze         — trigger analysis pipeline
  GET  /hackathons/{id}/progress        — poll analysis progress
  GET  /hackathons/{id}                 — get single hackathon (MUST be last /{id} GET)
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import get_db
from models import Hackathon, ProblemStatement, Submission
from schemas import (
    AnalysisProgress,
    HackathonCreate,
    HackathonResponse,
    HackathonStats,
    ProblemStatementResponse,
    SkippedRow,
    SubmissionProgress,
    ValidationResult,
)
from services.csv_ingest import parse_csv_or_pasted_text
from services.embeddings import embed, serialize_embedding

router = APIRouter(prefix="/hackathons", tags=["hackathons"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def compute_hackathon_stats(submissions: list[Submission]) -> HackathonStats:
    """Derive hackathon stats at read time from its submissions.
    
    FRONTEND.md §5 shape:
      stats: { totalSubmissions, analyzed, needsReview, failed }
    
    - totalSubmissions: count of all submission rows
    - analyzed: count of submissions that have been processed (verified + review + failed)
    - needsReview: count with status == "review"
    - failed: count with status == "failed"
    """
    total = len(submissions)
    analyzed = sum(1 for s in submissions if s.status in ("verified", "review", "failed")
                   and (s.claims_total_count > 0 or s.status == "failed"))
    needs_review = sum(1 for s in submissions if s.status == "review")
    failed = sum(1 for s in submissions if s.status == "failed")
    return HackathonStats(
        total_submissions=total,
        analyzed=analyzed,
        needs_review=needs_review,
        failed=failed,
    )


def format_iso(dt: datetime | str) -> str:
    """Ensure datetime is returned as ISO format string."""
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    return str(dt)


def build_hackathon_response(hackathon: Hackathon) -> HackathonResponse:
    """Builds a HackathonResponse with computed stats and formatted dates."""
    stats = compute_hackathon_stats(hackathon.submissions)
    return HackathonResponse(
        id=hackathon.id,
        name=hackathon.name,
        submission_start=format_iso(hackathon.submission_start),
        submission_end=format_iso(hackathon.submission_end),
        status=hackathon.status,
        problem_statements=[
            ProblemStatementResponse(id=ps.id, title=ps.title, description=ps.description)
            for ps in hackathon.problem_statements
        ],
        stats=stats,
    )


def parse_datetime_input(dt_val: str | datetime) -> datetime:
    """Converts string or datetime to timezone-aware datetime."""
    if isinstance(dt_val, datetime):
        return dt_val if dt_val.tzinfo else dt_val.replace(tzinfo=timezone.utc)
    try:
        clean = dt_val.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def _load_hackathon(hackathon_id: str, db: Session) -> Hackathon:
    """Loads a hackathon with all relationships eager-loaded."""
    stmt = (
        select(Hackathon)
        .options(
            selectinload(Hackathon.problem_statements),
            selectinload(Hackathon.submissions),
        )
        .where(Hackathon.id == hackathon_id)
    )
    hackathon = db.scalar(stmt)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return hackathon


async def _extract_csv_content(request: Request) -> str:
    """Extracts CSV content from JSON body, multipart form, or raw text."""
    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        file_field = form.get("file")
        if file_field and hasattr(file_field, "read"):
            file_bytes = await file_field.read()
            return file_bytes.decode("utf-8", errors="ignore")
        for key in ("raw_text", "csv_data", "csvData"):
            if key in form:
                return str(form.get(key, ""))
        return ""
    try:
        body = await request.json()
        if isinstance(body, dict):
            return body.get("csv_data") or body.get("csvData") or body.get("raw_text") or ""
        if isinstance(body, str):
            return body
    except Exception:
        raw = await request.body()
        return raw.decode("utf-8", errors="ignore")
    return ""


# ---------------------------------------------------------------------------
# POST /hackathons — create hackathon
# ---------------------------------------------------------------------------

@router.post("", response_model=HackathonResponse, status_code=status.HTTP_201_CREATED)
def create_hackathon(payload: HackathonCreate, db: Session = Depends(get_db)):
    """Creates a new hackathon with problem statements and CSV-parsed submissions."""
    hackathon = Hackathon(
        name=payload.name,
        submission_start=parse_datetime_input(payload.submission_start),
        submission_end=parse_datetime_input(payload.submission_end),
        status="draft",
    )
    db.add(hackathon)
    db.flush()

    # Create problem statements with embeddings
    ps_map: dict[str, ProblemStatement] = {}
    created_ps_list: list[ProblemStatement] = []
    for ps_in in payload.problem_statements:
        title = ps_in.title.strip()
        desc = ps_in.description.strip()
        vec = embed(f"{title}. {desc}")
        ps = ProblemStatement(
            hackathon_id=hackathon.id,
            title=title,
            description=desc,
            embedding=serialize_embedding(vec),
        )
        db.add(ps)
        db.flush()
        ps_map[title.lower()] = ps
        created_ps_list.append(ps)

    # Ingest submissions from CSV data
    if payload.csv_data and payload.csv_data.strip():
        ingest = parse_csv_or_pasted_text(payload.csv_data)
        for row in ingest.valid_submissions:
            # Match problem statement by title
            matched_ps_id = None
            if row.problem_statement_title:
                row_title = row.problem_statement_title.lower()
                for ps_title, ps_obj in ps_map.items():
                    if ps_title in row_title or row_title in ps_title:
                        matched_ps_id = ps_obj.id
                        break
            if not matched_ps_id and created_ps_list:
                matched_ps_id = created_ps_list[0].id

            db.add(Submission(
                hackathon_id=hackathon.id,
                team_name=row.team_name,
                project_name=row.project_name,
                github_url=row.github_url,
                problem_statement_id=matched_ps_id,
                status="review",
            ))

    db.commit()
    return build_hackathon_response(_load_hackathon(hackathon.id, db))


# ---------------------------------------------------------------------------
# POST /hackathons/validate — dry-run CSV validation (pre-creation)
# ---------------------------------------------------------------------------

@router.post("/validate", response_model=ValidationResult)
async def validate_csv_standalone(request: Request):
    """Dry-run validation of CSV/pasted rows. No DB writes."""
    content = await _extract_csv_content(request)
    ingest = parse_csv_or_pasted_text(content)
    return ValidationResult(
        rows_parsed=ingest.rows_parsed,
        valid_urls=ingest.valid_urls,
        skipped=[SkippedRow(row=s["row"], reason=s["reason"]) for s in ingest.skipped],
    )


# ---------------------------------------------------------------------------
# GET /hackathons — list all
# ---------------------------------------------------------------------------

@router.get("", response_model=list[HackathonResponse])
def list_hackathons(db: Session = Depends(get_db)):
    """List all hackathons with computed stats."""
    stmt = (
        select(Hackathon)
        .options(selectinload(Hackathon.problem_statements), selectinload(Hackathon.submissions))
        .order_by(Hackathon.created_at.desc())
    )
    return [build_hackathon_response(h) for h in db.scalars(stmt).all()]


# ---------------------------------------------------------------------------
# POST /hackathons/{id}/validate — dry-run CSV for existing hackathon
# ---------------------------------------------------------------------------

@router.post("/{hackathon_id}/validate", response_model=ValidationResult)
async def validate_csv_for_hackathon(hackathon_id: str, request: Request, db: Session = Depends(get_db)):
    """Dry-run validation scoped to an existing hackathon."""
    if not db.get(Hackathon, hackathon_id):
        raise HTTPException(status_code=404, detail="Hackathon not found")
    content = await _extract_csv_content(request)
    ingest = parse_csv_or_pasted_text(content)
    return ValidationResult(
        rows_parsed=ingest.rows_parsed,
        valid_urls=ingest.valid_urls,
        skipped=[SkippedRow(row=s["row"], reason=s["reason"]) for s in ingest.skipped],
    )


# ---------------------------------------------------------------------------
# POST /hackathons/{id}/analyze — trigger pipeline
# ---------------------------------------------------------------------------

@router.post("/{hackathon_id}/analyze", response_model=HackathonResponse)
def trigger_analysis(hackathon_id: str, db: Session = Depends(get_db)):
    """Runs the full verification pipeline synchronously over all submissions."""
    if not db.get(Hackathon, hackathon_id):
        raise HTTPException(status_code=404, detail="Hackathon not found")

    from services.pipeline import run_hackathon_pipeline
    run_hackathon_pipeline(hackathon_id, db)

    return build_hackathon_response(_load_hackathon(hackathon_id, db))


# ---------------------------------------------------------------------------
# GET /hackathons/{id}/progress — poll analysis status
# ---------------------------------------------------------------------------

@router.get("/{hackathon_id}/progress", response_model=AnalysisProgress)
def get_progress(hackathon_id: str, db: Session = Depends(get_db)):
    """Returns per-team analysis progress for the /analyzing UI screen."""
    if not db.get(Hackathon, hackathon_id):
        raise HTTPException(status_code=404, detail="Hackathon not found")

    from services.pipeline import get_hackathon_progress
    data = get_hackathon_progress(hackathon_id, db)
    return AnalysisProgress(
        total=data["total"],
        completed=data["completed"],
        current=[SubmissionProgress(team_name=c["teamName"], status=c["status"]) for c in data["current"]],
    )


# ---------------------------------------------------------------------------
# GET /hackathons/{id} — single hackathon (LAST — catches all /{id} GETs)
# ---------------------------------------------------------------------------

@router.get("/{hackathon_id}", response_model=HackathonResponse)
def get_hackathon(hackathon_id: str, db: Session = Depends(get_db)):
    """Get single hackathon with problem statements and computed stats."""
    return build_hackathon_response(_load_hackathon(hackathon_id, db))
