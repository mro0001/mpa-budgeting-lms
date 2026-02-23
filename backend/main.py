"""
MPA Budgeting LMS — FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .database import create_db_and_tables
from .routes import (
    assignments_router,
    feedback_router,
    presentation_router,
    dashboard_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (idempotent)
    create_db_and_tables()
    # Ensure storage directory exists
    storage = Path(__file__).parent / "storage"
    storage.mkdir(exist_ok=True)
    yield


app = FastAPI(
    title="MPA Budgeting LMS",
    description="AI-enabled Learning Management System for Local Government budgeting assignments",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server and any localhost origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(assignments_router, prefix="/api")
app.include_router(feedback_router, prefix="/api")
app.include_router(presentation_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MPA Budgeting LMS"}
