"""
PDF Operations API Routes
"""
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import JSONResponse
from typing import List

from app.services.pdf_service import pdf_service
from app.services.file_service import get_file_path, get_file_info, register_output_file, get_download_url
from app.models.schemas import (
    PdfMergeRequest, PdfSplitRequest, PdfRotateRequest, PdfDeleteRequest,
    PdfReorderRequest, PdfCompressRequest, PdfWatermarkRequest,
    PdfAddAnnotationRequest, PdfFillFormRequest,
    PdfEditTextRequest, PdfRedactRequest, PdfSignRequest,
    OperationResponse, MultipleOutputResponse, PdfInfoResponse, ThumbnailResponse,
    WarningResponse
)

router = APIRouter()


@router.get("/info/{file_id}", response_model=PdfInfoResponse)
async def get_pdf_info(file_id: str):
    """
    Get PDF file information
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_info = get_file_info(file_id)
    pdf_info = pdf_service.get_pdf_info(file_path)
    
    return PdfInfoResponse(
        file_id=file_id,
        filename=file_info["original_filename"],
        page_count=pdf_info["page_count"],
        file_size=pdf_info["file_size"],
        is_encrypted=pdf_info["is_encrypted"],
        has_form_fields=pdf_info["has_form_fields"],
        metadata=pdf_info["metadata"]
    )


@router.get("/thumbnails/{file_id}", response_model=ThumbnailResponse)
async def get_pdf_thumbnails(file_id: str):
    """
    Get page thumbnails for PDF
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        thumbnails = pdf_service.get_thumbnails(file_path)
        pdf_info = pdf_service.get_pdf_info(file_path)
        
        return ThumbnailResponse(
            file_id=file_id,
            thumbnails=thumbnails,
            page_count=pdf_info["page_count"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating thumbnails: {str(e)}")


@router.get("/preview/{file_id}/{page}")
async def get_page_preview(file_id: str, page: int):
    """
    Get high-quality preview of a specific page
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        preview = pdf_service.get_page_preview(file_path, page)
        return {"page": page, "preview": preview}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")


@router.post("/merge", response_model=OperationResponse)
async def merge_pdfs(request: PdfMergeRequest):
    """
    Merge multiple PDF files into one
    """
    file_paths = []
    for file_id in request.file_ids:
        path = get_file_path(file_id)
        if not path or not path.exists():
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
        file_paths.append(path)
    
    try:
        output_path = pdf_service.merge_pdfs(file_paths, request.output_filename, request.rotations)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="PDFs merged successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error merging PDFs: {str(e)}")


@router.post("/split", response_model=MultipleOutputResponse)
async def split_pdf(request: PdfSplitRequest):
    """
    Split PDF by page ranges
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Get original filename
        file_info = get_file_info(request.file_id)
        original_filename = request.original_filename or file_info.get("original_filename", "split")
        
        ranges = [(r.start, r.end) for r in request.ranges]
        output_paths = pdf_service.split_pdf(
            file_path, 
            ranges, 
            request.output_prefix,
            merge_all=request.merge_all,
            original_filename=original_filename
        )
        
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
            message=f"PDF split into {len(outputs)} file{'s' if len(outputs) > 1 else ''}",
            outputs=outputs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error splitting PDF: {str(e)}")


@router.post("/rotate", response_model=OperationResponse)
async def rotate_pages(request: PdfRotateRequest):
    """
    Rotate specific pages in PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if request.angle not in [90, 180, 270]:
        raise HTTPException(status_code=400, detail="Angle must be 90, 180, or 270")
    
    try:
        # Get file info for original filename
        file_info = get_file_info(request.file_id)
        original_filename = request.original_filename or file_info.get("original_filename")
        
        output_path = pdf_service.rotate_pages(file_path, request.pages, request.angle, original_filename)
        output_info = register_output_file(output_path)
        
        # Calculate actual pages rotated
        pages_rotated = len(request.pages) if request.pages else "all"
        
        return OperationResponse(
            success=True,
            message=f"Rotated {pages_rotated} pages by {request.angle}°",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rotating pages: {str(e)}")


@router.post("/delete", response_model=OperationResponse)
async def delete_pages(request: PdfDeleteRequest):
    """
    Delete specific pages from PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get original filename
    file_info = get_file_info(request.file_id)
    original_filename = getattr(request, 'original_filename', None) or (file_info.get("original_filename") if file_info else None)
    
    try:
        output_path = pdf_service.delete_pages(file_path, request.pages, original_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Deleted {len(request.pages)} pages",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting pages: {str(e)}")


@router.post("/reorder", response_model=OperationResponse)
async def reorder_pages(request: PdfReorderRequest):
    """
    Reorder pages in PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get original filename
    file_info = get_file_info(request.file_id)
    original_filename = getattr(request, 'original_filename', None) or (file_info.get("original_filename") if file_info else None)
    
    try:
        output_path = pdf_service.reorder_pages(file_path, request.new_order, original_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Pages organized successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reordering pages: {str(e)}")


@router.post("/compress", response_model=OperationResponse)
async def compress_pdf(request: PdfCompressRequest):
    """
    Compress PDF file
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    original_size = file_path.stat().st_size
    
    # Get original filename
    file_info = get_file_info(request.file_id)
    original_filename = file_info.get("original_filename") if file_info else None
    
    try:
        output_path = pdf_service.compress_pdf(file_path, request.quality, original_filename)
        output_info = register_output_file(output_path)
        new_size = output_path.stat().st_size
        
        reduction = ((original_size - new_size) / original_size) * 100
        
        return OperationResponse(
            success=True,
            message=f"PDF compressed. Size reduced by {reduction:.1f}%",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error compressing PDF: {str(e)}")


@router.post("/extract")
async def extract_pages(file_id: str = Body(...), pages: List[int] = Body(...), original_filename: str = Body(None)):
    """
    Extract specific pages from PDF
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get original filename if not provided
    if not original_filename:
        file_info = get_file_info(file_id)
        original_filename = file_info.get("original_filename") if file_info else None
    
    try:
        output_path = pdf_service.extract_pages(file_path, pages, original_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Extracted {len(pages)} pages",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting pages: {str(e)}")


@router.post("/watermark", response_model=OperationResponse)
async def add_watermark(request: PdfWatermarkRequest):
    """
    Add watermark to PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not request.text and not request.image_id:
        raise HTTPException(status_code=400, detail="Either text or image_id must be provided")
    
    try:
        output_path, display_filename = pdf_service.add_watermark(
            file_path, request.text or "", request.opacity, request.position, request.original_filename
        )
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message="Watermark added successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding watermark: {str(e)}")


@router.post("/remove-watermark")
async def remove_watermark(file_id: str = Body(...), confirm: bool = Body(False)):
    """
    Remove watermark from PDF (with warning)
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # If not confirmed, return warning
    if not confirm:
        return WarningResponse(
            requires_confirmation=True,
            warning_type="watermark_removal",
            warning_message="⚠️ Watermark Removal Warning:\n\nThis feature is intended for removing watermarks that you have added yourself or have permission to remove.\n\nRemoving watermarks from copyrighted or protected documents may violate copyright law.\n\nBy proceeding, you confirm that you have the right to modify this document.",
            proceed_url="/api/pdf/remove-watermark"
        )
    
    try:
        output_path, success = pdf_service.remove_watermark(file_path)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=success,
            message="Watermark removal attempted" if success else "Could not remove watermark",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing watermark: {str(e)}")


@router.post("/annotate", response_model=OperationResponse)
async def add_annotation(request: PdfAddAnnotationRequest):
    """
    Add annotation to PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        if request.annotation_type == "highlight":
            output_path = pdf_service.add_highlight(
                file_path, request.page,
                (request.x, request.y, request.x + (request.width or 100), request.y + (request.height or 20))
            )
        elif request.annotation_type == "comment":
            output_path = pdf_service.add_comment(file_path, request.page, request.text or "", (request.x, request.y))
        else:
            raise HTTPException(status_code=400, detail="Unsupported annotation type")
        
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Added {request.annotation_type} annotation",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding annotation: {str(e)}")


@router.post("/fill-form", response_model=OperationResponse)
async def fill_form(request: PdfFillFormRequest):
    """
    Fill form fields in PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path = pdf_service.fill_form(file_path, request.fields)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Form filled successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error filling form: {str(e)}")


@router.get("/form-fields/{file_id}")
async def get_form_fields(file_id: str):
    """
    Get form fields from PDF
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        fields = pdf_service.get_form_fields(file_path)
        return {"fields": fields, "count": len(fields)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting form fields: {str(e)}")


@router.post("/unlock")
async def unlock_pdf(file_id: str = Body(...), password: str = Body(...), original_filename: str = Body(None)):
    """
    Unlock password-protected PDF
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, success, display_filename = pdf_service.unlock_pdf(file_path, password, original_filename)
        
        if not success:
            raise HTTPException(status_code=401, detail="Incorrect password")
        
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message="PDF unlocked successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unlocking PDF: {str(e)}")


@router.post("/protect")
async def protect_pdf(file_id: str = Body(...), password: str = Body(...), original_filename: str = Body(None)):
    """
    Add password protection to PDF
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, display_filename = pdf_service.protect_pdf(file_path, password, original_filename=original_filename)
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message="Password protection added",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error protecting PDF: {str(e)}")


@router.post("/images-to-pdf", response_model=OperationResponse)
async def images_to_pdf(file_ids: List[str] = Body(...), output_filename: str = Body("images.pdf")):
    """
    Convert multiple images to a single PDF
    """
    file_paths = []
    for file_id in file_ids:
        file_path = get_file_path(file_id)
        if not file_path or not file_path.exists():
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
        file_paths.append(file_path)
    
    try:
        output_path = pdf_service.images_to_pdf(file_paths, output_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Converted {len(file_ids)} images to PDF",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting images: {str(e)}")


@router.post("/page-numbers", response_model=OperationResponse)
async def add_page_numbers(
    file_id: str = Body(...), 
    position: str = Body("bottom-center"),
    start_number: int = Body(1),
    format_str: str = Body("Page {n}"),
    original_filename: str = Body(None)
):
    """
    Add page numbers to PDF
    position: bottom-left, bottom-center, bottom-right, top-left, top-center, top-right
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get original filename if not provided
    if not original_filename:
        file_info = get_file_info(file_id)
        original_filename = file_info.get("original_filename") if file_info else None
    
    try:
        output_path = pdf_service.add_page_numbers(
            file_path, position, start_number, format_str, original_filename
        )
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Added page numbers to PDF",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding page numbers: {str(e)}")


@router.post("/crop", response_model=OperationResponse)
async def crop_pdf(
    file_id: str = Body(...),
    left: float = Body(0),
    top: float = Body(0),
    right: float = Body(0),
    bottom: float = Body(0),
    original_filename: str = Body(None)
):
    """
    Crop PDF pages by specifying margins to remove
    margins in points (72 points = 1 inch)
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not original_filename:
        file_info = get_file_info(file_id)
        original_filename = file_info.get("original_filename") if file_info else None
    
    margins = (left, top, right, bottom)
    
    try:
        output_path = pdf_service.crop_pdf(file_path, margins, original_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Cropped PDF with margins L:{left} T:{top} R:{right} B:{bottom}",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cropping PDF: {str(e)}")


@router.post("/repair", response_model=OperationResponse)
async def repair_pdf(
    file_id: str = Body(...),
    original_filename: str = Body(None)
):
    """
    Attempt to repair a corrupted PDF
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not original_filename:
        file_info = get_file_info(file_id)
        original_filename = file_info.get("original_filename") if file_info else None
    
    try:
        output_path = pdf_service.repair_pdf(file_path, original_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="PDF repaired successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error repairing PDF: {str(e)}")


@router.post("/rotate-individual", response_model=OperationResponse)
async def rotate_pages_individually(
    file_id: str = Body(...),
    rotations: dict = Body(...),
    original_filename: str = Body(None)
):
    """
    Rotate individual pages in PDF by specified angles.
    rotations: dict with page numbers (1-indexed) as keys and rotation angles as values (90, 180, 270)
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, display_filename = pdf_service.rotate_pages_individually(file_path, rotations, original_filename)
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message=f"Rotated {len(rotations)} pages successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rotating pages: {str(e)}")


@router.post("/add-blank-page", response_model=OperationResponse)
async def add_blank_page(
    file_id: str = Body(...),
    positions: List[int] = Body(...),
    original_filename: str = Body(None)
):
    """
    Add blank pages at the specified positions (list of 0-indexed positions).
    Position 0 = at beginning, other positions indicate "after page N"
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, display_filename = pdf_service.add_blank_pages(file_path, positions, original_filename)
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message=f"Added {len(positions)} blank page(s)",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding blank pages: {str(e)}")


@router.post("/edit-text", response_model=OperationResponse)
async def edit_pdf_text(request: PdfEditTextRequest):
    """
    Search and replace text in PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, display_filename = pdf_service.edit_pdf_text(
            file_path, request.search_text, request.replace_text, 
            request.all_occurrences, request.original_filename
        )
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message="Text replaced successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error editing PDF text: {str(e)}")




