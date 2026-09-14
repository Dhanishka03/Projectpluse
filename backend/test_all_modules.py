"""
test_all_modules.py — Comprehensive verification of Modules 2–9.

Tests:
  Module 2: Hackathon CRUD + CSV Validation
  Module 3: GitHub Client (url parsing + real repo if online)
  Module 4: LLM Client (claim extraction with heuristic fallback)
  Module 5: Embeddings + Relevance Score
  Module 6: Evidence Search
  Module 7: Verification Logic
  Module 8: Pipeline Orchestration + Progress
  Module 9: Submissions List + Detail Endpoints
"""

import json
import sys

# Ensure DB tables exist before any test runs
import models  # noqa: F401 — registers ORM classes on Base
from database import Base, engine
Base.metadata.create_all(bind=engine)



# ── Module 2: Hackathon CRUD + CSV ────────────────────────────────────────

def test_module2():
    print("=" * 60)
    print("MODULE 2 — Hackathon CRUD + CSV Validation")
    print("=" * 60)

    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)

    # 2a: CSV validation
    csv = "id, teamname, problem statement, github link\n1, Alpha, AI Tools, https://github.com/octocat/Hello-World\n2, Broken, AI Tools, bad-url\n3, Empty, AI Tools,"
    res = client.post("/hackathons/validate", json={"csvData": csv})
    assert res.status_code == 200, f"Validate failed: {res.text}"
    data = res.json()
    assert data["rowsParsed"] == 3
    assert data["validUrls"] == 1
    assert len(data["skipped"]) == 2
    print(f"  [OK] /validate: {data['rowsParsed']} parsed, {data['validUrls']} valid, {len(data['skipped'])} skipped")

    # 2b: Create hackathon
    payload = {
        "name": "Test Sprint",
        "submissionStart": "2026-09-14T00:00:00Z",
        "submissionEnd": "2026-09-16T23:59:59Z",
        "problemStatements": [
            {"title": "AI Automation", "description": "Build AI tools for automation."},
        ],
        "csvData": "id, teamname, problem statement, github link\n1, Alpha, AI Automation, https://github.com/octocat/Hello-World\n2, Ghost, AI Automation, https://github.com/nonexistent999/norepo999",
    }
    res = client.post("/hackathons", json=payload)
    assert res.status_code == 201, f"Create failed: {res.text}"
    h = res.json()
    hid = h["id"]
    assert h["status"] == "draft"
    assert h["stats"]["totalSubmissions"] == 2
    assert len(h["problemStatements"]) == 1
    # Check camelCase field names
    assert "submissionStart" in h
    assert "submissionEnd" in h
    assert "problemStatements" in h
    print(f"  [OK] POST /hackathons: id={hid}, subs={h['stats']['totalSubmissions']}")

    # 2c: List hackathons
    res = client.get("/hackathons")
    assert res.status_code == 200
    hacks = res.json()
    assert any(x["id"] == hid for x in hacks)
    print(f"  [OK] GET /hackathons: {len(hacks)} items")

    # 2d: Get single hackathon
    res = client.get(f"/hackathons/{hid}")
    assert res.status_code == 200
    assert res.json()["id"] == hid
    print(f"  [OK] GET /hackathons/{{id}}: matched")

    # 2e: 404
    res = client.get("/hackathons/nonexistent")
    assert res.status_code == 404
    print(f"  [OK] GET /hackathons/nonexistent: 404")

    return hid, client


# ── Module 3: GitHub Client ───────────────────────────────────────────────

def test_module3():
    print("\n" + "=" * 60)
    print("MODULE 3 — GitHub Client")
    print("=" * 60)

    from services.github_client import parse_owner_repo, clean_github_url, fetch_repository_bundle

    # URL parsing
    assert parse_owner_repo("https://github.com/psf/requests") == ("psf", "requests")
    assert parse_owner_repo("https://github.com/user/repo.git") == ("user", "repo")
    assert parse_owner_repo("bad-url") is None
    assert clean_github_url("https://github.com/user/repo/tree/main") == "https://github.com/user/repo"
    print("  [OK] URL parsing verified")

    # Real repo fetch (may fail offline)
    bundle = fetch_repository_bundle("https://github.com/octocat/Hello-World")
    if bundle.success:
        assert len(bundle.readme_text) > 0
        print(f"  [OK] Real repo fetch: README={len(bundle.readme_text)} chars, files={len(bundle.file_paths)}")
    else:
        print(f"  [WARN] Real repo fetch failed (offline?): {bundle.failure_reason}")

    # Non-existent repo
    bad = fetch_repository_bundle("https://github.com/nonexistent999/norepo999")
    assert bad.success is False
    print(f"  [OK] Non-existent repo handled: {bad.failure_reason[:60]}...")


