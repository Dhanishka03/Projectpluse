"""
github_client.py — GitHub API client for repository inspection.

Fetches:
  - Repository metadata (default branch, description, repo name)
  - README content (base64-decoded)
  - Full recursive file tree
  - Raw file contents (e.g. dependency manifests, code files for evidence)

Handles 404 (not found) and 403 (private/rate-limited) gracefully by returning
failure status rather than raising exceptions that crash the pipeline.
"""

import base64
import re
from dataclasses import dataclass, field
from typing import Any, Optional
import requests

from config import settings

GITHUB_API_BASE = "https://api.github.com"
RAW_GITHUB_BASE = "https://raw.githubusercontent.com"

MANIFEST_FILENAMES = {
    "requirements.txt",
    "package.json",
    "pyproject.toml",
    "Pipfile",
    "setup.py",
    "Cargo.toml",
    "go.mod",
    "pom.xml",
    "build.gradle",
    "Gemfile",
}


@dataclass
class RepoBundle:
    success: bool
    failure_reason: Optional[str] = None
    owner: str = ""
    repo: str = ""
    default_branch: str = "main"
    readme_text: str = ""
    file_tree: list[dict[str, Any]] = field(default_factory=list)
    file_paths: list[str] = field(default_factory=list)
    manifest_contents: dict[str, str] = field(default_factory=dict)
    cached_files: dict[str, str] = field(default_factory=dict)


def _get_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Projectpulse-Verifier/1.0",
    }
    token = settings.github_token.strip() if settings.github_token else ""
    if token:
        # Support both 'token <pat>' and 'Bearer <pat>'
        headers["Authorization"] = f"token {token}"
    return headers


def clean_github_url(github_url: str) -> str | None:
    """Normalize a GitHub repository URL to https://github.com/owner/repo."""
    parsed = parse_owner_repo(github_url)
    if not parsed:
        return None
    return f"https://github.com/{parsed[0]}/{parsed[1]}"


def parse_owner_repo(github_url: str) -> tuple[str, str] | None:

    """Extract (owner, repo) from a GitHub repository URL."""
    if not github_url:
        return None
    url = github_url.strip()
    match = re.search(
        r"github\.com/(?P<owner>[A-Za-z0-9_.\-]+)/(?P<repo>[A-Za-z0-9_.\-]+)",
        url,
        re.IGNORECASE,
    )
    if not match:
        return None
    owner = match.group("owner")
    repo = match.group("repo")
    if repo.endswith(".git"):
        repo = repo[:-4]
    return owner, repo


def fetch_repo_metadata(owner: str, repo: str) -> tuple[dict[str, Any] | None, Optional[str]]:
    """Fetch repo metadata. Returns (metadata_dict, failure_reason)."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    try:
        resp = requests.get(url, headers=_get_headers(), timeout=10)
        if resp.status_code == 200:
            return resp.json(), None
        elif resp.status_code == 404:
            return None, "Repository not found or does not exist (404)"
        elif resp.status_code in (401, 403):
            return None, "Repository is private or GitHub API rate limit was reached (403)"
        else:
            return None, f"GitHub API error ({resp.status_code})"
    except requests.RequestException as e:
        return None, f"Network error connecting to GitHub: {str(e)}"


def fetch_readme(owner: str, repo: str) -> str:
    """Fetch and decode the repo's README. Returns empty string if missing."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/readme"
    try:
        resp = requests.get(url, headers=_get_headers(), timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            content_encoded = data.get("content", "")
            encoding = data.get("encoding", "base64")
            if encoding == "base64" and content_encoded:
                return base64.b64decode(content_encoded).decode("utf-8", errors="ignore")
            elif "download_url" in data:
                raw_resp = requests.get(data["download_url"], timeout=10)
                if raw_resp.status_code == 200:
                    return raw_resp.text
    except Exception:
        pass
    return ""


def fetch_file_tree(owner: str, repo: str, default_branch: str = "main") -> list[dict[str, Any]]:
    """Fetch the full recursive Git tree for the default branch."""
    branches_to_try = [default_branch]
    if default_branch != "main":
        branches_to_try.append("main")
    if default_branch != "master":
        branches_to_try.append("master")

    for branch in branches_to_try:
        url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
        try:
            resp = requests.get(url, headers=_get_headers(), timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("tree", [])
        except Exception:
            continue
    return []


def fetch_raw_file_content(owner: str, repo: str, path: str, branch: str = "main") -> Optional[str]:
    """Fetch raw content of a specific file."""
    # Try GitHub contents API first
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    try:
        resp = requests.get(url, headers=_get_headers(), timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, dict) and "content" in data and data.get("encoding") == "base64":
                return base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
    except Exception:
        pass

    # Fallback to raw.githubusercontent.com
    raw_url = f"{RAW_GITHUB_BASE}/{owner}/{repo}/{branch}/{path}"
    try:
        resp = requests.get(raw_url, headers=_get_headers(), timeout=10)
        if resp.status_code == 200:
            return resp.text
    except Exception:
        pass

    return None


def fetch_repository_bundle(github_url: str) -> RepoBundle:
    """
    High-level orchestrator: pulls metadata, README, file tree, and dependency manifests.
    Guaranteed not to raise an unhandled exception.
    """
    parsed = parse_owner_repo(github_url)
    if not parsed:
        return RepoBundle(
            success=False,
            failure_reason=f"Invalid GitHub repository URL: '{github_url}'",
        )

    owner, repo = parsed
    metadata, failure_reason = fetch_repo_metadata(owner, repo)
    if not metadata:
        return RepoBundle(
            success=False,
            failure_reason=failure_reason,
            owner=owner,
            repo=repo,
        )

    default_branch = metadata.get("default_branch", "main")
    readme_text = fetch_readme(owner, repo)
    raw_tree = fetch_file_tree(owner, repo, default_branch)

    file_paths = [
        item["path"]
        for item in raw_tree
        if item.get("type") == "blob" and "path" in item
    ]

    # Fetch dependency manifests found in the tree
    manifest_contents: dict[str, str] = {}
    for path in file_paths:
        filename = path.split("/")[-1]
        if filename in MANIFEST_FILENAMES:
            content = fetch_raw_file_content(owner, repo, path, default_branch)
            if content:
                manifest_contents[path] = content

    return RepoBundle(
        success=True,
        owner=owner,
        repo=repo,
        default_branch=default_branch,
        readme_text=readme_text,
        file_tree=raw_tree,
        file_paths=file_paths,
        manifest_contents=manifest_contents,
    )
