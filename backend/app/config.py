"""
Document File Manipulation Tool - Backend Configuration
"""
import os
import platform
from pydantic_settings import BaseSettings
from pathlib import Path


def get_libreoffice_path() -> str:
    """Auto-detect LibreOffice path based on OS"""
    # Check environment variable first (for Docker)
    env_path = os.environ.get("LIBREOFFICE_PATH")
    if env_path:
        return env_path
    
    if platform.system() == "Windows":
        paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
    else:  # Linux/Docker
        paths = [
            "/usr/bin/soffice",
            "/usr/bin/libreoffice",
            "/opt/libreoffice/program/soffice",
        ]
    
    for path in paths:
        if os.path.exists(path):
            return path
    return paths[0]  # Return default


def get_tesseract_path() -> str:
    """Auto-detect Tesseract path based on OS"""
    # Check environment variable first (for Docker)
    env_path = os.environ.get("TESSERACT_PATH")
    if env_path:
        return env_path
    
    if platform.system() == "Windows":
        paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]
    else:  # Linux/Docker
        paths = [
            "/usr/bin/tesseract",
        ]
    
    for path in paths:
        if os.path.exists(path):
            return path
    return paths[0]  # Return default


class Settings(BaseSettings):
    """Application settings"""
    
    # App info
    APP_NAME: str = "Document File Manipulation Tool"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # File settings
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: list = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".html", ".htm", ".png", ".jpg", ".jpeg", ".gif", ".bmp"]
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    OUTPUT_DIR: Path = BASE_DIR / "outputs"
    
    # LibreOffice path (auto-detected)
    LIBREOFFICE_PATH: str = get_libreoffice_path()
    
    # OCR settings (auto-detected)
    TESSERACT_PATH: str = get_tesseract_path()
    
    # Compression settings
    PDF_COMPRESSION_QUALITY: int = 80  # 0-100
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

