"""
llm_client.py — Single point of contact for all LLM calls in Projectpulse.

RULE: All LLM calls MUST go through this file — nowhere else.

Functions:
  - extract_claims(readme_text: str) -> list[str]
      Returns only CONCRETE, TESTABLE claims; ignores "planned / future / coming soon"
      sentences.
  - identify_problem_statement(readme_text, problem_statements) -> str | None
  - decompose_problem_requirements(problem_title, problem_description) -> list[dict]
      Breaks a PS into discrete, scoreable requirements.
  - score_requirements_coverage(requirements, readme_text, file_paths, manifests) -> list[dict]
      Scores each requirement as met / partial / missing with evidence.
  - judge_claim(claim: str, evidence: list[dict]) -> tuple[str, str]
      Returns (status, one_sentence_finding).
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

_MODEL_NAME = "gemini-flash-latest"
_initialized = False

_FUTURE_PATTERNS = re.compile(
    r"\b(planned|planning|future|coming soon|will (be |have |support |add |implement|include)|"
    r"todo|to-do|roadmap|upcoming|not yet|in progress|work in progress|wip|"
    r"we (intend|plan|will)|would like to|eventually|wishlist|next version|"
    r"phase [2-9]|milestone [2-9])\b",
    re.IGNORECASE,
)


def _init_gemini() -> bool:
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
    text = text.strip()
    if text.startswith("`"):
        text = re.sub(r"^`(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*`$", "", text)
    return text.strip()


def _is_future_statement(sentence: str) -> bool:
    return bool(_FUTURE_PATTERNS.search(sentence))


def _heuristic_extract_claims(readme_text: str) -> list[str]:
    if not readme_text:
        return []
    claims: list[str] = []
    lines = readme_text.splitlines()
    in_roadmap_section = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        lower = stripped.lower()
        if stripped.startswith("#"):
            if any(h in lower for h in ["roadmap", "todo", "planned", "future work", "coming soon", "next steps"]):
                in_roadmap_section = True
            elif any(h in lower for h in ["features", "capabilities", "what it does", "key features", "overview"]):
                in_roadmap_section = False
            else:
                in_roadmap_section = False
            continue
        if in_roadmap_section:
            continue
        if _is_future_statement(stripped):
            continue
        if stripped.startswith(("-", "*", "+", "•")) or re.match(r"^\d+[\.\)]\s+", stripped):
            item = re.sub(r"^[-*+•\d\.\)\s]+", "", stripped).strip()
            item = re.sub(r"\[.*?\]\(.*?\)", "", item).strip()
            item = re.sub(r"[*_]", "", item).strip()
            if 10 <= len(item) <= 120 and not item.startswith("http"):
                claims.append(item)
                if len(claims) >= 8:
                    break

    if not claims:
        for line in lines:
            stripped = line.strip()
            if stripped and not stripped.startswith("#") and 15 <= len(stripped) <= 100:
                if not _is_future_statement(stripped):
                    claims.append(stripped)
                    if len(claims) >= 5:
                        break
    return claims[:8]


def extract_claims(readme_text: str) -> list[str]:
    if not readme_text or not readme_text.strip():
        return []
    if not _init_gemini():
        return _heuristic_extract_claims(readme_text)

    prompt = (
        "You are an expert technical auditor analyzing a hackathon project README.\n"
        "Extract only CONCRETE, ALREADY-IMPLEMENTED verifiable technical/functional claims.\n\n"
        "Strict rules:\n"
        "1. Return ONLY a valid JSON array of short strings.\n"
        "2. Extract between 3 and 10 concrete, currently-implemented claims.\n"
        "3. Keep each claim concise (under 15 words).\n"
        "4. Do NOT output any markdown formatting other than raw JSON or json code fences.\n"
        "5. If the README has no concrete implemented features/claims, return [].\n"
        "6. SKIP any claim containing: 'planned', 'future', 'coming soon', 'will support',\n"
        "   'will add', 'TODO', 'roadmap', 'upcoming', 'in progress', 'not yet', 'WIP'.\n"
        "7. SKIP sections titled Roadmap, Future Work, TODO, Planned Features, Coming Soon.\n\n"
        f"README text:\n\"\"\"\n{readme_text[:6000]}\n\"\"\""
    )
    model = genai.GenerativeModel(_MODEL_NAME)
    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text if response else ""
            cleaned = _clean_json_fence(raw_text)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                claims = [str(c).strip() for c in parsed if str(c).strip()]
                claims = [c for c in claims if not _is_future_statement(c)]
                return claims
        except Exception:
            if attempt == 1:
                return _heuristic_extract_claims(readme_text)
    return _heuristic_extract_claims(readme_text)


def identify_problem_statement(
    readme_text: str,
    problem_statements: list[dict],
) -> "str | None":
    if not readme_text or not readme_text.strip():
        return None
    if not problem_statements:
        return None
    if len(problem_statements) == 1:
        return problem_statements[0]["id"]
    if not _init_gemini():
        return None

    ps_lines = "\n".join(
        f'{i + 1}. [ID: {ps["id"]}] {ps["title"]}'
        + (f' -- {ps["description"][:200]}' if ps.get("description") else "")
        for i, ps in enumerate(problem_statements)
    )
    prompt = (
        "You are a hackathon judge. Identify which ONE problem statement the team README is solving.\n\n"
        f"Problem statements:\n{ps_lines}\n\n"
        f"Team README (first 4000 chars):\n\"\"\"\n{readme_text[:4000]}\n\"\"\"\n\n"
        "Instructions:\n"
        "- Match based on domain, project goals, keywords, technology.\n"
        "- Every team solves exactly one problem statement -- pick the closest match.\n"
        '- Return ONLY raw JSON: {"id": "<matching_id>"}\n'
        '- If no match, return {"id": null}\n'
        "- No explanation, no markdown."
    )
    model = genai.GenerativeModel(_MODEL_NAME)
    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text if response else ""
            cleaned = _clean_json_fence(raw_text)
            parsed = json.loads(cleaned)
            matched_id = parsed.get("id")
            if matched_id and any(ps["id"] == matched_id for ps in problem_statements):
                return str(matched_id)
        except Exception:
            if attempt == 1:
                break
    return None


_DEFAULT_REQUIREMENT_CATEGORIES = [
    "input_type", "target_users", "core_ai_task",
    "output_advisory", "language_support", "deployment_platform",
]


def decompose_problem_requirements(
    problem_title: str,
    problem_description: str,
) -> list[dict[str, Any]]:
    """
    Breaks a problem statement into discrete, independently-scoreable requirements.
    Returns list of dicts: {id, category, description, weight}
    Falls back to keyword heuristic when Gemini is unavailable.
    """
    if not problem_title and not problem_description:
        return []
    if not _init_gemini():
        return _heuristic_decompose(problem_title, problem_description)

    categories_str = ", ".join(_DEFAULT_REQUIREMENT_CATEGORIES)
    prompt = (
        "You are an expert hackathon evaluator. Break the following problem statement into\n"
        "3-8 discrete, independently verifiable requirements that a submission must satisfy.\n\n"
        f"Problem title: {problem_title}\n"
        f"Problem description: {problem_description[:2000]}\n\n"
        "For each requirement produce a JSON object with these exact keys:\n"
        '  "id": "req_N" (0-indexed),\n'
        f'  "category": one of [{categories_str}],\n'
        '  "description": short sentence describing what the submission must do/have,\n'
        '  "weight": float 0.5-2.0 reflecting importance.\n\n'
        "Return ONLY a JSON array. No markdown, no explanation."
    )
    model = genai.GenerativeModel(_MODEL_NAME)
    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text if response else ""
            cleaned = _clean_json_fence(raw_text)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list) and parsed:
                reqs = []
                for i, r in enumerate(parsed):
                    reqs.append({
                        "id": r.get("id", f"req_{i}"),
                        "category": r.get("category", "core_ai_task"),
                        "description": str(r.get("description", "")).strip(),
                        "weight": float(r.get("weight", 1.0)),
                    })
                return reqs
        except Exception:
            if attempt == 1:
                break
    return _heuristic_decompose(problem_title, problem_description)


def _heuristic_decompose(title: str, description: str) -> list[dict[str, Any]]:
    text = f"{title}. {description}"
    reqs: list[dict[str, Any]] = []
    patterns = [
        ("input_type",          r"\b(image|audio|text|video|sensor|data)\b",                   1.0),
        ("core_ai_task",        r"\b(detect|classify|predict|recommend|generate|translate|summarize)\b", 2.0),
        ("target_users",        r"\b(farmer|patient|student|citizen|user|community)\b",         1.0),
        ("output_advisory",     r"\b(report|alert|recommendation|dashboard|insight)\b",         1.5),
        ("language_support",    r"\b(multilingual|language|vernacular|urdu|hindi|local)\b",     1.0),
        ("deployment_platform", r"\b(mobile|web|app|api|cloud|edge)\b",                         0.5),
    ]
    for cat, pattern, weight in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            reqs.append({
                "id": f"req_{len(reqs)}",
                "category": cat,
                "description": f"Project addresses '{m.group()}' aspect of: {title}",
                "weight": weight,
            })
    if not reqs:
        reqs = [{"id": "req_0", "category": "core_ai_task",
                 "description": f"Submission addresses: {title}", "weight": 1.0}]
    return reqs


def score_requirements_coverage(
    requirements: list[dict[str, Any]],
    readme_text: str,
    file_paths: list[str],
    manifest_contents: dict[str, str],
) -> list[dict[str, Any]]:
    """
    Scores each requirement as 'met' / 'partial' / 'missing'.
    Augments each req dict with: status, evidence (list[str]), score (float 0-1).
    Falls back to keyword heuristic when Gemini is unavailable.
    """
    if not requirements:
        return []
    if not _init_gemini():
        return _heuristic_score_requirements(requirements, readme_text, file_paths, manifest_contents)

    file_list_str = "\n".join(file_paths[:80])
    manifest_str = "\n\n".join(
        f"=== {fp} ===\n{content[:300]}"
        for fp, content in list(manifest_contents.items())[:4]
    )
    req_list_str = "\n".join(
        f'  req_id={r["id"]}: {r["description"]}'
        for r in requirements
    )
    prompt = (
        "You are a hackathon code reviewer. Score each requirement as 'met', 'partial', or 'missing'\n"
        "based ONLY on the provided evidence (README, file list, manifests).\n\n"
        f"Requirements:\n{req_list_str}\n\n"
        f"README (first 3000 chars):\n\"\"\"\n{readme_text[:3000]}\n\"\"\"\n\n"
        f"Repository files (first 80):\n{file_list_str}\n\n"
        f"Dependency manifests:\n{manifest_str}\n\n"
        "Return a JSON array, one object per requirement:\n"
        '  {"id": "req_N", "status": "met"|"partial"|"missing",\n'
        '   "evidence": ["up to 3 short strings"], "score": 1.0|0.5|0.0}\n\n'
        "Return ONLY valid JSON array, no markdown."
    )
    model = genai.GenerativeModel(_MODEL_NAME)
    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            raw_text = response.text if response else ""
            cleaned = _clean_json_fence(raw_text)
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                score_map = {item["id"]: item for item in parsed if isinstance(item, dict)}
                result = []
                for req in requirements:
                    r = dict(req)
                    scored = score_map.get(req["id"], {})
                    r["status"] = scored.get("status", "missing")
                    r["evidence"] = scored.get("evidence", [])
                    if r["status"] == "met":
                        r["score"] = 1.0
                    elif r["status"] == "partial":
                        r["score"] = 0.5
                    else:
                        r["score"] = 0.0
                    result.append(r)
                return result
        except Exception:
            if attempt == 1:
                break
    return _heuristic_score_requirements(requirements, readme_text, file_paths, manifest_contents)


def _heuristic_score_requirements(
    requirements: list[dict[str, Any]],
    readme_text: str,
    file_paths: list[str],
    manifest_contents: dict[str, str],
) -> list[dict[str, Any]]:
    readme_lower = readme_text.lower()
    all_files_lower = " ".join(file_paths).lower()
    all_manifests_lower = " ".join(manifest_contents.values()).lower()
    combined = f"{readme_lower} {all_files_lower} {all_manifests_lower}"
    stopwords = {"the", "a", "an", "of", "to", "for", "with", "and", "or", "in", "on"}
    result = []
    for req in requirements:
        r = dict(req)
        desc_lower = req["description"].lower()
        keywords = [w for w in re.findall(r"[a-z]{3,}", desc_lower) if w not in stopwords]
        hits = [kw for kw in keywords if kw in combined]
        ratio = len(hits) / max(len(keywords), 1)
        if ratio >= 0.6:
            r["status"], r["score"] = "met", 1.0
        elif ratio >= 0.3:
            r["status"], r["score"] = "partial", 0.5
        else:
            r["status"], r["score"] = "missing", 0.0
        evidence = []
        for kw in hits[:3]:
            mf = [p for p in file_paths if kw in p.lower()]
            evidence.append(mf[0] if mf else f"README contains '{kw}'")
        r["evidence"] = evidence
        result.append(r)
    return result


def judge_claim(claim: str, evidence: list[dict[str, Any]]) -> tuple[str, str]:
    """
    Judges ambiguous claims. Returns (status, finding).
    status: "verified" | "partially_verified" | "not_found"
    """
    if not evidence:
        return "not_found", f"No implementation or dependency evidence found for '{claim}'."
    found_items = [e for e in evidence if e.get("found", True)]
    if not found_items:
        return "not_found", f"No active code references or dependencies found supporting '{claim}'."
    if not _init_gemini():
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
    prompt = (
        "You are an expert technical judge verifying a hackathon claim against repository evidence.\n\n"
        f'Claim: "{claim}"\n\n'
        f"Candidate evidence found in repository:\n{evidence_summary}\n\n"
        "Determine the verification status of this claim.\n"
        "Options:\n"
        '- "verified": Evidence strongly demonstrates implementation.\n'
        '- "partially_verified": Evidence exists but feature appears partial/mocked/overstated.\n'
        '- "not_found": Evidence does not support this claim.\n\n'
        "Return ONLY a JSON object:\n"
        '{"status": "verified" | "partially_verified" | "not_found", "finding": "One concise sentence."}'
    )
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
