"""
test_module4.py — Test suite for Module 4: Claim Extraction and LLM Client.
"""

from services.llm_client import extract_claims, judge_claim

SHORT_README = """
# QuickTool
A 2-line utility.
"""

FEATURE_README = """
# TaskMaster AI

Automate your repetitive workflow with AI.

## Key Features
- Gmail OAuth Integration and inbox synchronization
- Automatic Calendar scheduling with Google Calendar API
- Speech to text task creation with Whisper AI
- Real-time collaborative dashboard using WebSockets
- SQLite database persistence with SQLAlchemy ORM
"""

LONG_README = """
# Enterprise Data Lakehouse Engine

## Overview
A high performance system designed for distributed data warehousing.

""" + "\n".join([f"### Section {i}\nDetails regarding component {i} and its submodules." for i in range(50)]) + """

## Capabilities
- Distributed query execution engine
- Parquet and Arrow zero-copy memory formatting
- Columnar compression with Zstandard
"""


def test_claim_extraction():
    # 1. Short README (should not crash, returns [] or minimal)
    claims_short = extract_claims(SHORT_README)
    print("[OK] Short README claims extracted:", claims_short)
    assert isinstance(claims_short, list)

    # 2. Features README
    claims_feat = extract_claims(FEATURE_README)
    print("[OK] Feature README claims extracted:", claims_feat)
    assert isinstance(claims_feat, list)
    assert len(claims_feat) >= 2

    # 3. Long README
    claims_long = extract_claims(LONG_README)
    print("[OK] Long README claims extracted:", len(claims_long), "claims")
    assert isinstance(claims_long, list)


def test_judge_claim():
    # Test ambiguous judgment
    evidence = [
        {"file": "tools/calendar.py", "type": "code", "description": "Google Calendar API usage", "found": True},
        {"file": "requirements.txt", "type": "dependency", "description": "google-api-python-client", "found": True},
    ]
    status, finding = judge_claim("Calendar integration", evidence)
    print("[OK] judge_claim output:", status, "| Finding:", finding)
    assert status in ("verified", "partially_verified", "not_found")
    assert len(finding) > 0


if __name__ == "__main__":
    test_claim_extraction()
    test_judge_claim()
    print("\n--- ALL MODULE 4 TESTS PASSED ---")
