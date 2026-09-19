"""
main.py — FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app instance with metadata
  - Configure CORS (allow all origins for local dev)
  - On startup: create all DB tables and load the embedding model
  - Mount routers
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from starlette.responses import Response

from database import Base, engine


# ---------------------------------------------------------------------------
# Startup / shutdown lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables and preload embedding model on startup."""
    Base.metadata.create_all(bind=engine)
    print("[startup] Database tables created (or already exist)")

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
# CORS
#
# Root cause of "Failed to fetch":
#   FastAPI's CORSMiddleware (via add_middleware) becomes the outermost ASGI
#   layer. When allow_origins=[] + allow_origin_regex is used with
#   allow_credentials=True, Starlette returns "Disallowed CORS origin" (400)
#   for browser OPTIONS preflights from http://localhost:8080.
#
# Fix:
#   1. Remove CORSMiddleware entirely.
#   2. Use a plain @app.middleware("http") to inject CORS headers on every
#      response (this runs AFTER routing, which is fine for non-OPTIONS).
#   3. Add an explicit catch-all OPTIONS route ("/") to handle preflights
#      BEFORE the router can return 400.
# ---------------------------------------------------------------------------

_CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Access-Control-Max-Age": "600",
}


@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    """Inject CORS headers on every non-OPTIONS response."""
    response = await call_next(request)
    for k, v in _CORS.items():
        response.headers[k] = v
    return response


# ---------------------------------------------------------------------------
# Explicit OPTIONS handler — must be registered BEFORE routers
# so it wins the route match for preflight requests.
# ---------------------------------------------------------------------------

@app.options("/{rest_of_path:path}", include_in_schema=False)
async def options_handler(rest_of_path: str):
    """Handle all CORS preflight OPTIONS requests."""
    return Response(status_code=200, headers=_CORS)


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
