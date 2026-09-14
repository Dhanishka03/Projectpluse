"""
test_module3.py — Test suite for Module 3: GitHub Client.
"""

from services.github_client import (
    parse_owner_repo,
    clean_github_url,
    fetch_repository_bundle,
    fetch_readme,
    fetch_file_tree,
    fetch_raw_file_content,
)


def test_url_parsing():
    assert parse_owner_repo("https://github.com/psf/requests") == ("psf", "requests")
    assert parse_owner_repo("https://github.com/psf/requests.git") == ("psf", "requests")
    assert parse_owner_repo("http://github.com/fastapi/fastapi/tree/master") == ("fastapi", "fastapi")
    assert parse_owner_repo("invalid-url") is None
    print("[OK] parse_owner_repo tests passed")


def test_public_repo_bundle():
    # Test on public real repository: octocat/Hello-World or psf/requests or tiangolo/fastapi
    bundle = fetch_repository_bundle("https://github.com/octocat/Hello-World")
    print("Bundle success:", bundle.success, "Reason:", bundle.failure_reason)
    assert bundle.success is True
    assert bundle.owner.lower() == "octocat"
    assert bundle.repo.lower() == "hello-world"
    assert len(bundle.readme_text) > 0
    print("[OK] Public repo fetch verified. README snippet:", repr(bundle.readme_text[:50]))


def test_nonexistent_repo():
    bundle = fetch_repository_bundle("https://github.com/this-user-definitely-does-not-exist/non-existent-repo-99999")
    assert bundle.success is False
    assert bundle.failure_reason is not None
    print("[OK] Non-existent repo handled gracefully with reason:", bundle.failure_reason)


if __name__ == "__main__":
    test_url_parsing()
    test_nonexistent_repo()
    test_public_repo_bundle()
    print("\n--- ALL MODULE 3 TESTS PASSED ---")
