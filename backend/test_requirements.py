# -*- coding: utf-8 -*-
"""
test_requirements.py -- Tests for Task A/B/C/D improvements.

Tests:
  D1. Fixture repos: high > partial > low relevance with >= 15-point gaps.
      Uses heuristic scoring (offline-safe, no LLM required).
  D2. High-relevance fixture verifies >= 70% of its claims.
  D3. Regression: README claim backed by code in a notebook (.ipynb) or
      subfolder is marked verified.
  D4. "Planned/future" sentences are never extracted as claims.
  D5. Requirement decomposition returns sensible structure.
  D6. Requirement coverage scoring maps correctly to met/partial/missing.
  D7. Weighted relevance formula produces separation between three repos.
"""

import sys
import json

# Bootstrap DB
import models  # noqa: F401
from database import Base, engine
Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

PS_TITLE = "AI-based Crop Disease Detection for Farmers"
PS_DESC = (
    "Build an AI system that takes leaf images as input, classifies crop diseases "
    "using a CNN or similar deep learning model, and provides treatment recommendations "
    "to farmers via a mobile or web interface. Support for regional language output is desired."
)

# High-relevance README: covers ALL requirements of the PS
README_HIGH = """
# CropGuard — AI Leaf Disease Detector

## Features
- Convolutional Neural Network (CNN) trained on PlantVillage dataset for leaf disease classification
- Accepts leaf images as input (JPEG/PNG upload)
- FastAPI backend serving predictions
- Flutter mobile app for farmers
- Treatment recommendation engine based on detected disease
- Hindi and Marathi language support
- Confidence score shown per prediction

## Tech Stack
- TensorFlow/Keras CNN model
- OpenCV for image preprocessing
- FastAPI REST API
- Flutter (Android)
- SQLite for logging
"""

# Partial-relevance README: covers about half the requirements
README_PARTIAL = """
# PlantAI

## What it does
Uses a pre-trained ResNet model to identify plant diseases from images.
Web interface built with Flask.
English only.

## Limitations
No farmer-specific recommendations yet.
Mobile support coming soon.
"""

# Low-relevance README: a completely different domain
README_LOW = """
# StockPredictor

## Overview
Predicts stock prices using LSTM neural networks.
Uses historical OHLCV data from Yahoo Finance.
Generates buy/sell signals.
Python + Pandas + scikit-learn.
"""

HIGH_CLAIMS = [
    "CNN model classifies leaf diseases from images",
    "FastAPI backend serves predictions",
    "Flutter mobile app for farmers",
    "Hindi and Marathi language support",
    "Treatment recommendation engine",
]

PARTIAL_CLAIMS = [
    "ResNet model identifies plant diseases",
    "Flask web interface",
]

LOW_CLAIMS = [
    "LSTM predicts stock prices",
    "Yahoo Finance OHLCV data input",
    "Buy/sell signal generation",
]

HIGH_FILES = [
    "model/cnn_disease_classifier.py",
    "notebooks/training.ipynb",
    "api/main.py",
    "mobile/lib/main.dart",
    "api/requirements.txt",
]

PARTIAL_FILES = [
    "app.py",
    "model.py",
    "requirements.txt",
]

LOW_FILES = [
    "lstm_model.py",
    "data_loader.py",
    "requirements.txt",
]

HIGH_MANIFESTS = {"api/requirements.txt": "tensorflow==2.15.0\nopencv-python\nfastapi\n"}
PARTIAL_MANIFESTS = {"requirements.txt": "flask\ntorch\ntorchvision\n"}
LOW_MANIFESTS = {"requirements.txt": "pandas\nscikit-learn\nyfinance\nnumpy\n"}


# ---------------------------------------------------------------------------
# D4. Future/planned filtering
# ---------------------------------------------------------------------------

