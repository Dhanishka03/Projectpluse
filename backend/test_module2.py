"""
test_module2.py — Test suite for Module 2: Hackathon CRUD + CSV Validation.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SAMPLE_CSV = """id, teamname, problem statement, github link
1, Team Alpha, Automating Repetitive Tasks, https://github.com/team-alpha/task-manager
2, Team Nova, Automating Repetitive Tasks, https://github.com/team-nova/inbox-triage
3, Team Broken, Accessible Public Data, invalid-link
4, Team Empty, Accessible Public Data,
5, Team Trailing, Developer Productivity, https://github.com/team-trailing/repo.git/
"""


def test_csv_validation_endpoint():
    res = client.post("/hackathons/validate", json={"csv_data": SAMPLE_CSV})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["rowsParsed"] == 5
    assert data["validUrls"] == 3
    assert len(data["skipped"]) == 2
    assert data["skipped"][0]["row"] == 4
    assert data["skipped"][1]["row"] == 5

    print("[OK] /hackathons/validate returned expected counts and skipped rows:", data)


def test_hackathon_creation_and_retrieval():
    payload = {
        "name": "Autumn Build Sprint 2026",
        "submissionStart": "2026-09-14T09:00:00Z",
        "submissionEnd": "2026-09-16T18:00:00Z",
        "problemStatements": [
            {"title": "Automating Repetitive Tasks", "description": "Build tools that eliminate drudgery."},
            {"title": "Developer Productivity", "description": "Streamline dev workflows."}
        ],
        "csvData": SAMPLE_CSV,
    }

    # 1. Create hackathon
    create_res = client.post("/hackathons", json=payload)
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    hackathon_id = created["id"]
    assert created["name"] == "Autumn Build Sprint 2026"
    assert created["status"] == "draft"
    assert len(created["problemStatements"]) == 2
    assert "stats" in created
    assert created["stats"]["totalSubmissions"] == 3
    print("[OK] Created hackathon with id:", hackathon_id)

    # 2. List hackathons
    list_res = client.get("/hackathons")
    assert list_res.status_code == 200
    all_hackathons = list_res.json()
    assert any(h["id"] == hackathon_id for h in all_hackathons)
    print(f"[OK] List hackathons returned {len(all_hackathons)} items")

    # 3. Get single hackathon
    get_res = client.get(f"/hackathons/{hackathon_id}")
    assert get_res.status_code == 200
    single = get_res.json()
    assert single["id"] == hackathon_id
    assert single["stats"]["totalSubmissions"] == 3
    print("[OK] Get single hackathon verified:", single["name"])

    # 4. Dry-run validate on existing hackathon
    val_res = client.post(f"/hackathons/{hackathon_id}/validate", json={"csv_data": SAMPLE_CSV})
    assert val_res.status_code == 200
    assert val_res.json()["validUrls"] == 3
    print("[OK] Hackathon-specific validate verified")


if __name__ == "__main__":
    test_csv_validation_endpoint()
    test_hackathon_creation_and_retrieval()
    print("\n--- ALL MODULE 2 TESTS PASSED ---")
