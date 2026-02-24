"""
Manages the storage/ directory layout:
  storage/{assignment_id}/original/   <- immutable source files
  storage/{assignment_id}/snapshots/  <- versioned presentation snapshots
"""
from pathlib import Path
import shutil

STORAGE_ROOT = Path(__file__).parent.parent / "storage"


def assignment_original_dir(assignment_id: int) -> Path:
    return STORAGE_ROOT / str(assignment_id) / "original"


def assignment_snapshots_dir(assignment_id: int) -> Path:
    return STORAGE_ROOT / str(assignment_id) / "snapshots"


def ensure_assignment_dirs(assignment_id: int) -> None:
    assignment_original_dir(assignment_id).mkdir(parents=True, exist_ok=True)
    assignment_snapshots_dir(assignment_id).mkdir(parents=True, exist_ok=True)


def save_file(assignment_id: int, filename: str, content: bytes) -> Path:
    """Save a file to the original/ directory and return its path."""
    ensure_assignment_dirs(assignment_id)
    dest = assignment_original_dir(assignment_id) / filename
    dest.write_bytes(content)
    return dest


def save_snapshot(assignment_id: int, version_id: int, config: dict) -> Path:
    """Persist a JSON snapshot of a presentation config for version history."""
    import json
    ensure_assignment_dirs(assignment_id)
    snap_dir = assignment_snapshots_dir(assignment_id)
    snap_path = snap_dir / f"v{version_id}.json"
    snap_path.write_text(json.dumps(config, indent=2))
    return snap_path


def get_entry_file(assignment_id: int, file_path: str) -> Path:
    """Return the absolute path to the assignment's entry HTML file."""
    return assignment_original_dir(assignment_id) / file_path


def copy_assignment_files(source_id: int, dest_id: int) -> None:
    """Copy all files from one assignment's storage to another."""
    src = assignment_original_dir(source_id)
    if not src.exists():
        return
    dest = assignment_original_dir(dest_id)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dest)
    # Create snapshots dir for the new assignment
    assignment_snapshots_dir(dest_id).mkdir(parents=True, exist_ok=True)


def delete_assignment_files(assignment_id: int) -> None:
    dir_path = STORAGE_ROOT / str(assignment_id)
    if dir_path.exists():
        shutil.rmtree(dir_path)
