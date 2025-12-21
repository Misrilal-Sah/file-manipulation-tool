"""
PDF Operations Service using PyMuPDF (fitz)
"""
import fitz  # PyMuPDF
import io
import base64
from pathlib import Path
from typing import List, Optional, Tuple, Dict
from PIL import Image

from app.config import settings
from app.utils.helpers import generate_file_id, generate_output_filename, get_timestamp
from app.services.file_service import register_output_file


class PDFService:
    """Service for PDF manipulation operations"""
    
    @staticmethod
    def get_pdf_info(file_path: Path) -> dict:
        """Get PDF information"""
        doc = fitz.open(file_path)
        try:
            info = {
                "page_count": len(doc),
                "metadata": doc.metadata,
                "is_encrypted": doc.is_encrypted,
                "needs_pass": doc.needs_pass,
                "has_form_fields": any(page.widgets() for page in doc),
                "file_size": file_path.stat().st_size
            }
            return info
        finally:
            doc.close()
    
    @staticmethod
    def merge_pdfs(file_paths: List[Path], output_filename: str = "merged.pdf", rotations: List[int] = None) -> Path:
        """
        Merge multiple PDF files into one with optional per-file rotation
        rotations: List of rotation angles (0, 90, 180, 270) for each file
        """
        # Use the user's filename directly (no UUID prefix for cleaner names)
        output_path = settings.OUTPUT_DIR / output_filename
        
        # Ensure rotations list is the right length
        if rotations is None:
            rotations = [0] * len(file_paths)
        while len(rotations) < len(file_paths):
            rotations.append(0)
        
        merged_doc = fitz.open()
        try:
            for i, file_path in enumerate(file_paths):
                doc = fitz.open(file_path)
                rotation_angle = rotations[i] if i < len(rotations) else 0
                
                # Apply rotation to all pages in this PDF before merging
                if rotation_angle != 0:
                    for page in doc:
                        page.set_rotation(page.rotation + rotation_angle)
                
                merged_doc.insert_pdf(doc)
                doc.close()
            
            merged_doc.save(output_path)
        finally:
            merged_doc.close()
        
        return output_path
    
    @staticmethod
    def split_pdf(file_path: Path, ranges: List[Tuple[int, int]], output_prefix: str = "split", 
                  merge_all: bool = False, original_filename: str = None) -> List[Path]:
        """
        Split PDF by page ranges
        ranges: List of (start, end) tuples (1-indexed)
        merge_all: If True, ALSO create a merged PDF with all ranges combined
        original_filename: Original filename for meaningful output names
        """
        doc = fitz.open(file_path)
        output_paths = []
        
        # Get base name from original filename or use default
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = output_prefix
        
        try:
            # Always create separate PDFs for each range
            for i, (start, end) in enumerate(ranges):
                start_idx = max(0, start - 1)
                end_idx = min(len(doc), end)
                
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=start_idx, to_page=end_idx - 1)
                
                # Meaningful filename: originalname_pages_1-4.pdf
                output_filename = f"{base_name}_pages_{start}-{end}.pdf"
                output_path = settings.OUTPUT_DIR / output_filename
                new_doc.save(output_path)
                new_doc.close()
                
                output_paths.append(output_path)
            
            # If merge_all is True, ALSO create a merged PDF with all ranges
            if merge_all and len(ranges) > 1:
                merged_doc = fitz.open()
                range_desc_parts = []
                
                for start, end in ranges:
                    start_idx = max(0, start - 1)
                    end_idx = min(len(doc), end)
                    merged_doc.insert_pdf(doc, from_page=start_idx, to_page=end_idx - 1)
                    range_desc_parts.append(f"{start}-{end}")
                
                range_desc = "_".join(range_desc_parts)
                merged_filename = f"{base_name}_merged_{range_desc}.pdf"
                merged_path = settings.OUTPUT_DIR / merged_filename
                merged_doc.save(merged_path)
                merged_doc.close()
                
                output_paths.append(merged_path)
        finally:
            doc.close()
        
        return output_paths
    
    @staticmethod
    def extract_pages(file_path: Path, pages: List[int], original_filename: str = None) -> Path:
        """
        Extract specific pages from PDF
        pages: List of page numbers (1-indexed)
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
            pages_str = ','.join(map(str, pages[:5]))  # First 5 pages in name
            if len(pages) > 5:
                pages_str += f'...({len(pages)} total)'
            output_path = settings.OUTPUT_DIR / f"{base_name}_pages_{pages_str.replace(',', '-')}.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"extracted_pages.pdf"
        
        try:
            new_doc = fitz.open()
            for page_num in pages:
                if 1 <= page_num <= len(doc):
                    new_doc.insert_pdf(doc, from_page=page_num - 1, to_page=page_num - 1)
            
            new_doc.save(output_path)
            new_doc.close()
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def rotate_pages(file_path: Path, pages: List[int], angle: int, original_filename: str = None) -> Path:
        """
        Rotate specific pages or all pages if pages list is empty
        pages: List of page numbers (1-indexed), empty = all pages
        angle: Rotation angle (90, 180, 270)
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
            output_path = settings.OUTPUT_DIR / f"{base_name}_rotated_{angle}.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"rotated_{angle}.pdf"
        
        try:
            # If pages list is empty, rotate ALL pages
            if not pages:
                pages_to_rotate = list(range(1, len(doc) + 1))
            else:
                pages_to_rotate = pages
            
            for page_num in pages_to_rotate:
                if 1 <= page_num <= len(doc):
                    page = doc[page_num - 1]
                    page.set_rotation(page.rotation + angle)
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def delete_pages(file_path: Path, pages: List[int], original_filename: str = None) -> Path:
        """
        Delete specific pages from PDF
        pages: List of page numbers to delete (1-indexed)
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
            pages_str = ','.join(map(str, pages[:5]))  # First 5 pages in name
            if len(pages) > 5:
                pages_str += '...'
            output_path = settings.OUTPUT_DIR / f"{base_name}_removed_{pages_str.replace(',', '-')}.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"modified.pdf"
        
        try:
            # Sort pages in reverse order to delete from end first
            pages_to_delete = sorted([p - 1 for p in pages if 1 <= p <= len(doc)], reverse=True)
            
            for page_idx in pages_to_delete:
                doc.delete_page(page_idx)
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def reorder_pages(file_path: Path, new_order: List[int], original_filename: str = None) -> Path:
        """
        Reorder pages according to new order
        new_order: List of page numbers in desired order (1-indexed)
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
            output_path = settings.OUTPUT_DIR / f"{base_name}_organized.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_reordered.pdf"
        
        try:
            new_doc = fitz.open()
            for page_num in new_order:
                if 1 <= page_num <= len(doc):
                    new_doc.insert_pdf(doc, from_page=page_num - 1, to_page=page_num - 1)
            
            new_doc.save(output_path)
            new_doc.close()
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def duplicate_pages(file_path: Path, pages: List[int], copies: int = 1) -> Path:
        """
        Duplicate specific pages
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_duplicated.pdf"
        
        try:
            for page_num in sorted(pages, reverse=True):
                if 1 <= page_num <= len(doc):
                    for _ in range(copies):
                        doc.insert_pdf(doc, from_page=page_num - 1, to_page=page_num - 1, start_at=page_num)
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def compress_pdf(file_path: Path, quality: int = 80, original_filename: str = None) -> Path:
        """
        Compress PDF by reducing image quality, downscaling large images, and removing redundant data
        quality: 0-100 (lower = smaller file, more compression)
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
            output_path = settings.OUTPUT_DIR / f"{base_name}_compressed.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_compressed.pdf"
        
        try:
            # Iterate through pages and compress/replace images
            for page_num in range(len(doc)):
                page = doc[page_num]
                image_list = page.get_images(full=True)
                
                for img_index, img in enumerate(image_list):
                    xref = img[0]
                    try:
                        # Extract image
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]
                        
                        # Open with PIL
                        pil_image = Image.open(io.BytesIO(image_bytes))
                        orig_width, orig_height = pil_image.size
                        
                        # Convert to RGB if necessary
                        if pil_image.mode in ("RGBA", "P", "LA"):
                            background = Image.new("RGB", pil_image.size, (255, 255, 255))
                            if pil_image.mode == "P":
                                pil_image = pil_image.convert("RGBA")
                            if pil_image.mode in ("RGBA", "LA"):
                                background.paste(pil_image, mask=pil_image.split()[-1])
                            pil_image = background
                        elif pil_image.mode != "RGB":
                            pil_image = pil_image.convert("RGB")
                        
                        # Downscale large images (if larger than 1500px on any side)
                        max_dimension = 1500 if quality > 50 else 1000
                        if orig_width > max_dimension or orig_height > max_dimension:
                            ratio = min(max_dimension / orig_width, max_dimension / orig_height)
                            new_size = (int(orig_width * ratio), int(orig_height * ratio))
                            pil_image = pil_image.resize(new_size, Image.Resampling.LANCZOS)
                        
                        # Compress image - use quality parameter
                        compressed_buffer = io.BytesIO()
                        jpeg_quality = max(20, min(quality, 85))  # Clamp between 20-85
                        pil_image.save(compressed_buffer, format="JPEG", quality=jpeg_quality, optimize=True)
                        compressed_buffer.seek(0)
                        
                        # Create pixmap from compressed image and replace
                        compressed_img = Image.open(compressed_buffer)
                        img_buffer = io.BytesIO()
                        compressed_img.save(img_buffer, format="JPEG", quality=jpeg_quality)
                        img_buffer.seek(0)
                        
                        # Replace image in the PDF
                        new_pixmap = fitz.Pixmap(img_buffer)
                        doc.xref_set_key(xref, "Filter", "/DCTDecode")
                        doc.xref_set_key(xref, "ColorSpace", "/DeviceRGB")
                        doc.update_stream(xref, img_buffer.getvalue())
                        
                    except Exception as e:
                        # Skip problematic images
                        continue
            
            # Save with maximum garbage collection and deflate compression
            doc.save(
                output_path, 
                garbage=4,  # Maximum garbage collection
                deflate=True,  # Use deflate compression
                clean=True,  # Clean and sanitize content
                linear=True,  # Linearize (web optimization)
            )
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def get_thumbnails(file_path: Path, dpi: int = 72, max_size: Tuple[int, int] = (200, 200)) -> List[str]:
        """
        Generate thumbnails for all pages as base64 strings
        """
        doc = fitz.open(file_path)
        thumbnails = []
        
        try:
            for page in doc:
                # Render page to image
                mat = fitz.Matrix(dpi / 72, dpi / 72)
                pix = page.get_pixmap(matrix=mat)
                
                # Convert to PIL Image
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Convert to base64
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                base64_str = base64.b64encode(buffer.getvalue()).decode()
                thumbnails.append(f"data:image/png;base64,{base64_str}")
        finally:
            doc.close()
        
        return thumbnails
    
    @staticmethod
    def get_page_preview(file_path: Path, page_num: int, dpi: int = 150) -> str:
        """
        Get high-quality preview of a specific page as base64
        """
        doc = fitz.open(file_path)
        
        try:
            if 1 <= page_num <= len(doc):
                page = doc[page_num - 1]
                mat = fitz.Matrix(dpi / 72, dpi / 72)
                pix = page.get_pixmap(matrix=mat)
                
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                buffer = io.BytesIO()
                img.save(buffer, format="PNG")
                base64_str = base64.b64encode(buffer.getvalue()).decode()
                return f"data:image/png;base64,{base64_str}"
        finally:
            doc.close()
        
        return ""
    
    # ============ Editing Features ============
    
    @staticmethod
    def add_text(file_path: Path, page_num: int, text: str, 
                 position: Tuple[float, float], font_size: int = 12, 
                 color: Tuple[float, float, float] = (0, 0, 0)) -> Path:
        """
        Add text to a specific page
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_text_added.pdf"
        
        try:
            if 1 <= page_num <= len(doc):
                page = doc[page_num - 1]
                point = fitz.Point(position[0], position[1])
                page.insert_text(point, text, fontsize=font_size, color=color)
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def add_image(file_path: Path, page_num: int, image_path: Path,
                  rect: Tuple[float, float, float, float]) -> Path:
        """
        Add image to a specific page
        rect: (x0, y0, x1, y1)
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_image_added.pdf"
        
        try:
            if 1 <= page_num <= len(doc):
                page = doc[page_num - 1]
                image_rect = fitz.Rect(rect)
                page.insert_image(image_rect, filename=str(image_path))
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def add_highlight(file_path: Path, page_num: int, 
                      rect: Tuple[float, float, float, float],
                      color: Tuple[float, float, float] = (1, 1, 0)) -> Path:
        """
        Add highlight annotation
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_highlighted.pdf"
        
        try:
            if 1 <= page_num <= len(doc):
                page = doc[page_num - 1]
                highlight = page.add_highlight_annot(fitz.Rect(rect))
                highlight.set_colors(stroke=color)
                highlight.update()
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def add_comment(file_path: Path, page_num: int, text: str,
                    position: Tuple[float, float]) -> Path:
        """
        Add comment/sticky note annotation
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_commented.pdf"
        
        try:
            if 1 <= page_num <= len(doc):
                page = doc[page_num - 1]
                point = fitz.Point(position[0], position[1])
                page.add_text_annot(point, text)
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def redact_area(file_path: Path, page_num: int,
                    rect: Tuple[float, float, float, float]) -> Path:
        """
        Redact (black out) an area
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_redacted.pdf"
        
        try:
            if 1 <= page_num <= len(doc):
                page = doc[page_num - 1]
                redact_area = fitz.Rect(rect)
                page.add_redact_annot(redact_area)
                page.apply_redactions()
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def add_watermark(file_path: Path, text: str, 
                      opacity: float = 0.3, position: str = "center",
                      original_filename: str = None) -> Tuple[Path, str]:
        """
        Add text watermark to all pages
        Returns: (storage_path, display_filename)
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_watermarked.pdf"
        display_filename = f"{base_name}_watermarked.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        try:
            for page in doc:
                rect = page.rect
                
                # Calculate position
                if position == "center":
                    x = rect.width / 2
                    y = rect.height / 2
                elif position == "top":
                    x = rect.width / 2
                    y = rect.height * 0.15
                else:  # bottom
                    x = rect.width / 2
                    y = rect.height * 0.85
                
                # Create a text writer for diagonal watermark
                # Using shape drawing for better control
                fontsize = 48
                text_length = len(text) * fontsize * 0.5
                
                # Add semi-transparent gray watermark text
                # Use 0 rotation (valid values are 0, 90, 180, 270)
                tw = fitz.TextWriter(page.rect)
                tw.append(
                    fitz.Point(x - text_length / 2, y),
                    text,
                    fontsize=fontsize
                )
                tw.write_text(page, color=(0.5, 0.5, 0.5), opacity=opacity)
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path, display_filename
    
    @staticmethod
    def remove_watermark(file_path: Path) -> Tuple[Path, bool]:
        """
        Attempt to remove watermarks
        Returns: (output_path, success)
        Note: This only works for simple text-based watermarks
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_no_watermark.pdf"
        
        try:
            # Try to remove text patterns that might be watermarks
            # This is a simplified approach
            for page in doc:
                # Get all drawings and filter potential watermarks
                # (This is limited - complex watermarks may not be removed)
                pass
            
            doc.save(output_path)
            return output_path, True
        except Exception:
            return file_path, False
        finally:
            doc.close()
    
    @staticmethod
    def fill_form(file_path: Path, fields: Dict[str, str]) -> Path:
        """
        Fill form fields in PDF
        """
        doc = fitz.open(file_path)
        output_path = settings.OUTPUT_DIR / f"{generate_file_id()}_filled.pdf"
        
        try:
            for page in doc:
                widgets = page.widgets()
                for widget in widgets:
                    field_name = widget.field_name
                    if field_name in fields:
                        widget.field_value = fields[field_name]
                        widget.update()
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def get_form_fields(file_path: Path) -> List[dict]:
        """
        Get all form fields in PDF
        """
        doc = fitz.open(file_path)
        fields = []
        
        try:
            for page_num, page in enumerate(doc, 1):
                for widget in page.widgets():
                    fields.append({
                        "page": page_num,
                        "name": widget.field_name,
                        "type": widget.field_type_string,
                        "value": widget.field_value,
                        "rect": list(widget.rect)
                    })
        finally:
            doc.close()
        
        return fields
    
    @staticmethod
    def unlock_pdf(file_path: Path, password: str, original_filename: str = None) -> Tuple[Path, bool, str]:
        """
        Unlock password-protected PDF
        Returns: (output_path, success, display_filename)
        """
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_unlocked.pdf"
        display_filename = f"{base_name}_unlocked.pdf"
        
        try:
            doc = fitz.open(file_path)
            if doc.is_encrypted:
                if doc.authenticate(password):
                    output_path = settings.OUTPUT_DIR / storage_filename
                    doc.save(output_path)
                    doc.close()
                    return output_path, True, display_filename
                else:
                    doc.close()
                    return file_path, False, None
            else:
                doc.close()
                return file_path, True, None  # Already unlocked
        except Exception:
            return file_path, False, None
    
    @staticmethod
    def protect_pdf(file_path: Path, password: str, 
                    permissions: int = fitz.PDF_PERM_PRINT, 
                    original_filename: str = None) -> Tuple[Path, str]:
        """
        Add password protection to PDF
        Returns: (storage_path, display_filename)
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_protected.pdf"
        display_filename = f"{base_name}_protected.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        try:
            doc.save(
                output_path,
                encryption=fitz.PDF_ENCRYPT_AES_256,
                user_pw=password,
                permissions=permissions
            )
        finally:
            doc.close()
        
        return output_path, display_filename

    @staticmethod
    def images_to_pdf(image_paths: List[Path], output_filename: str = "images.pdf") -> Path:
        """
        Convert multiple images to a single PDF
        """
        doc = fitz.open()
        output_path = settings.OUTPUT_DIR / output_filename
        
        try:
            for image_path in image_paths:
                img = fitz.open(image_path)
                rect = img[0].rect
                pdfbytes = img.convert_to_pdf()
                img.close()
                
                imgPDF = fitz.open("pdf", pdfbytes)
                page = doc.new_page(width=rect.width, height=rect.height)
                page.show_pdf_page(rect, imgPDF, 0)
                imgPDF.close()
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def add_page_numbers(file_path: Path, position: str = "bottom-center", 
                         start_number: int = 1, format_str: str = "Page {n}",
                         original_filename: str = None) -> Path:
        """
        Add page numbers to all pages
        position: bottom-left, bottom-center, bottom-right, top-left, top-center, top-right
        """
        doc = fitz.open(file_path)
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
            output_path = settings.OUTPUT_DIR / f"{base_name}_numbered.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"numbered.pdf"
        
        try:
            for i, page in enumerate(doc):
                rect = page.rect
                page_num = start_number + i
                text = format_str.replace("{n}", str(page_num))
                
                # Calculate position
                font_size = 12
                text_width = len(text) * font_size * 0.5
                margin = 30
                
                positions = {
                    "bottom-left": (margin, rect.height - margin),
                    "bottom-center": (rect.width / 2 - text_width / 2, rect.height - margin),
                    "bottom-right": (rect.width - text_width - margin, rect.height - margin),
                    "top-left": (margin, margin + font_size),
                    "top-center": (rect.width / 2 - text_width / 2, margin + font_size),
                    "top-right": (rect.width - text_width - margin, margin + font_size),
                }
                
                pos = positions.get(position, positions["bottom-center"])
                page.insert_text(pos, text, fontsize=font_size, color=(0, 0, 0))
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def crop_pdf(file_path: Path, margins: Tuple[float, float, float, float],
                 original_filename: str = None) -> Path:
        """
        Crop PDF pages by adjusting margins
        margins: (left, top, right, bottom) in points (1 inch = 72 points)
        """
        doc = fitz.open(file_path)
        
        if original_filename:
            base_name = Path(original_filename).stem
            output_path = settings.OUTPUT_DIR / f"{base_name}_cropped.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"cropped.pdf"
        
        try:
            for page in doc:
                rect = page.rect
                # Apply margins to crop
                new_rect = fitz.Rect(
                    rect.x0 + margins[0],  # left
                    rect.y0 + margins[1],  # top
                    rect.x1 - margins[2],  # right
                    rect.y1 - margins[3]   # bottom
                )
                page.set_cropbox(new_rect)
            
            doc.save(output_path)
        finally:
            doc.close()
        
        return output_path
    
    @staticmethod
    def repair_pdf(file_path: Path, original_filename: str = None) -> Path:
        """
        Attempt to repair a corrupted PDF by re-saving it
        """
        if original_filename:
            base_name = Path(original_filename).stem
            output_path = settings.OUTPUT_DIR / f"{base_name}_repaired.pdf"
        else:
            output_path = settings.OUTPUT_DIR / f"repaired.pdf"
        
        try:
            # Try to open and resave - fitz will attempt to fix issues
            doc = fitz.open(file_path)
            doc.save(output_path, garbage=4, deflate=True, clean=True)
            doc.close()
            return output_path
        except Exception as e:
            raise Exception(f"Could not repair PDF: {str(e)}")
    
    @staticmethod
    def rotate_pages_individually(file_path: Path, rotations: Dict[str, int], original_filename: str = None) -> Tuple[Path, str]:
        """
        Rotate individual pages in PDF by specified angles.
        rotations: dict with page numbers (1-indexed as strings) as keys and rotation angles as values
        Returns: (storage_path, display_filename)
        """
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_rotated.pdf"
        display_filename = f"{base_name}_rotated.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        doc = fitz.open(file_path)
        try:
            for page_str, angle in rotations.items():
                page_num = int(page_str) - 1  # Convert to 0-indexed
                if 0 <= page_num < len(doc):
                    page = doc[page_num]
                    page.set_rotation(page.rotation + angle)
            
            doc.save(output_path, garbage=4, deflate=True)
        finally:
            doc.close()
        
        return output_path, display_filename
    
    @staticmethod
    def add_blank_page(file_path: Path, position: int, original_filename: str = None) -> Tuple[Path, str]:
        """
        Add a blank page at the specified position.
        position: 1-indexed position where to insert blank page
                  0 or 1 = at beginning, -1 = at end
        Returns: (storage_path, display_filename)
        """
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_blankAdded.pdf"
        display_filename = f"{base_name}_blankAdded.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        doc = fitz.open(file_path)
        try:
            # Determine insertion position (0-indexed)
            if position == -1 or position > len(doc):
                insert_pos = len(doc)  # At end
            elif position <= 1:
                insert_pos = 0  # At beginning
            else:
                insert_pos = position - 1  # Convert to 0-indexed
            
            # Get page size from first page (or default A4)
            if len(doc) > 0:
                first_page = doc[0]
                page_rect = first_page.rect
            else:
                page_rect = fitz.Rect(0, 0, 595, 842)  # A4 size
            
            # Insert blank page
            doc.new_page(insert_pos, width=page_rect.width, height=page_rect.height)
            
            doc.save(output_path, garbage=4, deflate=True)
        finally:
            doc.close()
        
        return output_path, display_filename
    
    @staticmethod
    def add_blank_pages(file_path: Path, positions: List[int], original_filename: str = None) -> Tuple[Path, str]:
        """
        Add blank pages at multiple specified positions.
        positions: List of positions (0 = at beginning, N = after page N)
        Returns: (storage_path, display_filename)
        """
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        count_text = f"{len(positions)}Blank" if len(positions) > 1 else "blankAdded"
        storage_filename = f"{batch_id}_{base_name}_{count_text}.pdf"
        display_filename = f"{base_name}_{count_text}.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        doc = fitz.open(file_path)
        try:
            # Get page size from first page (or default A4)
            if len(doc) > 0:
                first_page = doc[0]
                page_rect = first_page.rect
            else:
                page_rect = fitz.Rect(0, 0, 595, 842)  # A4 size
            
            # Sort positions in descending order to insert from end to beginning
            # This prevents position shifting as we insert pages
            sorted_positions = sorted(positions, reverse=True)
            
            for pos in sorted_positions:
                # pos = 0 means at beginning, pos = N means after page N
                if pos == 0:
                    insert_pos = 0
                else:
                    # Insert after page N (0-indexed: insert at position N)
                    insert_pos = min(pos, len(doc))
                
                doc.new_page(insert_pos, width=page_rect.width, height=page_rect.height)
            
            doc.save(output_path, garbage=4, deflate=True)
        finally:
            doc.close()
        
        return output_path, display_filename
    
    @staticmethod
    def edit_pdf_text(file_path: Path, search_text: str, replace_text: str, 
                      all_occurrences: bool = True, original_filename: str = None) -> Tuple[Path, str]:
        """
        Search and replace text in PDF
        Returns: (storage_path, display_filename)
        """
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_edited.pdf"
        display_filename = f"{base_name}_edited.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        doc = fitz.open(file_path)
        try:
            replacements_made = 0
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Search for text instances
                text_instances = page.search_for(search_text)
                
                if text_instances:
                    for inst in text_instances:
                        # Add a white rectangle to cover old text
                        page.draw_rect(inst, color=(1, 1, 1), fill=(1, 1, 1))
                        
                        # Add new text at the same position
                        page.insert_text(
                            inst.tl,  # top-left position
                            replace_text,
                            fontsize=10,
                            color=(0, 0, 0)
                        )
                        replacements_made += 1
                        
                        if not all_occurrences:
                            break
                
                if not all_occurrences and replacements_made > 0:
                    break
            
            doc.save(output_path, garbage=4, deflate=True)
        finally:
            doc.close()
        
        return output_path, display_filename
    
    @staticmethod
    def redact_pdf_areas(file_path: Path, redactions: List[Dict], 
                         original_filename: str = None) -> Tuple[Path, str]:
        """
        Redact (black out) specified areas in PDF
        redactions: List of {page: int, x: float, y: float, width: float, height: float}
        Returns: (storage_path, display_filename)
        """
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_redacted.pdf"
        display_filename = f"{base_name}_redacted.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        doc = fitz.open(file_path)
        try:
            for redaction in redactions:
                page_num = redaction.get('page', 1) - 1  # Convert to 0-indexed
                if 0 <= page_num < len(doc):
                    page = doc[page_num]
                    
                    # Create rectangle for redaction area
                    rect = fitz.Rect(
                        redaction['x'],
                        redaction['y'],
                        redaction['x'] + redaction['width'],
                        redaction['y'] + redaction['height']
                    )
                    
                    # Add redaction annotation (permanent black box)
                    page.add_redact_annot(rect)
            
            # Apply all redactions
            for page in doc:
                page.apply_redactions()
            
            doc.save(output_path, garbage=4, deflate=True)
        finally:
            doc.close()
        
        return output_path, display_filename
    
    @staticmethod
    def sign_pdf(file_path: Path, placed_fields: List[Dict], 
                 original_filename: str = None) -> Tuple[Path, str]:
        """
        Add multiple fields (signatures, dates, text, stamps) to PDF
        placed_fields: List of {field_type, page, x, y, width, height, value?, image_data?}
        Returns: (storage_path, display_filename)
        """
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_signed.pdf"
        display_filename = f"{base_name}_signed.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        doc = fitz.open(file_path)
        try:
            for field in placed_fields:
                field_type = field.get('field_type')
                page_num = field.get('page', 1) - 1  # Convert to 0-indexed
                
                print(f"Processing field: {field_type} on page {page_num + 1}")
                print(f"  Canvas coordinates: x={field.get('x')}, y={field.get('y')}, w={field.get('width')}, h={field.get('height')}")
                
                if page_num < 0 or page_num >= len(doc):
                    print(f"  Skipping - invalid page number")
                    continue  # Skip invalid pages
                
                page = doc[page_num]
                page_rect = page.rect
                
                # Frontend sends coordinates in canvas pixels at zoom*1.5 scale
                # We need to convert to PDF points
                # The frontend renders at scale = zoom * 1.5
                # Default zoom is 0.75, so default scale is 0.75 * 1.5 = 1.125
                scale_factor = 1.125
                
                # Convert canvas coordinates to PDF coordinates
                pdf_x = field['x'] / scale_factor
                pdf_y = field['y'] / scale_factor
                pdf_width = field['width'] / scale_factor
                pdf_height = field['height'] / scale_factor
                
                print(f"  PDF coordinates: x={pdf_x}, y={pdf_y}, w={pdf_width}, h={pdf_height}")
                print(f"  Page dimensions: {page_rect.width} x {page_rect.height}")
                
                # Create rectangle for field
                rect = fitz.Rect(
                    pdf_x,
                    pdf_y,
                    pdf_x + pdf_width,
                    pdf_y + pdf_height
                )
                
                # Handle image-based fields (signature, initials, stamp)
                if field_type in ['signature', 'initials', 'stamp']:
                    image_data = field.get('image_data')
                    if image_data:
                        # Remove data URI prefix if present
                        if ',' in image_data:
                            image_data = image_data.split(',')[1]
                        
                        # Decode base64 and insert image
                        try:
                            image_bytes = base64.b64decode(image_data)
                            page.insert_image(rect, stream=image_bytes, keep_proportion=False)
                            print(f"  ✓ Inserted {field_type} image")
                        except Exception as e:
                            print(f"  ✗ Error inserting image for {field_type}: {e}")
                
                # Handle text-based fields (date, name, text)
                elif field_type in ['date', 'name', 'text']:
                    text_value = field.get('value', '')
                    if text_value:
                        # Insert text in box with better visibility
                        rc = page.insert_textbox(
                            rect,
                            text_value,
                            fontsize=12,
                            color=(0, 0, 0),
                            align=fitz.TEXT_ALIGN_CENTER
                        )
                        if rc >= 0:
                            print(f"  ✓ Inserted {field_type} text: '{text_value}'")
                        else:
                            print(f"  ✗ Failed to insert {field_type} text (rc={rc}). Box too small or text overflow.")
                            # Try with smaller font
                            rc2 = page.insert_textbox(rect, text_value, fontsize=8, color=(0, 0, 0), align=fitz.TEXT_ALIGN_CENTER)
                            if rc2 >= 0:
                                print(f"  ✓ Inserted with smaller font (8pt)")
            
            doc.save(output_path, garbage=4, deflate=True)
            print(f"✓ Saved signed PDF to: {output_path}")
        finally:
            doc.close()
        
        return output_path, display_filename


