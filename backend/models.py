"""
models.py — SQLAlchemy ORM models.
Exactly mirrors BACKEND.md section 5. Six tables:
  Hackathon → ProblemStatement (1-to-many)
  Hackathon → Submission (1-to-many)
  Submission → Claim (1-to-many)
  Claim → Evidence (1-to-many)
  Claim → Issue (1-to-many, via Submission)
  Submission → Issue (1-to-many)

Hackathon.stats is NOT stored — computed at read time from Submission rows.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Hackathon(Base):
    __tablename__ = "hackathons"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    submission_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submission_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # "draft" | "analyzing" | "complete"
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    problem_statements: Mapped[list["ProblemStatement"]] = relationship(
        "ProblemStatement", back_populates="hackathon", cascade="all, delete-orphan"
    )
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission", back_populates="hackathon", cascade="all, delete-orphan"
    )


class ProblemStatement(Base):
    __tablename__ = "problem_statements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    hackathon_id: Mapped[str] = mapped_column(
        String, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # pickled numpy vector; computed once at hackathon creation (Module 5)
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)

    hackathon: Mapped["Hackathon"] = relationship("Hackathon", back_populates="problem_statements")
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission", back_populates="problem_statement"
    )


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    hackathon_id: Mapped[str] = mapped_column(
        String, ForeignKey("hackathons.id", ondelete="CASCADE"), nullable=False
    )
    team_name: Mapped[str] = mapped_column(String, nullable=False)
    # derived from README title; falls back to repo name in github_client
    project_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    github_url: Mapped[str] = mapped_column(String, nullable=False)
    problem_statement_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("problem_statements.id", ondelete="SET NULL"), nullable=True
    )
    readme_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    relevance_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    claims_verified_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    claims_total_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    issues_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # "verified" | "review" | "failed"
    status: Mapped[str] = mapped_column(String, nullable=False, default="review")
    failure_reason: Mapped[str | None] = mapped_column(String, nullable=True)

    hackathon: Mapped["Hackathon"] = relationship("Hackathon", back_populates="submissions")
    problem_statement: Mapped["ProblemStatement | None"] = relationship(
        "ProblemStatement", back_populates="submissions"
    )
    claims: Mapped[list["Claim"]] = relationship(
        "Claim", back_populates="submission", cascade="all, delete-orphan"
    )
    issues: Mapped[list["Issue"]] = relationship(
        "Issue", back_populates="submission", cascade="all, delete-orphan"
    )


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    submission_id: Mapped[str] = mapped_column(
        String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    # "verified" | "partially_verified" | "not_found"
    status: Mapped[str] = mapped_column(String, nullable=False, default="not_found")
    finding: Mapped[str] = mapped_column(Text, nullable=False, default="")

    submission: Mapped["Submission"] = relationship("Submission", back_populates="claims")
    evidence: Mapped[list["Evidence"]] = relationship(
        "Evidence", back_populates="claim", cascade="all, delete-orphan"
    )
    issues: Mapped[list["Issue"]] = relationship(
        "Issue", back_populates="claim", cascade="all, delete-orphan"
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    claim_id: Mapped[str] = mapped_column(
        String, ForeignKey("claims.id", ondelete="CASCADE"), nullable=False
    )
    file: Mapped[str] = mapped_column(String, nullable=False)
    line: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # "code" | "dependency"
    type: Mapped[str] = mapped_column(String, nullable=False, default="code")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # true = "found" list, false = "not found" list
    found: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # internal only — "keyword" | "semgrep" | "dependency"
    source: Mapped[str] = mapped_column(String, nullable=False, default="keyword")

    claim: Mapped["Claim"] = relationship("Claim", back_populates="evidence")


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    submission_id: Mapped[str] = mapped_column(
        String, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False
    )
    claim_id: Mapped[str] = mapped_column(
        String, ForeignKey("claims.id", ondelete="CASCADE"), nullable=False
    )
    # "overstated" | "not_verified"
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    submission: Mapped["Submission"] = relationship("Submission", back_populates="issues")
    claim: Mapped["Claim"] = relationship("Claim", back_populates="issues")
