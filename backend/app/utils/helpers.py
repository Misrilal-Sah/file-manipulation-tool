"""
Utility helper functions
"""
import uuid
import os
from pathlib import Path
from datetime import datetime
from typing import Optional


def generate_file_id() -> str:
    """Generate a unique file ID"""
    return str(uuid.uuid4())


def generate_output_filename(original_filename: str, suffix: str = "", extension: Optional[str] = None) -> str:
    """Generate output filename with optional suffix and extension change"""
    name, ext = os.path.splitext(original_filename)
    if extension:
        ext = f".{extension.lstrip('.')}"
    if suffix:
        return f"{name}_{suffix}{ext}"
    return f"{name}{ext}"


def get_file_extension(filename: str) -> str:
    """Get file extension in lowercase without dot"""
    return os.path.splitext(filename)[1].lower().lstrip('.')


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"


def get_timestamp() -> str:
    """Get current timestamp for filenames"""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def safe_filename(filename: str) -> str:
    """Make filename safe for filesystem"""
    # Remove or replace unsafe characters
    unsafe_chars = '<>:"/\\|?*'
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    return filename


def ensure_dir(path: Path) -> Path:
    """Ensure directory exists"""
    path.mkdir(parents=True, exist_ok=True)
    return path
