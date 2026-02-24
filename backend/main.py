"""
MPA Budgeting LMS — FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from .database import create_db_and_tables
from .routes import (
    assignments_router,
    feedback_router,
    presentation_router,
    dashboard_router,
    standards_router,
    reviews_router,
    connections_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    storage = Path(__file__).parent / "storage"
    storage.mkdir(exist_ok=True)
    yield


app = FastAPI(
    title="MPA Budgeting LMS",
    description="AI-enabled Learning Management System for Local Government budgeting assignments",
    version="0.2.0",
    lifespan=lifespan,
)

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
app.include_router(standards_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(connections_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MPA Budgeting LMS", "version": "0.2.0"}
