"""
File Upload API Routes
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import os

from app.config import settings
from app.services.file_service import save_uploaded_file, get_file_info, get_file_path, delete_file, get_download_url
from app.services.pdf_service import pdf_service
from app.services.word_service import word_service
from app.models.schemas import FileUploadResponse, MultipleFilesUploadResponse

router = APIRouter()


def validate_file_extension(filename: str) -> bool:
    """Validate file extension"""
    ext = os.path.splitext(filename)[1].lower()
    return ext in settings.ALLOWED_EXTENSIONS


@router.post("/", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a single file
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Check file size (read in chunks to check)
    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE / (1024*1024):.0f}MB"
        )
    
    # Reset file position
    await file.seek(0)
    
    # Save file
    file_info = await save_uploaded_file(file)
    
    # Get page count for PDFs
    page_count = None
    if file_info["file_type"] == "pdf":
        try:
            pdf_info = pdf_service.get_pdf_info(get_file_path(file_info["file_id"]))
            page_count = pdf_info["page_count"]
        except Exception:
            pass
    
    return FileUploadResponse(
        file_id=file_info["file_id"],
        filename=file_info["original_filename"],
        file_type=file_info["file_type"],
        file_size=file_info["file_size"],
        page_count=page_count
    )


@router.post("/multiple", response_model=MultipleFilesUploadResponse)
async def upload_multiple_files(files: List[UploadFile] = File(...)):
    """
    Upload multiple files
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    uploaded_files = []
    
    for file in files:
        if not file.filename:
            continue
            
        if not validate_file_extension(file.filename):
            continue
        
        try:
            file_info = await save_uploaded_file(file)
            
            page_count = None
            if file_info["file_type"] == "pdf":
                try:
                    pdf_info = pdf_service.get_pdf_info(get_file_path(file_info["file_id"]))
                    page_count = pdf_info["page_count"]
                except Exception:
                    pass
            
            uploaded_files.append(FileUploadResponse(
                file_id=file_info["file_id"],
                filename=file_info["original_filename"],
                file_type=file_info["file_type"],
                file_size=file_info["file_size"],
                page_count=page_count
            ))
        except Exception as e:
            print(f"Error uploading file {file.filename}: {e}")
            continue
    
    return MultipleFilesUploadResponse(
        files=uploaded_files,
        total_count=len(uploaded_files)
    )


@router.get("/info/{file_id}")
async def get_uploaded_file_info(file_id: str):
    """
    Get information about an uploaded file
    """
    file_info = get_file_info(file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Add download URL
    file_info["download_url"] = get_download_url(file_id)
    
    return file_info


@router.delete("/{file_id}")
async def delete_uploaded_file(file_id: str):
    """
    Delete an uploaded file
    """
    success = delete_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="File not found or could not be deleted")
    
    return {"message": "File deleted successfully"}


@router.post("/download-zip")
async def download_as_zip(file_ids: List[str], zip_name: str = "files"):
    """
    Create a ZIP file from multiple files and return it for download
    """
    import zipfile
    import io
    from fastapi.responses import StreamingResponse
    
    if not file_ids:
        raise HTTPException(status_code=400, detail="No files specified")
    
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file_id in file_ids:
            file_path = get_file_path(file_id)
            if file_path and file_path.exists():
                file_info = get_file_info(file_id)
                filename = file_info.get("original_filename", file_path.name)
                zip_file.write(file_path, filename)
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_name}.zip"'
        }
    )
