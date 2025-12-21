"""
File management service
"""
import os
import shutil
import aiofiles
from pathlib import Path
from typing import Optional, Dict
from fastapi import UploadFile

from app.config import settings
from app.utils.helpers import generate_file_id, get_file_extension, safe_filename


# In-memory file registry (in production, use Redis or database)
file_registry: Dict[str, dict] = {}


async def save_uploaded_file(file: UploadFile) -> dict:
    """
    Save uploaded file and return file info
    """
    file_id = generate_file_id()
    original_filename = safe_filename(file.filename or "unknown")
    extension = get_file_extension(original_filename)
    
    # Create unique filename
    stored_filename = f"{file_id}.{extension}"
    file_path = settings.UPLOAD_DIR / stored_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Store in registry
    file_info = {
        "file_id": file_id,
        "original_filename": original_filename,
        "stored_filename": stored_filename,
        "file_path": str(file_path),
        "extension": extension,
        "file_size": file_size,
        "file_type": get_file_type(extension)
    }
    file_registry[file_id] = file_info
    
    return file_info


def get_file_info(file_id: str) -> Optional[dict]:
    """Get file info by ID"""
    return file_registry.get(file_id)


def get_file_path(file_id: str) -> Optional[Path]:
    """Get file path by ID"""
    info = file_registry.get(file_id)
    if info:
        return Path(info["file_path"])
    return None


def get_file_type(extension: str) -> str:
    """Determine file type from extension"""
    extension = extension.lower()
    if extension == "pdf":
        return "pdf"
    elif extension in ["doc", "docx"]:
        return "word"
    elif extension in ["ppt", "pptx"]:
        return "powerpoint"
    elif extension in ["xls", "xlsx"]:
        return "excel"
    elif extension in ["html", "htm"]:
        return "html"
    elif extension in ["png", "jpg", "jpeg", "gif", "bmp", "tiff"]:
        return "image"
    else:
        return "unknown"


def register_output_file(file_path: Path, original_file_id: str = None, display_filename: str = None) -> dict:
    """Register an output file"""
    file_id = generate_file_id()
    filename = file_path.name
    extension = get_file_extension(filename)
    
    file_info = {
        "file_id": file_id,
        "original_filename": display_filename or filename,  # Use display_filename if provided
        "stored_filename": filename,
        "file_path": str(file_path),
        "extension": extension,
        "file_size": os.path.getsize(file_path),
        "file_type": get_file_type(extension),
        "source_file_id": original_file_id
    }
    file_registry[file_id] = file_info
    
    return file_info


def delete_file(file_id: str) -> bool:
    """Delete a file by ID"""
    info = file_registry.get(file_id)
    if info:
        try:
            os.remove(info["file_path"])
            del file_registry[file_id]
            return True
        except Exception:
            return False
    return False


def get_download_url(file_id: str) -> Optional[str]:
    """Get download URL for a file"""
    info = file_registry.get(file_id)
    if info:
        file_path = Path(info["file_path"])
        if file_path.parent == settings.UPLOAD_DIR:
            return f"/uploads/{info['stored_filename']}"
        elif file_path.parent == settings.OUTPUT_DIR:
            return f"/outputs/{info['stored_filename']}"
    return None


def cleanup_old_files(max_age_hours: int = 24):
    """Clean up files older than max_age_hours"""
    import time
    current_time = time.time()
    max_age_seconds = max_age_hours * 3600
    
    for directory in [settings.UPLOAD_DIR, settings.OUTPUT_DIR]:
        for file_path in directory.iterdir():
            if file_path.is_file():
                file_age = current_time - os.path.getmtime(file_path)
                if file_age > max_age_seconds:
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
