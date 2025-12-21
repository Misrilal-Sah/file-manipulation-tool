"""
Document Conversion API Routes
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional

from app.services.convert_service import convert_service
from app.services.ocr_service import ocr_service
from app.services.file_service import get_file_path, get_file_info, register_output_file, get_download_url
from app.models.schemas import ConvertRequest, OcrRequest, OperationResponse, MultipleOutputResponse

router = APIRouter()


@router.get("/capabilities")
async def get_conversion_capabilities():
    """
    Get available conversion capabilities
    """
    return convert_service.get_supported_conversions()


class WordToPdfRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None


@router.post("/word-to-pdf", response_model=OperationResponse)
async def convert_word_to_pdf(request: WordToPdfRequest):
    """
    Convert Word document to PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_info = get_file_info(request.file_id)
    if file_info["file_type"] != "word":
        raise HTTPException(status_code=400, detail="File is not a Word document")
    
    try:
        output_path, success = convert_service.word_to_pdf_libreoffice(file_path, request.original_filename)
        
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Conversion failed. Please ensure LibreOffice is installed."
            )
        
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Converted to PDF successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting to PDF: {str(e)}")


class PdfToWordRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None


@router.post("/pdf-to-word", response_model=OperationResponse)
async def convert_pdf_to_word(request: PdfToWordRequest):
    """
    Convert PDF to Word document
    Note: This uses basic text extraction. Complex layouts may not be preserved.
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    file_info = get_file_info(request.file_id)
    if file_info["file_type"] != "pdf":
        raise HTTPException(status_code=400, detail="File is not a PDF")
    
    try:
        output_path = convert_service.pdf_to_word_basic(file_path, request.original_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Converted to Word successfully (text extracted)",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting to Word: {str(e)}")


@router.post("/pdf-to-images", response_model=MultipleOutputResponse)
async def convert_pdf_to_images(
    file_id: str = Body(...),
    dpi: int = Body(200),
    image_format: str = Body("png"),
    original_filename: str = Body(None)
):
    """
    Convert PDF pages to images
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if image_format not in ["png", "jpg", "jpeg"]:
        raise HTTPException(status_code=400, detail="Format must be 'png' or 'jpg'")
    
    try:
        output_results = convert_service.pdf_to_images(file_path, dpi, image_format, original_filename)
        
        outputs = []
        for storage_path, display_filename in output_results:
            output_info = register_output_file(storage_path, display_filename=display_filename)
            outputs.append(OperationResponse(
                success=True,
                message="Conversion successful",
                output_file_id=output_info["file_id"],
                output_filename=output_info["original_filename"],
                download_url=get_download_url(output_info["file_id"])
            ))
        
        return MultipleOutputResponse(
            success=True,
            message=f"Converted {len(outputs)} pages to images",
            outputs=outputs
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting to images: {str(e)}")


@router.post("/images-to-pdf", response_model=OperationResponse)
async def convert_images_to_pdf(file_ids: List[str] = Body(...)):
    """
    Combine multiple images into a PDF
    """
    file_paths = []
    for file_id in file_ids:
        path = get_file_path(file_id)
        if not path or not path.exists():
            raise HTTPException(status_code=404, detail=f"File {file_id} not found")
        file_paths.append(path)
    
    try:
        output_path = convert_service.images_to_pdf(file_paths)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message=f"Combined {len(file_paths)} images into PDF",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating PDF: {str(e)}")


# ============ OCR Endpoints ============

@router.get("/ocr/status")
async def get_ocr_status():
    """
    Check if OCR is available
    """
    return {
        "available": ocr_service.is_available(),
        "languages": ocr_service.get_ocr_languages() if ocr_service.is_available() else []
    }


@router.post("/ocr/extract")
async def ocr_extract_text(file_id: str = Body(...), language: str = Body("eng")):
    """
    Extract text from scanned PDF/image using OCR
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not ocr_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="OCR is not available. Please install Tesseract OCR."
        )
    
    file_info = get_file_info(file_id)
    
    try:
        if file_info["file_type"] == "pdf":
            text = ocr_service.ocr_pdf(file_path, language)
        elif file_info["file_type"] == "image":
            text = ocr_service.ocr_image(file_path, language)
        else:
            raise HTTPException(status_code=400, detail="File must be PDF or image")
        
        return {"text": text, "length": len(text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {str(e)}")


@router.post("/ocr/searchable-pdf", response_model=OperationResponse)
async def create_searchable_pdf(file_id: str = Body(...), language: str = Body("eng")):
    """
    Create searchable PDF from scanned PDF
    """
    file_path = get_file_path(file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not ocr_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="OCR is not available. Please install Tesseract OCR."
        )
    
    try:
        output_path = ocr_service.create_searchable_pdf(file_path, language)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Created searchable PDF",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {str(e)}")


class OcrPdfRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None
    language: str = "eng"


@router.post("/ocr", response_model=OperationResponse)
async def ocr_pdf(request: OcrPdfRequest):
    """
    Make PDF searchable using OCR (simple endpoint)
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not ocr_service.is_available():
        raise HTTPException(
            status_code=503, 
            detail="OCR is not available. Please install Tesseract OCR."
        )
    
    try:
        output_path = ocr_service.create_searchable_pdf(file_path, request.language, request.original_filename)
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="PDF processed with OCR successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR error: {str(e)}")


class PptToPdfRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None


@router.post("/ppt-to-pdf", response_model=OperationResponse)
async def convert_ppt_to_pdf(request: PptToPdfRequest):
    """
    Convert PowerPoint presentation to PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, success = convert_service.powerpoint_to_pdf(file_path, request.original_filename)
        
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Conversion failed. Please ensure LibreOffice is installed."
            )
        
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Converted PowerPoint to PDF successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting PowerPoint: {str(e)}")


class ExcelToPdfRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None


@router.post("/excel-to-pdf", response_model=OperationResponse)
async def convert_excel_to_pdf(request: ExcelToPdfRequest):
    """
    Convert Excel spreadsheet to PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, success = convert_service.excel_to_pdf(file_path, request.original_filename)
        
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Conversion failed. Please ensure LibreOffice is installed."
            )
        
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Converted Excel to PDF successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting Excel: {str(e)}")


class HtmlToPdfRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None


@router.post("/html-to-pdf", response_model=OperationResponse)
async def convert_html_to_pdf(request: HtmlToPdfRequest):
    """
    Convert HTML file to PDF
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, success = convert_service.html_to_pdf(file_path, request.original_filename)
        
        if not success:
            raise HTTPException(
                status_code=500, 
                detail="Conversion failed. Please ensure LibreOffice is installed."
            )
        
        output_info = register_output_file(output_path)
        
        return OperationResponse(
            success=True,
            message="Converted HTML to PDF successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting HTML: {str(e)}")


class PdfToPptRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None


@router.post("/pdf-to-ppt", response_model=OperationResponse)
async def convert_pdf_to_ppt(request: PdfToPptRequest):
    """
    Convert PDF to PowerPoint presentation (each page becomes a slide with embedded image)
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, display_filename = convert_service.pdf_to_powerpoint(file_path, request.original_filename)
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message="Converted PDF to PowerPoint successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting to PowerPoint: {str(e)}")


class PdfToExcelRequest(BaseModel):
    file_id: str
    original_filename: Optional[str] = None


@router.post("/pdf-to-excel", response_model=OperationResponse)
async def convert_pdf_to_excel(request: PdfToExcelRequest):
    """
    Convert PDF to Excel spreadsheet (extracts text/tables)
    """
    file_path = get_file_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        output_path, display_filename = convert_service.pdf_to_excel(file_path, request.original_filename)
        output_info = register_output_file(output_path, display_filename=display_filename)
        
        return OperationResponse(
            success=True,
            message="Converted PDF to Excel successfully",
            output_file_id=output_info["file_id"],
            output_filename=output_info["original_filename"],
            download_url=get_download_url(output_info["file_id"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error converting to Excel: {str(e)}")

