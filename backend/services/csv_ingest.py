"""
csv_ingest.py — CSV and pasted-text parsing for hackathon team submissions.

Expected columns (case-insensitive, whitespace-tolerant):
  id, teamname, problem statement, github link

Validation rules per BACKEND.md §7.1 and FRONTEND.md §3.2.1:
  - Valid GitHub URLs must match github.com/{owner}/{repo}
  - Rows missing a GitHub link or with an invalid URL are skipped (not fatal)
  - Returns parsed rows, valid count, and skipped details with 1-based row index and reason.
"""

import csv
import io
import re
from typing import Any, NamedTuple


GITHUB_REGEX = re.compile(
    r"^https?://(?:www\.)?github\.com/(?P<owner>[A-Za-z0-9_.\-]+)/(?P<repo>[A-Za-z0-9_.\-]+)(?:/.*)?$",
    re.IGNORECASE,
)


class ParsedSubmission(NamedTuple):
    row_number: int
    team_name: str
    problem_statement_title: str
    github_url: str
    project_name: str


class CsvIngestResult(NamedTuple):
    rows_parsed: int
    valid_urls: int
    valid_submissions: list[ParsedSubmission]
    skipped: list[dict[str, Any]]


def clean_github_url(raw_url: str) -> str | None:
    """Validate and normalize a GitHub repository URL."""
    if not raw_url:
        return None
    url = raw_url.strip()
    match = GITHUB_REGEX.match(url)
    if not match:
        return None
    owner = match.group("owner")
    repo = match.group("repo")
    if repo.endswith(".git"):
        repo = repo[:-4]
    return f"https://github.com/{owner}/{repo}"


def parse_csv_or_pasted_text(raw_text: str) -> CsvIngestResult:
    """
    Parses CSV or pasted lines into validated submission records.
    
    Tolerates:
      - Trailing/leading whitespace
      - Header rows in varied case ("Team Name", "teamname", "Team", "GitHub Link", etc.)
      - Commas or tabs
      - Empty lines
    """
    if not raw_text or not raw_text.strip():
        return CsvIngestResult(
            rows_parsed=0,
            valid_urls=0,
            valid_submissions=[],
            skipped=[],
        )

    # Detect delimiter or fallback to comma
    sample = raw_text[:2048]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;")
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ","

    stream = io.StringIO(raw_text.strip())
    reader = csv.reader(stream, delimiter=delimiter)

    raw_rows = [row for row in reader if any(cell.strip() for cell in row)]
    if not raw_rows:
        return CsvIngestResult(
            rows_parsed=0,
            valid_urls=0,
            valid_submissions=[],
            skipped=[],
        )

    # Check if first row is a header
    header_candidate = [c.strip().lower() for c in raw_rows[0]]
    has_header = any(
        any(k in col for k in ["team", "github", "problem", "link", "url", "statement", "id"])
        for col in header_candidate
    )

    team_col_idx = 1
    problem_col_idx = 2
    github_col_idx = 3

    start_idx = 0
    if has_header:
        start_idx = 1
        for idx, col in enumerate(header_candidate):
            if "team" in col:
                team_col_idx = idx
            elif "problem" in col or "statement" in col:
                problem_col_idx = idx
            elif "github" in col or "link" in col or "url" in col or "repo" in col:
                github_col_idx = idx

    valid_submissions: list[ParsedSubmission] = []
    skipped: list[dict[str, Any]] = []
    total_data_rows = 0

    for line_idx, row in enumerate(raw_rows[start_idx:], start=start_idx + 1):
        total_data_rows += 1
        cols = [c.strip() for c in row]

        team_name = cols[team_col_idx] if len(cols) > team_col_idx else ""
        problem_title = cols[problem_col_idx] if len(cols) > problem_col_idx else ""
        github_link = cols[github_col_idx] if len(cols) > github_col_idx else ""

        # Fallback if positional indices failed or columns were fewer
        if not github_link:
            for c in cols:
                if "github.com" in c:
                    github_link = c
                    break

        if not team_name and len(cols) > 0:
            team_name = cols[0] if len(cols) == 1 or not has_header else f"Team {line_idx}"

        if not team_name:
            team_name = f"Team {line_idx}"

        if not github_link:
            skipped.append({
                "row": line_idx,
                "reason": f"Row {line_idx} (Team: '{team_name}'): Missing GitHub URL",
            })
            continue

        normalized_url = clean_github_url(github_link)
        if not normalized_url:
            skipped.append({
                "row": line_idx,
                "reason": f"Row {line_idx} (Team: '{team_name}'): Invalid GitHub URL format '{github_link}'",
            })
            continue

        # Extract fallback project name from repo name
        repo_part = normalized_url.rstrip("/").split("/")[-1]
        project_name = repo_part.replace("-", " ").replace("_", " ").title()

        valid_submissions.append(
            ParsedSubmission(
                row_number=line_idx,
                team_name=team_name,
                problem_statement_title=problem_title,
                github_url=normalized_url,
                project_name=project_name,
            )
        )

    return CsvIngestResult(
        rows_parsed=total_data_rows,
        valid_urls=len(valid_submissions),
        valid_submissions=valid_submissions,
        skipped=skipped,
    )