# ── Module 4: LLM Client ──────────────────────────────────────────────────

def test_module4():
    print("\n" + "=" * 60)
    print("MODULE 4 — LLM Client (Claim Extraction)")
    print("=" * 60)

    from services.llm_client import extract_claims, judge_claim

    # Short README
    claims_short = extract_claims("# QuickTool\nA 2-line utility.")
    assert isinstance(claims_short, list)
    print(f"  [OK] Short README: {len(claims_short)} claims")

    # Feature-rich README
    readme = """# TaskMaster AI
## Key Features
- Gmail OAuth Integration and inbox synchronization
- Automatic Calendar scheduling with Google Calendar API
- SQLite database persistence with SQLAlchemy ORM
- Real-time dashboard using WebSockets
"""
    claims = extract_claims(readme)
    assert isinstance(claims, list)
    assert len(claims) >= 2
    print(f"  [OK] Feature README: {len(claims)} claims: {claims[:3]}")

    # Empty README
    assert extract_claims("") == []
    print("  [OK] Empty README returns []")

    # Judge claim
    status, finding = judge_claim("Calendar integration", [
        {"file": "cal.py", "type": "code", "description": "Calendar API", "found": True},
    ])
    assert status in ("verified", "partially_verified", "not_found")
    print(f"  [OK] judge_claim: {status}")


# ── Module 5: Embeddings ──────────────────────────────────────────────────

def test_module5():
    print("\n" + "=" * 60)
    print("MODULE 5 — Embeddings + Relevance Score")
    print("=" * 60)

    from services.embeddings import embed, cosine_similarity, compute_relevance_score, serialize_embedding, deserialize_embedding

    v1 = embed("Automating repetitive tasks with AI")
    v2 = embed("Cooking pasta recipes")
    assert len(v1) > 0
    sim = cosine_similarity(v1, v2)
    print(f"  [OK] Embedding dim={len(v1)}, unrelated_sim={sim:.3f}")

    blob = serialize_embedding(v1)
    restored = deserialize_embedding(blob)
    assert restored is not None
    print(f"  [OK] Serialization round-trip OK ({len(blob)} bytes)")

    score_high = compute_relevance_score("AI Automation", "Build AI tools", "This project uses OpenAI to automate tasks", ["OpenAI integration", "Task automation"])
    score_low = compute_relevance_score("AI Automation", "Build AI tools", "A 3D game engine in C++", ["3D rendering"])
    print(f"  [OK] Relevance: high={score_high}, low={score_low}")
    assert score_high >= score_low


# ── Modules 6+7: Evidence Search + Verification ───────────────────────────

def test_modules6_7():
    print("\n" + "=" * 60)
    print("MODULES 6+7 — Evidence Search + Verification")
    print("=" * 60)

    from services.github_client import RepoBundle
    from services.evidence_search import search_evidence_for_claim, extract_keywords_from_claim
    from services.verification import verify_claim

    kws = extract_keywords_from_claim("Gmail OAuth Integration")
    assert "gmail" in kws
    assert "oauth" in kws
    print(f"  [OK] Keywords: {kws}")

    bundle = RepoBundle(
        success=True, owner="test", repo="test", default_branch="main",
        file_paths=["src/mail.py", "src/auth.py", "requirements.txt"],
        manifest_contents={"requirements.txt": "google-api-python-client==2.0\ngoogle-auth==2.0\nfastapi==0.111.0\n"},
        cached_files={"src/mail.py": "from googleapiclient.discovery import build\nservice = build('gmail', 'v1')\n"},
    )

    # Clear VERIFIED case (code + dependency)
    ev = search_evidence_for_claim(bundle, "Gmail API Integration")
    res = verify_claim("Gmail API Integration", ev)
    assert res.status == "verified"
    assert res.issue is None
    print(f"  [OK] VERIFIED shortcut: {res.status} (no LLM call)")

    # Clear NOT_FOUND case
    ev2 = search_evidence_for_claim(bundle, "Blockchain smart contracts")
    res2 = verify_claim("Blockchain smart contracts", ev2)
    assert res2.status == "not_found"
    assert res2.issue is not None
    assert res2.issue["type"] == "not_verified"
    print(f"  [OK] NOT_FOUND shortcut: {res2.status}, issue type={res2.issue['type']}")