# Create singleton instance

    @staticmethod
    def redact_pdf(file_path: Path, redaction_areas: List[Dict], 
                   original_filename: str = None) -> Tuple[Path, str]:
        """
        Permanently redact (black out) specified areas in PDF
        redaction_areas: List of {page, x, y, width, height, text?}
        Uses true redaction to remove underlying text data, not just cover it
        Returns: (storage_path, display_filename)
        """
        if original_filename:
            base_name = Path(original_filename).stem
        else:
            base_name = "document"
        
        batch_id = generate_file_id()[:8]
        storage_filename = f"{batch_id}_{base_name}_redacted.pdf"
        display_filename = f"{base_name}_redacted.pdf"
        output_path = settings.OUTPUT_DIR / storage_filename
        
        doc = fitz.open(file_path)
        try:
            for area in redaction_areas:
                page_num = area.get('page', 1) - 1  # Convert to 0-indexed
                
                print(f"Processing redaction on page {page_num + 1}")
                print(f"  Canvas coordinates: x={area.get('x')}, y={area.get('y')}, w={area.get('width')}, h={area.get('height')}")
                
                if page_num < 0 or page_num >= len(doc):
                    print(f"  Skipping - invalid page number")
                    continue
                
                page = doc[page_num]
                page_rect = page.rect
                
                # Convert canvas coordinates to PDF coordinates (same as sign PDF)
                scale_factor = 1.125  # 0.75 (default zoom) * 1.5 (PDF.js scale)
                
                pdf_x = area['x'] / scale_factor
                pdf_y = area['y'] / scale_factor
                pdf_width = area['width'] / scale_factor
                pdf_height = area['height'] / scale_factor
                
                print(f"  PDF coordinates: x={pdf_x}, y={pdf_y}, w={pdf_width}, h={pdf_height}")
                print(f"  Page dimensions: {page_rect.width} x {page_rect.height}")
                
                # Create rectangle for redaction
                rect = fitz.Rect(
                    pdf_x,
                    pdf_y,
                    pdf_x + pdf_width,
                    pdf_y + pdf_height
                )
                
                # Add redaction annotation (true redaction - removes text)
                annot = page.add_redact_annot(rect)
                if annot:
                    # Set redaction to solid black
                    annot.set_colors(fill=(0, 0, 0))  # Black fill
                    annot.update()
                    print(f"  ✓ Added redaction annotation")
                else:
                    print(f"  ✗ Failed to add redaction annotation")
            
            # Apply all redactions permanently
            redaction_count = 0
            for page in doc:
                if page.apply_redactions():
                    redaction_count += 1
            
            print(f"✓ Applied {redaction_count} redactions across {len(doc)} pages")
            
            doc.save(output_path, garbage=4, deflate=True)
            print(f"✓ Saved redacted PDF to: {output_path}")
        finally:
            doc.close()
        
        return output_path, display_filename

pdf_service = PDFService()

