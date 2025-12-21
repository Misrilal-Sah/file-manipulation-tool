"""
Pydantic models for API requests and responses
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class FileType(str, Enum):
    """Supported file types"""
    PDF = "pdf"
    DOC = "doc"
    DOCX = "docx"
    IMAGE = "image"


class OperationStatus(str, Enum):
    """Operation status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# ============ Upload Models ============

class FileUploadResponse(BaseModel):
    """Response after file upload"""
    file_id: str
    filename: str
    file_type: str
    file_size: int
    page_count: Optional[int] = None
    message: str = "File uploaded successfully"


class MultipleFilesUploadResponse(BaseModel):
    """Response for multiple file uploads"""
    files: List[FileUploadResponse]
    total_count: int


# ============ PDF Operation Models ============

class PageRange(BaseModel):
    """Page range for split operation"""
    start: int = Field(ge=1, description="Start page (1-indexed)")
    end: int = Field(ge=1, description="End page (1-indexed)")


class PdfMergeRequest(BaseModel):
    """Request to merge PDFs"""
    file_ids: List[str] = Field(min_length=2, description="List of file IDs to merge")
    output_filename: Optional[str] = "merged.pdf"
    rotations: Optional[List[int]] = Field(default=None, description="Rotation angle for each file (0, 90, 180, 270)")


class PdfSplitRequest(BaseModel):
    """Request to split PDF"""
    file_id: str
    ranges: List[PageRange] = Field(description="Page ranges to extract")
    output_prefix: Optional[str] = "split"
    merge_all: Optional[bool] = Field(default=False, description="Merge all ranges into one PDF")
    original_filename: Optional[str] = None


class PdfRotateRequest(BaseModel):
    """Request to rotate PDF pages"""
    file_id: str
    pages: List[int] = Field(default=[], description="Pages to rotate (1-indexed), empty = all pages")
    angle: int = Field(description="Rotation angle: 90, 180, or 270")
    original_filename: Optional[str] = None


class PdfDeleteRequest(BaseModel):
    """Request to delete PDF pages"""
    file_id: str
    pages: List[int] = Field(description="Pages to delete (1-indexed)")


class PdfReorderRequest(BaseModel):
    """Request to reorder PDF pages"""
    file_id: str
    new_order: List[int] = Field(description="New page order (1-indexed)")


class PdfCompressRequest(BaseModel):
    """Request to compress PDF"""
    file_id: str
    quality: int = Field(default=80, ge=10, le=100, description="Compression quality")


class PdfWatermarkRequest(BaseModel):
    """Request to add watermark"""
    file_id: str
    text: Optional[str] = None
    image_id: Optional[str] = None
    opacity: float = Field(default=0.3, ge=0.1, le=1.0)
    position: str = Field(default="center", description="center, top, bottom")
    original_filename: Optional[str] = None


class PdfEditTextRequest(BaseModel):
    """Request to edit/replace text in PDF"""
    file_id: str
    search_text: str = Field(description="Text to search for")
    replace_text: str = Field(description="Text to replace with")
    all_occurrences: bool = Field(default=True, description="Replace all occurrences or just first")
    original_filename: Optional[str] = None


class PdfRedactRequest(BaseModel):
    """Request to redact areas in PDF"""
    file_id: str
    redactions: List[dict] = Field(description="List of {page, x, y, width, height}")
    original_filename: Optional[str] = None


class PlacedFieldModel(BaseModel):
    """Model for a placed field on PDF"""
    field_type: str = Field(description="Type: signature, initials, date, name, text, stamp")
    page: int = Field(ge=1, description="Page number (1-indexed)")
    x: float = Field(description="X coordinate")
    y: float = Field(description="Y coordinate")
    width: float = Field(description="Field width")
    height: float = Field(description="Field height")
    value: Optional[str] = Field(default=None, description="Text value for text fields")
    image_data: Optional[str] = Field(default=None, description="Base64 image data for image fields")


class RedactionAreaModel(BaseModel):
    """Single area to redact in PDF"""
    page: int = Field(ge=1, description="Page number (1-indexed)")
    x: float = Field(description="X coordinate (canvas pixels)")
    y: float = Field(description="Y coordinate (canvas pixels)")
    width: float = Field(ge=1, description="Width (canvas pixels)")
    height: float = Field(ge=1, description="Height (canvas pixels)")
    text: Optional[str] = Field(None, description="Text content for display (optional)")


class PdfRedactRequest(BaseModel):
    """Request to redact areas in PDF"""
    file_id: str
    redaction_areas: List[RedactionAreaModel] = Field(description="Areas to redact")
    original_filename: Optional[str] = None


class PdfSignRequest(BaseModel):
    """Request to sign PDF with multiple fields"""
    file_id: str
    placed_fields: List[PlacedFieldModel] = Field(description="List of fields to place on PDF")
    original_filename: Optional[str] = None


class PdfAddAnnotationRequest(BaseModel):
    """Request to add annotation"""
    file_id: str
    page: int = Field(ge=1)
    annotation_type: str = Field(description="highlight, underline, strikeout, comment")
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None
    text: Optional[str] = None
    color: Optional[str] = "#FFFF00"


class PdfFillFormRequest(BaseModel):
    """Request to fill form fields"""
    file_id: str
    fields: dict = Field(description="Field name to value mapping")


# ============ Word Operation Models ============

class WordMergeRequest(BaseModel):
    """Request to merge Word documents"""
    file_ids: List[str] = Field(min_length=2)
    output_filename: Optional[str] = "merged.docx"


class WordSplitRequest(BaseModel):
    """Request to split Word document"""
    file_id: str
    split_by: str = Field(default="sections", description="sections or pages")


# ============ Conversion Models ============

class ConvertRequest(BaseModel):
    """Request to convert file format"""
    file_id: str
    target_format: str = Field(description="Target format: pdf, docx, png, jpg")
    options: Optional[dict] = None


# ============ OCR Models ============

class OcrRequest(BaseModel):
    """Request for OCR processing"""
    file_id: str
    language: str = Field(default="eng", description="OCR language code")
    create_searchable: bool = Field(default=True)


# ============ Response Models ============

class OperationResponse(BaseModel):
    """Generic operation response"""
    success: bool
    message: str
    output_file_id: Optional[str] = None
    output_filename: Optional[str] = None
    download_url: Optional[str] = None


class MultipleOutputResponse(BaseModel):
    """Response for operations with multiple outputs"""
    success: bool
    message: str
    outputs: List[OperationResponse]


class PdfInfoResponse(BaseModel):
    """PDF information response"""
    file_id: str
    filename: str
    page_count: int
    file_size: int
    is_encrypted: bool
    has_form_fields: bool
    metadata: Optional[dict] = None


class ThumbnailResponse(BaseModel):
    """Thumbnail response"""
    file_id: str
    thumbnails: List[str]  # Base64 encoded images or URLs
    page_count: int


class WarningResponse(BaseModel):
    """Warning response for protected content"""
    requires_confirmation: bool
    warning_type: str
    warning_message: str
    proceed_url: Optional[str] = None