@router.post("/sign", response_model=OperationResponse)
async def sign_pdf(request: PdfSignRequest):
    """
    Add multiple fields (signatures, dates, text, stamps) to PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    try:
        # Convert placed fields to dict format
        fields_data = [field.dict() for field in request.placed_fields]
        
        # Debug: Log received fields
        print(f"\n=== SIGN PDF DEBUG ===")
        print(f"Number of fields received: {len(request.placed_fields)}")
        for i, field in enumerate(fields_data):
            print(f"Field {i+1}: type={field.get('field_type')}, page={field.get('page')}")
            print(f"  Coords: x={field.get('x')}, y={field.get('y')}, w={field.get('width')}, h={field.get('height')}")
            print(f"  Value: {field.get('value')[:50] if field.get('value') else None}")
            print(f"  Has image_data: {bool(field.get('image_data'))}")
        
        output_path, display_filename = pdf_service.sign_pdf(
            file_path,
            fields_data,
            request.original_filename
        )
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        field_count = len(request.placed_fields)
        return OperationResponse(
            success=True,
            message=f"PDF signed with {field_count} field(s)",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error signing PDF: {str(e)}")

@router.post("/redact", response_model=OperationResponse)
async def redact_pdf(request: PdfRedactRequest):
    """
    Permanently redact (black out) specified areas in PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not request.redaction_areas:
        raise HTTPException(status_code=400, detail="No redaction areas specified")
    
    try:
        # Convert Pydantic models to dicts
        areas_dicts = [area.model_dump() for area in request.redaction_areas]
        
        output_path, display_filename = pdf_service.redact_pdf(
            file_path,
            areas_dicts,
            request.original_filename
        )
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message=f"PDF redacted successfully ({len(request.redaction_areas)} area(s))",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error redacting PDF: {str(e)}")