def test_future_filtering():
    print("\n" + "=" * 60)
    print("D4 — Future/Planned Statement Filtering")
    print("=" * 60)

    from services.llm_client import _is_future_statement, _heuristic_extract_claims

    future_sentences = [
        "Urdu support coming soon",
        "We plan to add multilingual support",
        "Will support iOS in the next phase",
        "TODO: integrate payment gateway",
        "Roadmap: add offline mode",
        "Future work: federated learning",
        "In progress: voice interface",
        "This feature is planned for Phase 2",
    ]
    for s in future_sentences:
        assert _is_future_statement(s), f"Should detect as future: '{s}'"
    print(f"  [OK] All {len(future_sentences)} future sentences correctly detected")

    readme_with_roadmap = """
# MyApp

## Features
- CNN-based disease detection
- REST API backend

## Roadmap
- Urdu support coming soon
- Will add offline mode
- iOS app planned
"""
    claims = _heuristic_extract_claims(readme_with_roadmap)
    future_found = [c for c in claims if _is_future_statement(c)]
    assert not future_found, f"Future claims leaked: {future_found}"
    print(f"  [OK] Roadmap section suppressed; extracted claims: {claims}")


# ---------------------------------------------------------------------------
# D5. Requirement decomposition
# ---------------------------------------------------------------------------

def test_requirement_decomposition():
    print("\n" + "=" * 60)
    print("D5 — Requirement Decomposition (heuristic)")
    print("=" * 60)

    from services.llm_client import _heuristic_decompose

    reqs = _heuristic_decompose(PS_TITLE, PS_DESC)
    assert isinstance(reqs, list), "Must return a list"
    assert len(reqs) >= 1, "Must return at least one requirement"
    for r in reqs:
        assert "id" in r, f"Missing 'id' in {r}"
        assert "category" in r, f"Missing 'category' in {r}"
        assert "description" in r, f"Missing 'description' in {r}"
        assert "weight" in r, f"Missing 'weight' in {r}"
        assert isinstance(r["weight"], float), f"'weight' must be float in {r}"
    print(f"  [OK] {len(reqs)} requirements decomposed: {[r['category'] for r in reqs]}")


# ---------------------------------------------------------------------------
# D6. Coverage scoring
# ---------------------------------------------------------------------------

def test_coverage_scoring():
    print("\n" + "=" * 60)
    print("D6 — Requirement Coverage Scoring (heuristic)")
    print("=" * 60)

    from services.llm_client import _heuristic_decompose, _heuristic_score_requirements

    reqs = _heuristic_decompose(PS_TITLE, PS_DESC)

    high_scored = _heuristic_score_requirements(reqs, README_HIGH, HIGH_FILES, HIGH_MANIFESTS)
    partial_scored = _heuristic_score_requirements(reqs, README_PARTIAL, PARTIAL_FILES, PARTIAL_MANIFESTS)
    low_scored = _heuristic_score_requirements(reqs, README_LOW, LOW_FILES, LOW_MANIFESTS)

    high_avg = sum(r["score"] for r in high_scored) / len(high_scored)
    partial_avg = sum(r["score"] for r in partial_scored) / len(partial_scored)
    low_avg = sum(r["score"] for r in low_scored) / len(low_scored)

    print(f"  Coverage avg  — high: {high_avg:.2f}, partial: {partial_avg:.2f}, low: {low_avg:.2f}")
    assert high_avg > low_avg, "High-coverage repo must outscore low-coverage repo"

    for r in high_scored + partial_scored + low_scored:
        assert r["status"] in ("met", "partial", "missing"), f"Bad status: {r['status']}"
        assert 0.0 <= r["score"] <= 1.0, f"Score out of range: {r['score']}"
    print("  [OK] Coverage scoring produces valid status and score values")


# ---------------------------------------------------------------------------
# D7. Weighted relevance: high > partial > low with >= 15-point gaps
# ---------------------------------------------------------------------------

