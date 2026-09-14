"""
embeddings.py — Vector embedding and relevance scoring service.

Loads sentence-transformers' `all-MiniLM-L6-v2` once as a singleton.
Provides:
  - embed(text: str) -> np.ndarray
  - cosine_similarity(a, b) -> float (0.0 to 1.0)
  - compute_relevance_score(...) -> int (0 to 100)
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
) -> int:
    """
    Computes a 0–100 integer relevance score comparing a submission (README + claims)
    against a problem statement.
    """
    if saved_problem_embedding:
        prob_vec = deserialize_embedding(saved_problem_embedding)
    else:
        prob_text = f"{problem_title}. {problem_description}"
        prob_vec = embed(prob_text)

    if prob_vec is None:
        return 50

    # Build submission summary: first 1000 chars of README + claims
    claims_text = ". ".join(claims[:6])
    sub_summary = f"{readme_text[:1200]}. {claims_text}"
    sub_vec = embed(sub_summary)

    sim = cosine_similarity(prob_vec, sub_vec)
    # Scale from cosine similarity (typically ~0.2 to 0.8) to realistic 0-100 range
    score = int(round(sim * 100))
    return max(0, min(100, score))