# ── Module 8: Pipeline + Progress ─────────────────────────────────────────

def test_module8(hid, client):
    print("\n" + "=" * 60)
    print("MODULE 8 — Pipeline Orchestration + Progress")
    print("=" * 60)

    # Check progress before analysis
    res = client.get(f"/hackathons/{hid}/progress")
    assert res.status_code == 200
    prog = res.json()
    assert prog["total"] == 2
    print(f"  [OK] Pre-analysis progress: {prog['completed']}/{prog['total']}")

    # Trigger analysis
    res = client.post(f"/hackathons/{hid}/analyze")
    assert res.status_code == 200, f"Analyze failed: {res.text}"
    h = res.json()
    assert h["status"] == "complete"
    print(f"  [OK] Pipeline completed: status={h['status']}, stats={h['stats']}")

    # Check progress after
    res = client.get(f"/hackathons/{hid}/progress")
    prog2 = res.json()
    assert prog2["completed"] == prog2["total"]
    print(f"  [OK] Post-analysis progress: {prog2['completed']}/{prog2['total']}")

    return h


# ── Module 9: Submissions List + Detail ────────────────────────────────────

def test_module9(hid, client):
    print("\n" + "=" * 60)
    print("MODULE 9 — Submissions List + Detail")
    print("=" * 60)

    # List submissions
    res = client.get(f"/hackathons/{hid}/submissions")
    assert res.status_code == 200
    subs = res.json()
    assert len(subs) == 2
    print(f"  [OK] GET /submissions: {len(subs)} submissions")

    # Verify camelCase field names in response
    s = subs[0]
    for field in ["id", "teamName", "projectName", "githubUrl", "relevanceScore",
                   "claimsVerifiedCount", "claimsTotalCount", "issuesCount", "status", "claims", "issues"]:
        assert field in s, f"Missing field '{field}' in submission response"
    print(f"  [OK] camelCase fields verified in submission response")

    # Check each submission
    for s in subs:
        status_icon = "[PASS]" if s["status"] == "verified" else "[WARN]" if s["status"] == "review" else "[FAIL]"
        print(f"  {status_icon} Team '{s['teamName']}': status={s['status']}, "
              f"relevance={s['relevanceScore']}, claims={s['claimsVerifiedCount']}/{s['claimsTotalCount']}, "
              f"issues={s['issuesCount']}")
        if s.get("failureReason"):
            print(f"    Failure: {s['failureReason'][:80]}...")

    # Detail endpoint
    sub_id = subs[0]["id"]
    res = client.get(f"/hackathons/{hid}/submissions/{sub_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == sub_id
    assert isinstance(detail["claims"], list)
    assert isinstance(detail["issues"], list)
    print(f"  [OK] GET /submissions/{{id}}: {len(detail['claims'])} claims, {len(detail['issues'])} issues")

    # Verify nested claim structure
    if detail["claims"]:
        c = detail["claims"][0]
        for field in ["id", "text", "status", "finding", "evidence"]:
            assert field in c, f"Missing field '{field}' in claim response"
        if c["evidence"]:
            e = c["evidence"][0]
            for field in ["file", "type", "description", "found"]:
                assert field in e, f"Missing field '{field}' in evidence response"
        print(f"  [OK] Nested claim+evidence shapes verified")

    # Verify issue structure
    if detail["issues"]:
        iss = detail["issues"][0]
        for field in ["id", "claimId", "type", "title", "description"]:
            assert field in iss, f"Missing field '{field}' in issue response"
        print(f"  [OK] Issue shape verified: type={iss['type']}")

    # 404 for nonexistent submission
    res = client.get(f"/hackathons/{hid}/submissions/nonexistent")
    assert res.status_code == 404
    print(f"  [OK] GET nonexistent submission: 404")


# ── Run all ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        hid, client = test_module2()
        test_module3()
        test_module4()
        test_module5()
        test_modules6_7()
        test_module8(hid, client)
        test_module9(hid, client)

        print("\n" + "=" * 60)
        print("[PASS] ALL MODULES 2-9 VERIFIED SUCCESSFULLY")
        print("=" * 60)
    except Exception as e:
        print(f"\n[FAIL] FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

