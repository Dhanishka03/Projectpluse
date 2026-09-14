"""
test_modules6_7.py — Test suite for Module 6 (Evidence Search) and Module 7 (Verification Logic).
"""

from services.github_client import RepoBundle
from services.evidence_search import search_evidence_for_claim, extract_keywords_from_claim
from services.verification import verify_claim


def test_keyword_extraction():
    kws = extract_keywords_from_claim("Automatic Calendar scheduling with Google Calendar API")
    print("[OK] Keywords extracted:", kws)
    assert "calendar" in kws
    assert "scheduling" in kws


def test_evidence_and_verification_rules():
    # Construct mock RepoBundle
    bundle = RepoBundle(
        success=True,
        owner="team-alpha",
        repo="task-manager",
        default_branch="main",
        file_paths=["src/index.ts", "src/tools/calendar.py", "requirements.txt"],
        manifest_contents={
            "requirements.txt": "google-api-python-client==2.100.0\nfastapi==0.111.0\n",
        },
        cached_files={
            "src/tools/calendar.py": "from googleapiclient.discovery import build\n# Calendar API client usage\nservice = build('calendar', 'v3')",
        },
    )

    # 1. Test clear VERIFIED case (code + dependency match)
    evidence_cal = search_evidence_for_claim(bundle, "Calendar API Integration")
    print("[OK] Calendar evidence found:", evidence_cal)
    res_cal = verify_claim("Calendar API Integration", evidence_cal)
    print("[OK] Calendar verification result:", res_cal.status, "| Finding:", res_cal.finding)
    assert res_cal.status == "verified"
    assert res_cal.issue is None

    # 2. Test clear NOT_FOUND case (zero matching evidence)
    evidence_voice = search_evidence_for_claim(bundle, "Voice interaction and transcription")
    print("[OK] Voice evidence found:", evidence_voice)
    res_voice = verify_claim("Voice interaction and transcription", evidence_voice)
    print("[OK] Voice verification result:", res_voice.status, "| Finding:", res_voice.finding)
    assert res_voice.status == "not_found"
    assert res_voice.issue is not None
    assert res_voice.issue["type"] == "not_verified"


if __name__ == "__main__":
    test_keyword_extraction()
    test_evidence_and_verification_rules()
    print("\n--- ALL MODULES 6 & 7 TESTS PASSED ---")
