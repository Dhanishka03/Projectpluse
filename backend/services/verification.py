"""
verification.py — Decision logic for verifying individual claims against evidence.

Rules per BACKEND.md §8 & §10:
  1. Clear VERIFIED: keyword hit in code AND a matching dependency present -> "verified", no LLM call.
  2. Clear NOT_FOUND: zero found candidate evidence -> "not_found", no LLM call.
  3. Ambiguous (keyword only, dependency only, partial) -> call llm_client.judge_claim(claim, evidence).
  4. Derive Issue objects from claims that are partially_verified ("overstated") or not_found ("not_verified").
"""

from dataclasses import dataclass
from typing import Any, Optional
from services.llm_client import judge_claim


@dataclass
class ClaimVerificationResult:
    claim_text: str
    status: str  # "verified" | "partially_verified" | "not_found"
    finding: str
    evidence: list[dict[str, Any]]
    issue: Optional[dict[str, Any]] = None


def verify_claim(claim_text: str, evidence_list: list[dict[str, Any]]) -> ClaimVerificationResult:
    """
    Verifies a claim against gathered evidence.
    Short-circuits clear cases to conserve LLM quota.
    """
    found_items = [e for e in evidence_list if e.get("found", False)]

    # Rule 2: Zero found evidence -> immediate NOT_FOUND
    if not found_items:
        finding = f"No implementation code or dependency evidence detected for '{claim_text}'."
        issue = {
            "type": "not_verified",
            "title": f"Claim Not Verified — \"{claim_text}\"",
            "description": f"The repository does not appear to contain implementation code or dependencies for '{claim_text}'.",
        }
        return ClaimVerificationResult(
            claim_text=claim_text,
            status="not_found",
            finding=finding,
            evidence=evidence_list,
            issue=issue,
        )

    has_code_match = any(e.get("type") == "code" for e in found_items)
    has_dep_match = any(e.get("type") == "dependency" for e in found_items)

    # Rule 1: Code match + Dependency match -> immediate VERIFIED
    if has_code_match and has_dep_match:
        code_file = next(e["file"] for e in found_items if e.get("type") == "code")
        dep_file = next(e["file"] for e in found_items if e.get("type") == "dependency")
        finding = f"Verified implementation in {code_file} with supporting package declaration in {dep_file}."
        return ClaimVerificationResult(
            claim_text=claim_text,
            status="verified",
            finding=finding,
            evidence=evidence_list,
            issue=None,
        )

    # Rule 3: Ambiguous cases -> consult LLM judge
    status, finding = judge_claim(claim_text, evidence_list)

    issue = None
    if status == "partially_verified":
        issue = {
            "type": "overstated",
            "title": f"Claim Overstated — \"{claim_text}\"",
            "description": finding,
        }
    elif status == "not_found":
        issue = {
            "type": "not_verified",
            "title": f"Claim Not Verified — \"{claim_text}\"",
            "description": finding,
        }

    return ClaimVerificationResult(
        claim_text=claim_text,
        status=status,
        finding=finding,
        evidence=evidence_list,
        issue=issue,
    )
