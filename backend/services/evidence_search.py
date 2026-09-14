"""
evidence_search.py — Multi-layer code and dependency evidence search.

Searches:
  1. File and directory names in the repository tree for matching keywords.
  2. Dependency manifest contents (requirements.txt, package.json, etc.) for related packages.
  3. File contents (grep-style, case-insensitive) for keyword occurrences and line numbers.

Returns a list of candidate evidence dicts matching the Evidence shape:
  {
    "file": "tools/calendar.py",
    "line": 42,
    "type": "code" | "dependency",
    "description": "...",
    "found": True | False
  }
"""

import re
from typing import Any, Optional
from services.github_client import RepoBundle, fetch_raw_file_content

COMMON_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with",
    "by", "from", "up", "about", "into", "over", "after", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did", "using",
    "built", "build", "support", "supports", "system", "feature", "features",
    "tool", "tools", "utility", "based", "real-time", "realtime", "automated",
    "automatic", "integration", "integrations", "app", "application", "service",
}

TECH_KNOWLEDGE_BASE = {
    "calendar": {
        "keywords": ["calendar", "schedule", "event", "gcal", "meeting"],
        "packages": ["google-api-python-client", "googleapis", "@google-cloud/calendar", "icalendar", "fullcalendar", "google-api"],
    },
    "gmail": {
        "keywords": ["gmail", "email", "inbox", "mail", "smtp", "imap", "mailbox"],
        "packages": ["google-api-python-client", "googleapis", "@google-cloud/gmail", "nodemailer", "resend", "sendgrid"],
    },
    "oauth": {
        "keywords": ["oauth", "authorize", "token", "google-auth", "client_id"],
        "packages": ["google-auth", "auth0", "next-auth", "passport", "fastapi-users"],
    },
    "auth": {
        "keywords": ["auth", "login", "jwt", "session", "password", "bearer"],
        "packages": ["jsonwebtoken", "pyjwt", "bcrypt", "passport", "next-auth", "fastapi-users", "python-jose"],
    },
    "database": {
        "keywords": ["database", "sqlite", "postgres", "mysql", "mongodb", "db", "query", "orm"],
        "packages": ["sqlalchemy", "prisma", "mongoose", "psycopg2", "pg", "sqlite3", "typeorm", "alembic"],
    },
    "ai": {
        "keywords": ["openai", "gemini", "llm", "gpt", "whisper", "claude", "prompt", "model"],
        "packages": ["openai", "google-generativeai", "@google/genai", "anthropic", "langchain", "transformers", "whisper"],
    },
    "whisper": {
        "keywords": ["whisper", "transcribe", "speech", "audio", "voice"],
        "packages": ["whisper", "openai-whisper", "speechrecognition", "deepgram"],
    },
    "websocket": {
        "keywords": ["websocket", "socket", "socketio", "ws", "broadcast"],
        "packages": ["socket.io", "socket.io-client", "websockets", "pusher", "fastapi-websocket"],
    },
    "pdf": {
        "keywords": ["pdf", "report", "document", "export"],
        "packages": ["pdfkit", "pypdf", "reportlab", "pdfmake", "jspdf"],
    },
}


def extract_keywords_from_claim(claim: str) -> list[str]:
    """Extracts search keywords from a claim string."""
    tokens = re.findall(r"[A-Za-z0-9_\-\+]+", claim)
    keywords = [t.lower() for t in tokens if t.lower() not in COMMON_STOPWORDS and len(t) > 1]
    return list(dict.fromkeys(keywords))  # unique preserving order


def search_manifest_dependencies(
    manifests: dict[str, str],
    keywords: list[str],
) -> list[dict[str, Any]]:
    """Searches dependency manifests for matching packages."""
    evidence_list: list[dict[str, Any]] = []

    # Check for tech knowledge base package matches
    known_packages_to_look_for: set[str] = set()
    for kw in keywords:
        for tech, data in TECH_KNOWLEDGE_BASE.items():
            if kw in tech or any(kw in k for k in data["keywords"]):
                for pkg in data["packages"]:
                    known_packages_to_look_for.add(pkg.lower())

    for filepath, content in manifests.items():
        lines = content.splitlines()
        for line_num, line in enumerate(lines, start=1):
            line_lower = line.lower()

            # Match known packages
            for pkg in known_packages_to_look_for:
                if pkg in line_lower:
                    evidence_list.append({
                        "file": filepath,
                        "line": line_num,
                        "type": "dependency",
                        "description": f"Dependency '{pkg}' declared in manifest",
                        "found": True,
                        "source": "dependency",
                    })

            # Match generic keywords in manifest lines
            for kw in keywords:
                if len(kw) >= 3 and kw in line_lower and not any(pkg in line_lower for pkg in known_packages_to_look_for):
                    evidence_list.append({
                        "file": filepath,
                        "line": line_num,
                        "type": "dependency",
                        "description": f"Package reference matching '{kw}' in {filepath}",
                        "found": True,
                        "source": "dependency",
                    })

    # Deduplicate by (file, line)
    seen = set()
    deduped = []
    for e in evidence_list:
        key = (e["file"], e.get("line"))
        if key not in seen:
            seen.add(key)
            deduped.append(e)
    return deduped


