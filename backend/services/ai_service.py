"""
AI service — all calls go to MindRouter2 (University of Idaho gateway).
Credentials are loaded from .env and NEVER returned to the frontend.

Five AI capabilities:
  1. generate_description — catalog description from HTML
  2. suggest_tags — 3-6 topic tags
  3. analyze_feedback_themes — summarize feedback patterns
  4. check_conformance — evaluate HTML against assignment standard criteria
  5. generate_agent_prompt — produce a spec a coding agent can follow to build a conforming assignment
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
MODEL = "claude-sonnet-4-6"

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
    """Low-level call to MindRouter2 messages endpoint."""
    url = f"{MINDROUTER2_URL}/v1/messages"
    payload = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, headers=_headers(), json=payload)
        resp.raise_for_status()
        data = resp.json()
    return data["content"][0]["text"].strip()


# ── 1. Description Generation ─────────────────────────────────────────────────

async def generate_description(title: str, html_snippet: str) -> Optional[str]:
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


# ── 2. Tag Suggestion ──────────────────────────────────────────────────────────

async def suggest_tags(title: str, description: str) -> list[str]:
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
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start != -1 and end > start:
            return json.loads(raw[start:end])
        return []
    except Exception:
        return []


# ── 3. Feedback Theme Analysis ─────────────────────────────────────────────────

async def analyze_feedback_themes(
    assignment_title: str,
    comments: list[dict],
) -> Optional[str]:
    if not MINDROUTER2_URL or not MINDROUTER2_KEY:
        return None
    if not comments:
        return "No feedback yet to analyze."
    try:
        comment_block = "\n".join(
            f"[{c.get('role', 'user')}] {c.get('author', 'anon')}: {c.get('content', '')}"
            for c in comments[:50]
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


# ── 4. Conformance Checking ────────────────────────────────────────────────────

async def check_conformance(
    assignment_title: str,
    html_content: str,
    criteria: list[str],
    recommended: list[str],
) -> Optional[dict]:
    """
    Analyze an assignment's HTML against a set of criteria.
    Returns:
      { overall_score: float, met_criteria: [...], missing_criteria: [...],
        recommendations: [...], ai_analysis: str }
    """
    if not MINDROUTER2_URL or not MINDROUTER2_KEY:
        return None
    try:
        # Send a manageable excerpt — first 8000 chars + last 2000 chars
        excerpt = html_content[:8000]
        if len(html_content) > 10000:
            excerpt += f"\n\n... [{len(html_content) - 10000} chars omitted] ...\n\n"
            excerpt += html_content[-2000:]

        criteria_str = "\n".join(f"  - {c}" for c in criteria)
        recommended_str = "\n".join(f"  - {r}" for r in recommended)

        prompt = (
            f"You are an educational technology evaluator for an MPA (Master of Public "
            f"Administration) Learning Management System.\n\n"
            f"Assignment: \"{assignment_title}\"\n\n"
            f"HTML content (excerpt):\n```html\n{excerpt}\n```\n\n"
            f"REQUIRED criteria to check:\n{criteria_str}\n\n"
            f"RECOMMENDED (bonus) elements:\n{recommended_str}\n\n"
            f"Evaluate this assignment. Return a JSON object with exactly these keys:\n"
            f"- \"overall_score\": float 0.0-1.0 (fraction of REQUIRED criteria met)\n"
            f"- \"met_criteria\": array of criteria strings that ARE present\n"
            f"- \"missing_criteria\": array of criteria strings that are NOT present\n"
            f"- \"recommendations\": array of 3-5 specific, actionable improvement suggestions\n"
            f"- \"ai_analysis\": 2-3 sentence overall assessment\n\n"
            f"Return ONLY valid JSON, no markdown formatting."
        )
        raw = await _chat([{"role": "user", "content": prompt}], max_tokens=1500)
        # Extract JSON robustly
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(raw[start:end])
        return None
    except Exception:
        return None


# ── 5. Agent Prompt Generation (the "vibe coding" feature) ────────────────────

async def generate_agent_prompt(
    source_description: str,
    source_html_snippet: str,
    standard_name: str,
    required_sections: list[str],
    required_elements: list[str],
    recommended_elements: list[str],
    technical_requirements: list[str],
    pedagogical_requirements: list[str],
    reference_html_snippet: str = "",
    mode: str = "create",
    original_format: Optional[str] = None,
) -> Optional[str]:
    """
    Generate a detailed prompt that a professor can hand to a coding AI agent
    (Claude, Cursor, Copilot, etc.) to build a conforming assignment from
    raw source material.

    mode="create": Build from scratch (original behavior).
    mode="convert": Convert existing document — preserve all original content.
    """
    if not MINDROUTER2_URL or not MINDROUTER2_KEY:
        return None
    try:
        ref_section = ""
        if reference_html_snippet:
            ref_section = (
                f"\n\nREFERENCE IMPLEMENTATION (follow this structural pattern):\n"
                f"```html\n{reference_html_snippet[:4000]}\n```\n"
            )

        sections_str = "\n".join(f"  - {s}" for s in required_sections)
        elements_str = "\n".join(f"  - {e}" for e in required_elements)
        recommended_str = "\n".join(f"  - {r}" for r in recommended_elements)
        technical_str = "\n".join(f"  - {t}" for t in technical_requirements)
        pedagogical_str = "\n".join(f"  - {p}" for p in pedagogical_requirements)

        if mode == "convert":
            prompt = _build_conversion_prompt(
                source_description=source_description,
                source_content=source_html_snippet,
                original_format=original_format,
                standard_name=standard_name,
                sections_str=sections_str,
                elements_str=elements_str,
                recommended_str=recommended_str,
                technical_str=technical_str,
                pedagogical_str=pedagogical_str,
                ref_section=ref_section,
            )
        else:
            prompt = (
                f"You are a specialist in building educational technology for MPA (Master of "
                f"Public Administration) programs. A professor wants to turn their source "
                f"material into a fully conforming interactive assignment.\n\n"
                f"SOURCE MATERIAL DESCRIPTION:\n{source_description}\n\n"
                f"SOURCE HTML EXCERPT:\n```html\n{source_html_snippet[:3000]}\n```\n\n"
                f"TARGET STANDARD: \"{standard_name}\"\n\n"
                f"REQUIRED SECTIONS:\n{sections_str}\n\n"
                f"REQUIRED INTERACTIVE ELEMENTS:\n{elements_str}\n\n"
                f"RECOMMENDED ELEMENTS:\n{recommended_str}\n\n"
                f"TECHNICAL REQUIREMENTS:\n{technical_str}\n\n"
                f"PEDAGOGICAL REQUIREMENTS:\n{pedagogical_str}\n"
                f"{ref_section}\n"
                f"Generate a detailed, ready-to-use PROMPT that a professor can paste directly "
                f"into Claude, Cursor, or another AI coding assistant. The prompt should:\n"
                f"1. Describe exactly what to build (structure, sections, interactive elements)\n"
                f"2. Include the source data and subject matter\n"
                f"3. Specify the HTML/CSS/JS architecture (single self-contained HTML file)\n"
                f"4. List every required and recommended feature\n"
                f"5. Reference the structural pattern from the standard\n\n"
                f"The output should be a complete, copy-pasteable prompt — NOT the assignment "
                f"HTML itself. Start the prompt with: \"Build a self-contained interactive "
                f"HTML assignment for an MPA course...\""
            )
        return await _chat([{"role": "user", "content": prompt}], max_tokens=3000)
    except Exception:
        return None


def _build_conversion_prompt(
    source_description: str,
    source_content: str,
    original_format: Optional[str],
    standard_name: str,
    sections_str: str,
    elements_str: str,
    recommended_str: str,
    technical_str: str,
    pedagogical_str: str,
    ref_section: str,
) -> str:
    """Build the AI prompt for converting an existing document into an interactive assignment."""
    format_note = f" (extracted from a .{original_format} file)" if original_format else ""
    return (
        f"You are a specialist in converting existing educational documents into interactive "
        f"HTML assignments for MPA (Master of Public Administration) programs.\n\n"
        f"A professor has an existing document{format_note} they want to convert into a "
        f"conforming interactive assignment. The CRITICAL rule is: preserve ALL existing "
        f"questions, data, examples, and instructional content from the original document. "
        f"Do NOT invent new questions or replace existing content — instead, wrap the existing "
        f"material in an interactive structure.\n\n"
        f"PROFESSOR'S CONVERSION INSTRUCTIONS:\n{source_description}\n\n"
        f"ORIGINAL DOCUMENT CONTENT{format_note}:\n"
        f"```\n{source_content[:4000]}\n```\n\n"
        f"TARGET STANDARD: \"{standard_name}\"\n\n"
        f"REQUIRED SECTIONS:\n{sections_str}\n\n"
        f"REQUIRED INTERACTIVE ELEMENTS:\n{elements_str}\n\n"
        f"RECOMMENDED ELEMENTS:\n{recommended_str}\n\n"
        f"TECHNICAL REQUIREMENTS:\n{technical_str}\n\n"
        f"PEDAGOGICAL REQUIREMENTS:\n{pedagogical_str}\n"
        f"{ref_section}\n"
        f"Generate a detailed, ready-to-use PROMPT that a professor can paste directly "
        f"into Claude, Cursor, or another AI coding assistant. The prompt MUST:\n"
        f"1. Include the COMPLETE extracted text from the original document\n"
        f"2. Explicitly instruct the AI to preserve every question, dataset, and example\n"
        f"3. Describe how to wrap existing content in the interactive structure "
        f"(sidebar navigation, progress tracking, concept cards, hints, verification)\n"
        f"4. Specify the HTML/CSS/JS architecture (single self-contained HTML file)\n"
        f"5. List every required and recommended feature from the standard\n"
        f"6. Note that this is a CONVERSION, not creation from scratch — "
        f"fidelity to the original material is paramount\n\n"
        f"The output should be a complete, copy-pasteable prompt — NOT the assignment "
        f"HTML itself. Start the prompt with: \"Convert the following existing assignment "
        f"document into a self-contained interactive HTML assignment for an MPA course...\""
    )
