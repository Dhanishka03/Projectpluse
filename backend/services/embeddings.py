"""
embeddings.py — Vector embedding and relevance scoring service.

Loads sentence-transformers' `all-MiniLM-L6-v2` once as a singleton.
Provides:
  - embed(text: str) -> np.ndarray
  - cosine_similarity(a, b) -> float (0.0 to 1.0)
  - compute_relevance_score(...) -> int (0 to 100)
      Formula: 60% weighted requirement coverage + 40% semantic similarity.
      This creates meaningful score separation between high/partial/low repos.
  - serialize_embedding / deserialize_embedding for SQLite BLOB storage
"""

import pickle
import re
from typing import Optional
import numpy as np

_MODEL = None
_MODEL_LOADED = False


def _get_model():
    """Loads sentence-transformers model once."""
    global _MODEL, _MODEL_LOADED
    if _MODEL_LOADED:
        return _MODEL
    try:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as e:
        print(f"[WARN] Could not load SentenceTransformer ('{e}'), using fallback embedding.")
        _MODEL = None
    _MODEL_LOADED = True
    return _MODEL


def embed(text: str) -> np.ndarray:
    """Computes a dense vector embedding for the input text."""
    if not text or not text.strip():
        return np.zeros(384, dtype=np.float32)

    model = _get_model()
    if model is not None:
        try:
            vec = model.encode(text.strip()[:1000], convert_to_numpy=True)
            norm = np.linalg.norm(vec)
            return (vec / norm) if norm > 0 else vec
        except Exception:
            pass

    # Fallback pseudo-embedding based on hash buckets for offline testing
    return _fallback_hash_embedding(text)


def _fallback_hash_embedding(text: str, dim: int = 384) -> np.ndarray:
    """Deterministic normalized bag-of-words vector for testing when model is offline."""
    vec = np.zeros(dim, dtype=np.float32)
    words = re.findall(r"\w+", text.lower())
    if not words:
        return vec
    for w in words:
        idx = hash(w) % dim
        vec[idx] += 1.0
    norm = np.linalg.norm(vec)
    return (vec / norm) if norm > 0 else vec


def serialize_embedding(vec: np.ndarray) -> bytes:
    """Serializes a numpy array to bytes for SQLite storage."""
    return pickle.dumps(vec)


def deserialize_embedding(data: bytes | None) -> np.ndarray | None:
    """Deserializes bytes from SQLite back to a numpy array."""
    if not data:
        return None
    try:
        return pickle.loads(data)
    except Exception:
        return None


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """Computes cosine similarity between two 1D numpy vectors."""
    if vec_a is None or vec_b is None:
        return 0.0
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    dot = np.dot(vec_a, vec_b)
    sim = dot / (norm_a * norm_b)
    return float(np.clip(sim, 0.0, 1.0))


def compute_relevance_score(
    problem_title: str,
    problem_description: str,
    readme_text: str,
    claims: list[str],
    saved_problem_embedding: bytes | None = None,
    scored_requirements: list[dict] | None = None,
) -> int:
    """
    Computes a 0–100 integer relevance score.

    Formula (Task A):
      relevance = 0.60 * coverage_score + 0.40 * semantic_score

    coverage_score (0–100):
      Weighted average of per-requirement scores (1.0 = met, 0.5 = partial, 0.0 = missing),
      weighted by each requirement's importance weight.
      Falls back to keyword-overlap ratio when no scored requirements are provided.

    semantic_score (0–100):
      Cosine similarity between the problem-statement embedding and the
      submission README+claims embedding, scaled to 0–100.

    Args:
      scored_requirements: list returned by llm_client.score_requirements_coverage().
        Each item must have keys 'score' (0.0–1.0) and 'weight' (float).
    """
    # ── 1. Semantic similarity (40%) ────────────────────────────────────────
    if saved_problem_embedding:
        prob_vec = deserialize_embedding(saved_problem_embedding)
    else:
        prob_text = f"{problem_title}. {problem_description}"
        prob_vec = embed(prob_text)

    if prob_vec is None:
        semantic_score = 50.0
    else:
        claims_text = ". ".join(claims[:6])
        sub_summary = f"{readme_text[:1200]}. {claims_text}"
        sub_vec = embed(sub_summary)
        sim = cosine_similarity(prob_vec, sub_vec)
        semantic_score = sim * 100.0

    # ── 2. Requirement coverage (60%) ───────────────────────────────────────
    if scored_requirements:
        total_weight = sum(r.get("weight", 1.0) for r in scored_requirements)
        if total_weight > 0:
            weighted_sum = sum(
                r.get("score", 0.0) * r.get("weight", 1.0)
                for r in scored_requirements
            )
            coverage_score = (weighted_sum / total_weight) * 100.0
        else:
            coverage_score = 0.0
    else:
        # Keyword-overlap fallback: count claim keywords appearing in PS description
        ps_lower = f"{problem_title} {problem_description}".lower()
        all_claim_words = re.findall(r"[a-z]{3,}", " ".join(claims).lower())
        stopwords = {"the", "a", "an", "of", "to", "for", "with", "and", "or", "in", "on",
                     "that", "this", "it", "is", "are", "was", "be", "has", "have"}
        meaningful = [w for w in all_claim_words if w not in stopwords]
        if meaningful:
            hits = sum(1 for w in meaningful if w in ps_lower)
            coverage_score = min(100.0, (hits / len(meaningful)) * 200.0)  # *2 to boost signal
        else:
            coverage_score = semantic_score  # pure semantic fallback

    # ── 3. Weighted combination ──────────────────────────────────────────────
    final = 0.60 * coverage_score + 0.40 * semantic_score
    return max(0, min(100, int(round(final))))
