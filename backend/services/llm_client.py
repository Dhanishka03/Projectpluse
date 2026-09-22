"""
llm_client.py — Single point of contact for all LLM calls in Projectpulse.

RULE: All LLM calls MUST go through this file — nowhere else.

Functions:
  - extract_claims(readme_text: str) -> list[str]
  - judge_claim(claim: str, evidence: list[dict]) -> tuple[str, str]
    Returns (status, one_sentence_finding) where status is
    "verified" | "partially_verified" | "not_found".
"""

import json
import re
from typing import Any
try:
    import google.generativeai as genai
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None
    _GENAI_AVAILABLE = False

from config import settings

_MODEL_NAME = "gemini-1.5-flash"
_initialized = False


def _init_gemini() -> bool:
    """Configures the Gemini API client if an API key is available."""
    global _initialized
    if not _GENAI_AVAILABLE or genai is None:
        return False
    if _initialized:
        return True
    api_key = settings.gemini_api_key.strip() if settings.gemini_api_key else ""
    if not api_key:
        return False
    try:
        genai.configure(api_key=api_key)
        _initialized = True
        return True
    except Exception:
        return False



def _clean_json_fence(text: str) -> str:
    """Removes markdown ```json ... ``` code fences from LLM responses."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _heuristic_extract_claims(readme_text: str) -> list[str]:
    """
    Fallback claim extractor when Gemini API is unconfigured or offline.
    Extracts bullet points, feature lists, and headers from the README.
    """
    if not readme_text:
        return []
    claims: list[str] = []
    lines = readme_text.splitlines()
    in_features_section = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        lower = stripped.lower()
        if any(h in lower for h in ["features", "capabilities", "what it does", "key features", "overview"]):
            in_features_section = True
            continue
        if stripped.startswith("#") and in_features_section:
            in_features_section = False

        # Bullet items
        if stripped.startswith(("-", "*", "+", "•")) or re.match(r"^\d+[\.\)]\s+", stripped):
            item = re.sub(r"^[-*+•\d\.\)\s]+", "", stripped).strip()
            item = re.sub(r"\[.*?\]\(.*?\)", "", item).strip()  # remove markdown links
            item = re.sub(r"[*_`]", "", item).strip()
            if 10 <= len(item) <= 120 and not item.startswith("http"):
                claims.append(item)
                if len(claims) >= 8:
                    break

    # If still empty, take non-header declarative sentences
    if not claims:
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and 15 <= len(stripped) <= 100:
                claims.append(stripped)
                if len(claims) >= 5:
                    break

    return claims[:8]


def extract_claims(readme_text: str) -> list[str]:
    """
    Extracts high-level verifiable feature/technical claims made in the README.
    Returns a list of short claim strings (e.g. 'Supports Gmail OAuth integration').
    """
    if not readme_text or not readme_text.strip():
        return []

    if not _init_gemini():
        return _heuristic_extract_claims(readme_text)

    prompt = f"""
You are an expert technical auditor analyzing a hackathon project README.
Extract the key functional and technical claims made by the project creators about what the system builds, does, or integrates with.

Rules:
1. Return ONLY a valid JSON array of short strings (e.g. ["OAuth authentication", "PostgreSQL database integration", "PDF generation"]).
2. Extract between 3 and 10 concrete, verifiable claims.
3. Keep each claim concise (under 15 words).
4. Do NOT output any markdown formatting other than raw JSON or json code fences.
5. If the README has no features or claims, return [].

README text:
\"\"\"
{readme_text[:6000]}
\"\"\"
"""
    model = genai.GenerativeModel(_MODEL_NAME)

    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text if response else ""
            cleaned = _clean_json_fence(raw_text)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                # Ensure all elements are non-empty strings
                claims = [str(c).strip() for c in parsed if str(c).strip()]
                return claims
        except Exception:
            if attempt == 1:
                # Fallback on second failure
                return _heuristic_extract_claims(readme_text)

    return _heuristic_extract_claims(readme_text)


def judge_claim(claim: str, evidence: list[dict[str, Any]]) -> tuple[str, str]:
    """
    Judges ambiguous claims where candidate evidence exists but is not a conclusive
    code+dependency match.
    
    Returns:
      (status, finding)
      status: "verified" | "partially_verified" | "not_found"
      finding: a concise, one-sentence explanation for human judges.
    """
    if not evidence:
        return "not_found", f"No implementation or dependency evidence found for '{claim}'."

    found_items = [e for e in evidence if e.get("found", True)]
    if not found_items:
        return "not_found", f"No active code references or dependencies found supporting '{claim}'."

    if not _init_gemini():
        # Heuristic judgment
        has_code = any(e.get("type") == "code" for e in found_items)
        has_dep = any(e.get("type") == "dependency" for e in found_items)
        if has_code and has_dep:
            return "verified", f"Implementation code and matching dependency found for {claim}."
        elif has_code:
            first_file = found_items[0].get("file", "codebase")
            return "partially_verified", f"Code references found in {first_file}, but full integration could not be conclusively verified."
        else:
            return "partially_verified", f"Dependency present, but explicit usage logic for {claim} was not detected."

    evidence_summary = "\n".join(
        f"- [{e.get('type', 'code').upper()}] {e.get('file', '')}: {e.get('description', '')}"
        for e in found_items[:8]
    )

    prompt = f"""
You are an expert technical judge verifying a hackathon claim against repository evidence.

Claim: "{claim}"

Candidate evidence found in repository:
{evidence_summary}

Determine the verification status of this claim.
Options for status:
- "verified": The evidence strongly demonstrates that this claim is implemented.
- "partially_verified": Evidence of the technology/logic exists, but the complete feature appears partial, mocked, or overstated. (Bias toward partially_verified when evidence is ambiguous).
- "not_found": The evidence does not meaningfully support this claim.

Return ONLY a JSON object:
{{
  "status": "verified" | "partially_verified" | "not_found",
  "finding": "One concise sentence explaining the judgment for human judges."
}}
"""
    model = genai.GenerativeModel(_MODEL_NAME)

    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text if response else ""
            cleaned = _clean_json_fence(raw_text)
            parsed = json.loads(cleaned)
            status_val = parsed.get("status", "partially_verified")
            if status_val not in ("verified", "partially_verified", "not_found"):
                status_val = "partially_verified"
            finding_val = parsed.get("finding", f"Analysis completed for claim '{claim}'.")
            return status_val, finding_val
        except Exception:
            if attempt == 1:
                break

    return "partially_verified", f"Partial evidence found for '{claim}', requiring human review."
