"""
Assignment connections — curriculum sequencing and prerequisites.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, or_

from ..database import get_session
from ..models import (
    Assignment,
    AssignmentConnection,
    AssignmentConnectionCreate,
    AssignmentConnectionRead,
)

router = APIRouter(tags=["connections"])


@router.get("/assignments/{assignment_id}/connections", response_model=list[AssignmentConnectionRead])
def list_connections(assignment_id: int, session: Session = Depends(get_session)):
    """Returns all connections where this assignment is either source or target."""
    if not session.get(Assignment, assignment_id):
        raise HTTPException(status_code=404, detail="Assignment not found")
    stmt = select(AssignmentConnection).where(
        or_(
            AssignmentConnection.from_assignment_id == assignment_id,
            AssignmentConnection.to_assignment_id == assignment_id,
        )
    )
    return session.exec(stmt).all()


@router.post("/connections", response_model=AssignmentConnectionRead)
def create_connection(
    data: AssignmentConnectionCreate,
    session: Session = Depends(get_session),
):
    if data.from_assignment_id == data.to_assignment_id:
        raise HTTPException(status_code=422, detail="Cannot connect an assignment to itself")
    if not session.get(Assignment, data.from_assignment_id):
        raise HTTPException(status_code=404, detail="Source assignment not found")
    if not session.get(Assignment, data.to_assignment_id):
        raise HTTPException(status_code=404, detail="Target assignment not found")

    # Check for duplicate
    existing = session.exec(
        select(AssignmentConnection).where(
            AssignmentConnection.from_assignment_id == data.from_assignment_id,
            AssignmentConnection.to_assignment_id == data.to_assignment_id,
            AssignmentConnection.connection_type == data.connection_type,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="This connection already exists")

    conn = AssignmentConnection(**data.model_dump())
    session.add(conn)
    session.commit()
    session.refresh(conn)
    return conn


@router.delete("/connections/{connection_id}")
def delete_connection(connection_id: int, session: Session = Depends(get_session)):
    conn = session.get(AssignmentConnection, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    session.delete(conn)
    session.commit()
    return {"ok": True}


@router.get("/learning-paths")
def get_learning_paths(session: Session = Depends(get_session)):
    """
    Returns a graph of all prerequisite connections, suitable for
    rendering a curriculum map on the frontend.
    """
    conns = session.exec(select(AssignmentConnection)).all()
    assignments = session.exec(
        select(Assignment).where(Assignment.is_published == True)
    ).all()

    nodes = [
        {
            "id": a.id,
            "title": a.title,
            "subject_area": a.subject_area,
            "difficulty_level": a.difficulty_level,
            "review_status": a.review_status,
        }
        for a in assignments
    ]
    edges = [
        {
            "id": c.id,
            "from": c.from_assignment_id,
            "to": c.to_assignment_id,
            "type": c.connection_type,
            "description": c.description,
        }
        for c in conns
    ]
    return {"nodes": nodes, "edges": edges}