def test_weighted_relevance():
    print("\n" + "=" * 60)
    print("D7 — Weighted Relevance Score Separation (>= 15 points per tier)")
    print("=" * 60)

    from services.embeddings import compute_relevance_score
    from services.llm_client import _heuristic_decompose, _heuristic_score_requirements

    reqs = _heuristic_decompose(PS_TITLE, PS_DESC)

    high_sreqs = _heuristic_score_requirements(reqs, README_HIGH, HIGH_FILES, HIGH_MANIFESTS)
    partial_sreqs = _heuristic_score_requirements(reqs, README_PARTIAL, PARTIAL_FILES, PARTIAL_MANIFESTS)
    low_sreqs = _heuristic_score_requirements(reqs, README_LOW, LOW_FILES, LOW_MANIFESTS)

    score_high = compute_relevance_score(PS_TITLE, PS_DESC, README_HIGH, HIGH_CLAIMS,
                                         scored_requirements=high_sreqs)
    score_partial = compute_relevance_score(PS_TITLE, PS_DESC, README_PARTIAL, PARTIAL_CLAIMS,
                                            scored_requirements=partial_sreqs)
    score_low = compute_relevance_score(PS_TITLE, PS_DESC, README_LOW, LOW_CLAIMS,
                                        scored_requirements=low_sreqs)

    print(f"  Scores — high: {score_high}, partial: {score_partial}, low: {score_low}")

    assert score_high > score_partial, f"high ({score_high}) must be > partial ({score_partial})"
    assert score_partial > score_low, f"partial ({score_partial}) must be > low ({score_low})"

    gap_high_partial = score_high - score_partial
    gap_partial_low = score_partial - score_low

    assert gap_high_partial >= 15, (
        f"Gap between high and partial must be >= 15 points, got {gap_high_partial}"
    )
    assert gap_partial_low >= 15, (
        f"Gap between partial and low must be >= 15 points, got {gap_partial_low}"
    )
    print(f"  [OK] Gaps: high-partial={gap_high_partial}, partial-low={gap_partial_low} (both >= 15)")


# ---------------------------------------------------------------------------
# D2. High-relevance repo verifies >= 70% of claims
# ---------------------------------------------------------------------------

def test_high_repo_claim_verification():
    print("\n" + "=" * 60)
    print("D2 — High-relevance repo verifies >= 70% of claims")
    print("=" * 60)

    from services.github_client import RepoBundle
    from services.evidence_search import search_evidence_for_claim
    from services.verification import verify_claim

    # Simulate a CNN potato-disease repo with notebook + requirements.txt evidence
    notebook_content = json.dumps({
        "cells": [
            {"cell_type": "code", "source": [
                "import tensorflow as tf\n",
                "from tensorflow.keras.layers import Conv2D, Dense\n",
                "model = tf.keras.Sequential([Conv2D(32, (3,3)), Dense(10)])\n",
                "# Train CNN on PlantVillage dataset\n",
                "model.fit(train_data, epochs=10)\n",
            ]},
            {"cell_type": "code", "source": [
                "# Disease prediction\n",
                "prediction = model.predict(leaf_image)\n",
                "disease_class = ['Healthy', 'Early_Blight', 'Late_Blight'][prediction.argmax()]\n",
            ]},
        ]
    })

    bundle = RepoBundle(
        success=True, owner="test", repo="potato-cnn", default_branch="main",
        file_paths=[
            "notebooks/cnn_training.ipynb",
            "src/predict.py",
            "requirements.txt",
            "mobile/lib/main.dart",
        ],
        manifest_contents={
            "requirements.txt": "tensorflow==2.15.0\nkeras\nopencv-python\nnumpy\npillow\n"
        },
        cached_files={
            "notebooks/cnn_training.ipynb": notebook_content,
            "src/predict.py": (
                "import tensorflow as tf\n"
                "def predict_disease(image):\n"
                "    model = tf.keras.models.load_model('cnn_model.h5')\n"
                "    pred = model.predict(image)\n"
                "    return pred\n"
            ),
        },
    )

    cnn_claims = [
        "CNN model classifies potato leaf diseases",
        "TensorFlow deep learning framework used",
        "Image-based disease detection",
        "Disease prediction from leaf images",
    ]

    verified_count = 0
    for claim in cnn_claims:
        ev = search_evidence_for_claim(bundle, claim)
        result = verify_claim(claim, ev)
        icon = "[OK]" if result.status == "verified" else "[~~]" if result.status == "partially_verified" else "[XX]"
        print(f"  {icon} '{claim}': {result.status}")
        if result.status in ("verified", "partially_verified"):
            verified_count += 1

    rate = verified_count / len(cnn_claims)
    print(f"  Verification rate: {verified_count}/{len(cnn_claims)} = {rate:.0%}")
    assert rate >= 0.70, (
        f"High-relevance repo must verify >= 70% of claims, got {rate:.0%}"
    )
    print("  [OK] >= 70% claims verified for high-relevance CNN potato disease repo")


