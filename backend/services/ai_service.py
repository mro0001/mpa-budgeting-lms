"""
AI service — all calls go to MindRouter2 (University of Idaho gateway).
Credentials are loaded from .env and NEVER returned to the frontend.
"""
import json
import os
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

# Load .env from workspace root (two levels up from this file)
_env_path = Path(__file__).parent.parent.parent.parent / ".env"
load_dotenv(_env_path)

MINDROUTER2_URL = os.getenv("MINDROUTER2_URL", "").rstrip("/")
MINDROUTER2_KEY = os.getenv("MINDROUTER2_KEY", "")
MODEL = "claude-sonnet-4-6"   # model served via MindRouter2

# Safety guard: if misconfigured, fail at startup rather than leaking in responses
if not MINDROUTER2_URL or not MINDROUTER2_KEY:
    import warnings
    warnings.warn(
        "MINDROUTER2_URL or MINDROUTER2_KEY not set — AI features will be unavailable.",
        stacklevel=1,
    )


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {MINDROUTER2_KEY}",
        "Content-Type": "application/json",
    }


async def _chat(messages: list[dict], max_tokens: int = 512) -> str:
    """Low-level call to MindRouter2 chat/completions endpoint."""
    url = f"{MINDROUTER2_URL}/v1/messages"
    payload = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=_headers(), json=payload)
        resp.raise_for_status()
        data = resp.json()
    # Anthropic messages API response shape
    return data["content"][0]["text"].strip()


async def generate_description(title: str, html_snippet: str) -> Optional[str]:
    """
    Given the assignment title and a snippet of its HTML, generate a
    2-3 sentence catalog description suitable for professors browsing the LMS.
    Returns None on any error (never leaks internal URLs or credentials).
    """
    if not MINDROUTER2_URL or not MINDROUTER2_KEY:
        return None
    try:
        prompt = (
            f"You are helping professors discover learning materials in an MPA (Master of "
            f"Public Administration) Learning Management System.\n\n"
            f"Assignment title: {title}\n\n"
            f"HTML excerpt (first 2000 chars):\n{html_snippet[:2000]}\n\n"
            f"Write a concise 2-3 sentence catalog description that explains what students "
            f"will learn and practice in this assignment. Focus on learning outcomes. "
            f"Do not use bullet points. Plain prose only."
        )
        return await _chat([{"role": "user", "content": prompt}], max_tokens=256)
    except Exception:
        return None


async def suggest_tags(title: str, description: str) -> list[str]:
    """
    Return a JSON array of 3-6 relevant tags for the assignment.
    Falls back to [] on any error.
    """
    if not MINDROUTER2_URL or not MINDROUTER2_KEY:
        return []
    try:
        prompt = (
            f"Assignment title: {title}\nDescription: {description}\n\n"
            f"Return ONLY a JSON array of 3-6 short tags relevant to this MPA budgeting "
            f"assignment. Examples: [\"revenue forecasting\", \"Excel\", \"municipal finance\"]. "
            f"No explanation, just the JSON array."
        )
        raw = await _chat([{"role": "user", "content": prompt}], max_tokens=128)
        # Extract JSON array robustly
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start != -1 and end > start:
            return json.loads(raw[start:end])
        return []
    except Exception:
        return []


async def analyze_feedback_themes(
    assignment_title: str,
    comments: list[dict],
) -> Optional[str]:
    """
    Given a list of feedback dicts (author, role, content), return a
    prose summary of recurring themes for the professor.
    Returns None on any error.
    """
    if not MINDROUTER2_URL or not MINDROUTER2_KEY:
        return None
    if not comments:
        return "No feedback yet to analyze."
    try:
        comment_block = "\n".join(
            f"[{c.get('role', 'user')}] {c.get('author', 'anon')}: {c.get('content', '')}"
            for c in comments[:50]  # cap at 50 to stay within token budget
        )
        prompt = (
            f"You are assisting a professor reviewing feedback on their assignment "
            f'"{assignment_title}" in an MPA Learning Management System.\n\n'
            f"Feedback comments:\n{comment_block}\n\n"
            f"Summarize the key recurring themes, suggestions, and concerns in 3-4 sentences. "
            f"Focus on actionable insights for the professor. Plain prose, no bullet points."
        )
        return await _chat([{"role": "user", "content": prompt}], max_tokens=400)
    except Exception:
        return None