def search_filename_matches(
    file_paths: list[str],
    keywords: list[str],
) -> list[dict[str, Any]]:
    """Searches for file paths whose names or parent dirs contain keywords."""
    evidence_list: list[dict[str, Any]] = []
    for path in file_paths:
        path_lower = path.lower()
        matched_kw = [kw for kw in keywords if len(kw) >= 3 and kw in path_lower]
        if matched_kw:
            evidence_list.append({
                "file": path,
                "line": None,
                "type": "code",
                "description": f"File path contains relevant keyword(s): {', '.join(matched_kw)}",
                "found": True,
                "source": "filename",
            })
    return evidence_list[:5]


def search_file_contents_for_claim(
    bundle: RepoBundle,
    candidate_files: list[str],
    keywords: list[str],
) -> list[dict[str, Any]]:
    """Searches raw contents of candidate files for keyword usage."""
    evidence_list: list[dict[str, Any]] = []

    for file_path in candidate_files[:6]:
        # Fetch file content if not already cached
        content = bundle.cached_files.get(file_path)
        if not content:
            content = fetch_raw_file_content(bundle.owner, bundle.repo, file_path, bundle.default_branch)
            if content:
                bundle.cached_files[file_path] = content

        if not content:
            continue

        lines = content.splitlines()
        for line_idx, line in enumerate(lines, start=1):
            line_lower = line.lower()
            for kw in keywords:
                if len(kw) >= 3 and kw in line_lower and not line.strip().startswith("//") and not line.strip().startswith("#"):
                    snippet = line.strip()[:80]
                    evidence_list.append({
                        "file": file_path,
                        "line": line_idx,
                        "type": "code",
                        "description": f"Usage match for '{kw}': {snippet}",
                        "found": True,
                        "source": "keyword",
                    })
                    break  # one match per line is sufficient
            if len(evidence_list) >= 4:
                break

    return evidence_list


def search_evidence_for_claim(
    bundle: RepoBundle,
    claim: str,
) -> list[dict[str, Any]]:
    """
    Orchestrates evidence search for a given claim across repo tree,
    manifests, and code files.
    """
    keywords = extract_keywords_from_claim(claim)
    if not keywords:
        return [{
            "file": "codebase",
            "line": None,
            "type": "code",
            "description": f"No specific technical keywords could be extracted from '{claim}'",
            "found": False,
        }]

    # 1. Search dependencies
    dep_evidence = search_manifest_dependencies(bundle.manifest_contents, keywords)

    # 2. Search file tree
    filename_evidence = search_filename_matches(bundle.file_paths, keywords)

    # 3. Deep search candidate code files
    candidate_files = [e["file"] for e in filename_evidence]
    # If no filename matched, pick relevant source files (e.g. .py, .ts, .js, .go, .rs files)
    if not candidate_files:
        src_files = [
            p for p in bundle.file_paths
            if any(p.endswith(ext) for ext in [".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java"])
            and not any(ignored in p.lower() for ignored in ["test", "dist", "build", "node_modules", "vendor"])
        ]
        candidate_files = src_files[:5]

    code_evidence = search_file_contents_for_claim(bundle, candidate_files, keywords)

    # Combine found evidence
    found_evidence: list[dict[str, Any]] = []
    # Prioritize line-specific code evidence first, then dependency evidence, then filename evidence
    found_evidence.extend(code_evidence)
    found_evidence.extend(dep_evidence)
    if not code_evidence:
        found_evidence.extend(filename_evidence)

    if not found_evidence:
        return [{
            "file": "codebase",
            "line": None,
            "type": "code",
            "description": f"No implementation code or dependencies detected for '{claim}'",
            "found": False,
        }]

    return found_evidence
