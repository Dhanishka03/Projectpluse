"""
test_module5.py — Test suite for Module 5: Embeddings + Relevance Score.
"""

from services.embeddings import (
    embed,
    cosine_similarity,
    compute_relevance_score,
    serialize_embedding,
    deserialize_embedding,
)


def test_embeddings_and_serialization():
    text1 = "Automating repetitive tasks with background AI workers"
    text2 = "Streamlining dev workflows and code refactoring"
    text_unrelated = "Cooking Italian pasta recipes with tomato sauce"

    vec1 = embed(text1)
    vec2 = embed(text2)
    vec_unrelated = embed(text_unrelated)

    assert len(vec1) > 0
    assert len(vec2) > 0

    # Serialization test
    blob = serialize_embedding(vec1)
    restored = deserialize_embedding(blob)
    assert restored is not None
    assert len(restored) == len(vec1)
    print("[OK] Embedding serialization verified")

    # Similarity test
    sim_related = cosine_similarity(vec1, vec2)
    sim_unrelated = cosine_similarity(vec1, vec_unrelated)
    print(f"[OK] Similarity related: {sim_related:.3f}, unrelated: {sim_unrelated:.3f}")
    assert sim_related >= sim_unrelated


def test_relevance_score():
    score_high = compute_relevance_score(
        problem_title="Automating Repetitive Tasks",
        problem_description="Build tools that automate meeting scheduling and email triage.",
        readme_text="This project connects to Gmail and Google Calendar to automatically triage inbox and schedule meetings.",
        claims=["Gmail integration", "Automatic scheduling"],
    )

    score_low = compute_relevance_score(
        problem_title="Automating Repetitive Tasks",
        problem_description="Build tools that automate meeting scheduling and email triage.",
        readme_text="A 3D OpenGL game engine built in C++.",
        claims=["3D rendering pipeline", "Shader compilation"],
    )

    print(f"[OK] Relevance score high-match: {score_high}/100, low-match: {score_low}/100")
    assert 0 <= score_high <= 100
    assert 0 <= score_low <= 100
    assert score_high >= score_low


if __name__ == "__main__":
    test_embeddings_and_serialization()
    test_relevance_score()
    print("\n--- ALL MODULE 5 TESTS PASSED ---")
