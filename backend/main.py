"""
main.py — FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app instance with metadata
  - Configure CORS (localhost:5173 for local dev + wildcard for Lovable preview)
  - On startup: create all DB tables and load the embedding model
  - Mount routers
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine


# ---------------------------------------------------------------------------
# Startup / shutdown lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables and preload embedding model on startup."""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("[startup] Database tables created (or already exist)")

    # Preload the sentence-transformer model so first request isn't slow
    try:
        from services.embeddings import embed
        _ = embed("warmup")
        print("[startup] Embedding model loaded")
    except Exception as e:
        print(f"[startup] Embedding model load deferred: {e}")

    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Hackathon Submission Verifier",
    description=(
        "Verifies hackathon GitHub repos against README claims. "
        "Claim → Evidence → Reasoning → Verification Result."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# CORS — allow the Lovable-hosted frontend + local Vite dev server
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.(lovable\.app|lovableproject\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

from routers import hackathons  # noqa: E402
app.include_router(hackathons.router)

from routers import submissions  # noqa: E402
app.include_router(submissions.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["meta"])
def health():
    """Quick liveness check — confirms server is up and DB is reachable."""
    from sqlalchemy import text
    from database import SessionLocal
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    finally:
        db.close()
    return {"status": "ok", "db": "ok" if db_ok else "error"}
