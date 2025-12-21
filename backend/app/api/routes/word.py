"""
Word Document Operations API Routes
"""
from fastapi import APIRouter, HTTPException, Body
from typing import List, Optional

from app.services.word_service import word_service
from app.services.file_service import get_file_path, get_file_info, register_output_file, get_download_url
from app.models.schemas import WordMergeRequest, OperationResponse, MultipleOutputResponse

router = APIRouter()


@router.get("/info/{file_id}")
async def get_word_info(file_id: str):
    """
    Get Word document information
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_info = get_file_info(file_id)
    
    try:
        doc_info = word_service.get_document_info(file_path)
        doc_info["file_id"] = file_id
        doc_info["filename"] = file_info["original_filename"]
        return doc_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading document: {str(e)}")


@router.post("/merge", response_model=OperationResponse)
async def merge_documents(request: WordMergeRequest):
    """
    Merge multiple Word documents into one
    """
    file_paths = []
    for file_id in request.file_ids:
        path = get_file_path(file_id)
        if not path or not path.exists():
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
        file_paths.append(path)
    
    try:
        output_path = word_service.merge_documents(file_paths, request.output_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Documents merged successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error merging documents: {str(e)}")


@router.post("/split", response_model=MultipleOutputResponse)
async def split_document(file_id: str = Body(...), split_by: str = Body("sections")):
    """
    Split Word document by sections
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_paths = word_service.split_by_sections(file_path)
        
        outputs = []
        for path in output_paths:
            output_info = register_output_file(path)
            outputs.append(OperationResponse(
                success=True,
                message="Split successful",
                output_file_id=output_info["file_id"],
                output_filename=output_info["original_filename"],
                download_url=get_download_url(output_info["file_id"])
            ))
        
        return MultipleOutputResponse(
            success=True,
            message=f"Document split into {len(outputs)} sections",
            outputs=outputs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error splitting document: {str(e)}")


@router.post("/extract-text")
async def extract_text(file_id: str = Body(...)):
    """
    Extract all text from Word document
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        text = word_service.extract_text(file_path)
        return {"text": text, "length": len(text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting text: {str(e)}")


@router.post("/add-header", response_model=OperationResponse)
async def add_header(file_id: str = Body(...), text: str = Body(...), align: str = Body("center")):
    """
    Add header to Word document
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path = word_service.add_header(file_path, text, align)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Header added successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding header: {str(e)}")


@router.post("/add-footer", response_model=OperationResponse)
async def add_footer(
    file_id: str = Body(...), 
    text: str = Body(...), 
    include_page_number: bool = Body(False)
):
    """
    Add footer to Word document
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path = word_service.add_footer(file_path, text, include_page_number)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Footer added successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding footer: {str(e)}")


@router.post("/watermark", response_model=OperationResponse)
async def add_watermark(file_id: str = Body(...), text: str = Body(...)):
    """
    Add watermark to Word document
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path = word_service.add_watermark(file_path, text)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Watermark added successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding watermark: {str(e)}")


@router.post("/replace-text", response_model=OperationResponse)
async def replace_text(
    file_id: str = Body(...), 
    find_text: str = Body(...), 
    replace_text: str = Body(...)
):
    """
    Find and replace text in Word document
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path = word_service.replace_text(file_path, find_text, replace_text)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Replaced '{find_text}' with '{replace_text}'",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error replacing text: {str(e)}")


@router.post("/update-styles", response_model=OperationResponse)
async def update_styles(
    file_id: str = Body(...),
    font_name: Optional[str] = Body(None),
    font_size: Optional[int] = Body(None)
):
    """
    Update document styles
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    style_updates = {}
    if font_name:
        style_updates['font_name'] = font_name
    if font_size:
        style_updates['font_size'] = font_size
    
    if not style_updates:
        raise HTTPException(status_code=400, detail="No style updates provided")
    
    try:
        output_path = word_service.update_styles(file_path, style_updates)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Styles updated successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating styles: {str(e)}")


@router.post("/orientation", response_model=OperationResponse)
async def set_orientation(file_id: str = Body(...), orientation: str = Body("portrait")):
    """
    Set page orientation
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if orientation not in ["portrait", "landscape"]:
        raise HTTPException(status_code=400, detail="Orientation must be 'portrait' or 'landscape'")
    
    try:
        output_path = word_service.set_page_orientation(file_path, orientation)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Orientation set to {orientation}",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting orientation: {str(e)}")
