from .assignments import router as assignments_router
from .feedback import router as feedback_router
from .presentation import router as presentation_router
from .dashboard import router as dashboard_router
from .standards import router as standards_router
from .reviews import router as reviews_router
from .connections import router as connections_router

__all__ = [
    "assignments_router",
    "feedback_router",
    "presentation_router",
    "dashboard_router",
    "standards_router",
    "reviews_router",
    "connections_router",
]