# ---------------------------------------------------------------------------
# D3. Regression: notebook/subfolder claims are marked verified
# ---------------------------------------------------------------------------

def test_notebook_and_subfolder_evidence():
    print("\n" + "=" * 60)
    print("D3 — Regression: notebook + subfolder evidence marks claim verified")
    print("=" * 60)

    from services.github_client import RepoBundle
    from services.evidence_search import search_evidence_for_claim, _extract_notebook_text
    from services.verification import verify_claim

    # Test notebook text extraction
    nb_json = json.dumps({
        "cells": [
            {"cell_type": "code", "source": ["import torch\n", "model = CNN()\n"]},
            {"cell_type": "markdown", "source": ["# Training\nTrain CNN on dataset"]},
        ]
    })
    extracted = _extract_notebook_text(nb_json)
    assert "torch" in extracted, "Notebook text extraction failed"
    assert "CNN" in extracted, "Notebook text extraction failed"
    print("  [OK] Notebook cell text extraction works")

    # Test: claim backed by code in a notebook subfolder
    bundle_nb = RepoBundle(
        success=True, owner="test", repo="ml-project", default_branch="main",
        file_paths=["notebooks/model_training.ipynb", "requirements.txt"],
        manifest_contents={"requirements.txt": "tensorflow\nsklearn\n"},
        cached_files={
            "notebooks/model_training.ipynb": json.dumps({
                "cells": [{"cell_type": "code", "source": [
                    "from sklearn.svm import SVM\n",
                    "clf = SVM(kernel='rbf')\n",
                    "clf.fit(X_train, y_train)\n",
                ]}]
            })
        },
    )
    ev = search_evidence_for_claim(bundle_nb, "SVM classifier for prediction")
    found = [e for e in ev if e.get("found", False)]
    print(f"  Evidence items found: {len(found)}")
    assert len(found) >= 1, "Must find evidence in notebook"
    assert any("ipynb" in e["file"] for e in found), "Evidence must reference notebook file"
    print("  [OK] Notebook evidence found correctly")

    result = verify_claim("SVM classifier for prediction", ev)
    assert result.status in ("verified", "partially_verified"), (
        f"Notebook-backed claim must not be not_found, got {result.status}"
    )
    print(f"  [OK] Notebook-backed claim is '{result.status}' (not 'not_found')")

    # Test: claim backed by code in a deep subfolder (not repo root)
    bundle_sub = RepoBundle(
        success=True, owner="test", repo="deep-project", default_branch="main",
        file_paths=[
            "src/models/cnn/plant_classifier.py",
            "src/api/routes.py",
            "requirements.txt",
        ],
        manifest_contents={"requirements.txt": "tensorflow\nfastapi\n"},
        cached_files={
            "src/models/cnn/plant_classifier.py": (
                "import tensorflow as tf\n"
                "class PlantCNN(tf.keras.Model):\n"
                "    def __init__(self):\n"
                "        super().__init__()\n"
                "        self.conv = tf.keras.layers.Conv2D(32, 3)\n"
            ),
        },
    )
    ev2 = search_evidence_for_claim(bundle_sub, "CNN plant disease classification")
    found2 = [e for e in ev2 if e.get("found", False)]
    print(f"  Evidence items from deep subfolder: {len(found2)}")
    assert len(found2) >= 1, "Must find evidence in deep subfolder"
    result2 = verify_claim("CNN plant disease classification", ev2)
    assert result2.status in ("verified", "partially_verified"), (
        f"Subfolder-backed claim must not be not_found, got {result2.status}"
    )
    print(f"  [OK] Deep-subfolder claim is '{result2.status}' (not 'not_found')")


# ---------------------------------------------------------------------------
# Run all
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    try:
        test_future_filtering()
        test_requirement_decomposition()
        test_coverage_scoring()
        test_weighted_relevance()
        test_high_repo_claim_verification()
        test_notebook_and_subfolder_evidence()

        print("\n" + "=" * 60)
        print("[PASS] ALL REQUIREMENT TESTS VERIFIED SUCCESSFULLY")
        print("=" * 60)
    except Exception as e:
        print(f"\n[FAIL] {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
