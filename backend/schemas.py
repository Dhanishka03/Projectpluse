"""
schemas.py — Pydantic request/response models.

CRITICAL: field names and enum values MUST match FRONTEND.md section 5 exactly.
All response models use camelCase aliases so FastAPI serializes camelCase JSON
while Python internals stay snake_case.

Strategy:
  - ORM models (models.py) use snake_case column names.
  - These Pydantic schemas use snake_case field names with camelCase aliases.
  - `model_config = {"populate_by_name": True}` lets us build schemas from
    ORM objects using snake_case, but the JSON output is camelCase.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


# ---------------------------------------------------------------------------
# Shared config mixin — apply to every response schema
# ---------------------------------------------------------------------------

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,  # allow construction via snake_case kwarg
        from_attributes=True,   # allow building from ORM objects
    )


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------

class EvidenceResponse(CamelModel):
    """Matches the Evidence TypeScript interface in FRONTEND.md §5."""
    file: str
    line: Optional[int] = None
    type: Literal["code", "dependency"]
    description: str
    found: bool


# ---------------------------------------------------------------------------
# Issue
# ---------------------------------------------------------------------------

class IssueResponse(CamelModel):
    """Matches the Issue TypeScript interface in FRONTEND.md §5."""
    id: str
    claim_id: str
    type: Literal["overstated", "not_verified"]
    title: str
    description: str


# ---------------------------------------------------------------------------
# Claim
# ---------------------------------------------------------------------------

class ClaimResponse(CamelModel):
    """Matches the Claim TypeScript interface in FRONTEND.md §5."""
    id: str
    text: str
    status: Literal["verified", "partially_verified", "not_found"]
    finding: str
    evidence: list[EvidenceResponse] = []


# ---------------------------------------------------------------------------
# ProblemStatement
# ---------------------------------------------------------------------------

class ProblemStatementResponse(CamelModel):
    """Matches the ProblemStatement TypeScript interface in FRONTEND.md §5."""
    id: str
    title: str
    description: str


class ProblemStatementCreate(BaseModel):
    """Used in POST /hackathons request body."""
    title: str
    description: str


# ---------------------------------------------------------------------------
# Hackathon stats (computed at read time, never stored)
# ---------------------------------------------------------------------------

class HackathonStats(CamelModel):
    total_submissions: int = 0
    analyzed: int = 0
    needs_review: int = 0
    failed: int = 0


# ---------------------------------------------------------------------------
# Hackathon
# ---------------------------------------------------------------------------

class HackathonResponse(CamelModel):
    """Matches the Hackathon TypeScript interface in FRONTEND.md §5."""
    id: str
    name: str
    submission_start: str  # ISO date string
    submission_end: str
    problem_statements: list[ProblemStatementResponse] = []
    status: Literal["draft", "analyzing", "complete"]
    stats: HackathonStats = Field(default_factory=HackathonStats)


class HackathonCreate(BaseModel):
    """Request body for POST /hackathons."""
    name: str
    submission_start: str   # ISO date string
    submission_end: str
    problem_statements: list[ProblemStatementCreate] = []
    csv_data: Optional[str] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )



# ---------------------------------------------------------------------------
# Submission
# ---------------------------------------------------------------------------

class SubmissionResponse(CamelModel):
    """Matches the Submission TypeScript interface in FRONTEND.md §5."""
    id: str
    team_name: str
    project_name: str
    github_url: str
    problem_statement_id: Optional[str] = None
    relevance_score: int
    claims_verified_count: int
    claims_total_count: int
    issues_count: int
    status: Literal["verified", "review", "failed"]
    failure_reason: Optional[str] = None
    claims: list[ClaimResponse] = []
    issues: list[IssueResponse] = []


# ---------------------------------------------------------------------------
# CSV validation (POST /hackathons/{id}/validate)
# ---------------------------------------------------------------------------

class ValidateRequest(BaseModel):
    csv_data: Optional[str] = Field(default=None, alias="csvData")
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class SkippedRow(BaseModel):
    row: int
    reason: str


class ValidationResult(BaseModel):
    rows_parsed: int = Field(alias="rowsParsed")
    valid_urls: int = Field(alias="validUrls")
    skipped: list[SkippedRow] = []

    model_config = ConfigDict(populate_by_name=True)



# ---------------------------------------------------------------------------
# Progress (GET /hackathons/{id}/progress)
# ---------------------------------------------------------------------------

class SubmissionProgress(BaseModel):
    team_name: str = Field(alias="teamName")
    status: Literal["done", "analyzing", "queued"]

    model_config = ConfigDict(populate_by_name=True)


class AnalysisProgress(BaseModel):
    total: int
    completed: int
    current: list[SubmissionProgress]
