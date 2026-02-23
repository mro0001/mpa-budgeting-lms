"""
GitHub import service — uses the REST API only (no git clone needed).
Fetches the full tree, then downloads each blob via raw.githubusercontent.com.
"""
import re
from pathlib import Path
from typing import Optional
import httpx

GITHUB_API = "https://api.github.com"
GITHUB_RAW = "https://raw.githubusercontent.com"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB per file


def parse_github_url(url: str) -> tuple[str, str, str]:
    """
    Accepts:
      https://github.com/owner/repo
      https://github.com/owner/repo/tree/branch
    Returns (owner, repo, branch).  Branch defaults to "" meaning "auto-detect".
    """
    url = url.rstrip("/").removesuffix(".git")

    pattern = r"github\.com/([^/]+)/([^/]+)(?:/tree/([^/]+))?"
    m = re.search(pattern, url)
    if not m:
        raise ValueError(f"Cannot parse GitHub URL: {url}")

    owner, repo = m.group(1), m.group(2)
    branch = m.group(3) or ""   # "" signals auto-detect
    return owner, repo, branch


async def get_default_branch(
    owner: str,
    repo: str,
    token: Optional[str] = None,
) -> str:
    """
    Query the GitHub repo metadata to get the default branch name
    (e.g. 'main' or 'master').  Raises httpx.HTTPStatusError on 404.
    """
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{GITHUB_API}/repos/{owner}/{repo}", headers=headers
        )
        resp.raise_for_status()
        return resp.json()["default_branch"]


async def fetch_repo_files(
    owner: str,
    repo: str,
    branch: str,
    token: Optional[str] = None,
) -> list[dict]:
    """
    Returns a list of dicts with keys: path, size, download_url.
    If branch is empty, auto-detects the default branch first.
    """
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # Auto-detect default branch when not explicitly provided
    if not branch:
        branch = await get_default_branch(owner, repo, token)

    tree_url = f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(tree_url, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    files = []
    for item in data.get("tree", []):
        if item.get("type") != "blob":
            continue
        path = item["path"]
        if path.startswith(".") or any(
            path.endswith(ext) for ext in [".gitignore", ".DS_Store"]
        ):
            continue
        files.append(
            {
                "path": path,
                "size": item.get("size", 0),
                "download_url": f"{GITHUB_RAW}/{owner}/{repo}/{branch}/{path}",
            }
        )
    return files, branch   # also return resolved branch name


async def download_file(url: str, token: Optional[str] = None) -> bytes:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.content


def detect_entry_file(file_paths: list[str]) -> Optional[str]:
    """
    Heuristic: prefer index.html, then any .html at root level,
    then any .html anywhere.
    """
    root_htmls = [p for p in file_paths if "/" not in p and p.endswith(".html")]
    if "index.html" in root_htmls:
        return "index.html"
    if root_htmls:
        return root_htmls[0]
    all_htmls = [p for p in file_paths if p.endswith(".html")]
    return all_htmls[0] if all_htmls else None
