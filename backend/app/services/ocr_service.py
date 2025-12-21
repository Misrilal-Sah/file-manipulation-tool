"""
OCR Service using Tesseract
"""
import os
from pathlib import Path
from typing import Optional, List
import fitz  # PyMuPDF
from PIL import Image
import io

from app.config import settings
from app.utils.helpers import generate_file_id

# Try to import pytesseract
try:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_PATH
    TESSERACT_AVAILABLE = Path(settings.TESSERACT_PATH).exists()
except ImportError:
    TESSERACT_AVAILABLE = False


class OCRService:
    """Service for OCR operations on scanned documents"""
    
    @staticmethod
    def is_available() -> bool:
        """Check if OCR is available"""
        return TESSERACT_AVAILABLE
    
    @staticmethod
    def ocr_image(image_path: Path, language: str = "eng") -> str:
        """
        Extract text from image using OCR
        """
        if not TESSERACT_AVAILABLE:
            raise RuntimeError("Tesseract OCR is not installed or configured")
        
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image, lang=language)
        return text
    
    @staticmethod
    def ocr_pdf(file_path: Path, language: str = "eng") -> str:
        """
        Extract text from scanned PDF using OCR
        """
        if not TESSERACT_AVAILABLE:
            raise RuntimeError("Tesseract OCR is not installed or configured")
        
        pdf_doc = fitz.open(file_path)
        all_text = []
        
        try:
            for page_num, page in enumerate(pdf_doc):
                # Check if page has text
                page_text = page.get_text().strip()
                
                if page_text:
                    # Page already has text, use it
                    all_text.append(f"--- Page {page_num + 1} ---\n{page_text}")
                else:
                    # Page is likely scanned, use OCR
                    mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR
                    pix = page.get_pixmap(matrix=mat)
                    
                    # Convert to PIL Image
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    
                    # Run OCR
                    ocr_text = pytesseract.image_to_string(img, lang=language)
                    all_text.append(f"--- Page {page_num + 1} (OCR) ---\n{ocr_text}")
        finally:
            pdf_doc.close()
        
        return '\n\n'.join(all_text)
    
    @staticmethod
    def create_searchable_pdf(file_path: Path, language: str = "eng", original_filename: str = None) -> Path:
        """
        Create a searchable PDF by adding OCR text layer
        """
        if not TESSERACT_AVAILABLE:
            raise RuntimeError("Tesseract OCR is not installed or configured")
        
        # Generate meaningful filename
        if original_filename:
            base_name = Path(original_filename).stem
            output_filename = f"{base_name}_ocr.pdf"
        else:
            output_filename = f"{generate_file_id()}_searchable.pdf"
        output_path = settings.OUTPUT_DIR / output_filename
        
        pdf_doc = fitz.open(file_path)
        zoom_factor = 2.0  # Zoom for better OCR quality
        
        try:
            for page_num, page in enumerate(pdf_doc):
                # Check if page already has substantial text
                existing_text = page.get_text().strip()
                if len(existing_text) > 50:  # Skip if page has significant text
                    continue
                
                # Render page to image for OCR at higher resolution
                mat = fitz.Matrix(zoom_factor, zoom_factor)
                pix = page.get_pixmap(matrix=mat)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                
                # Get OCR data with positions using Tesseract
                ocr_data = pytesseract.image_to_data(
                    img, 
                    lang=language, 
                    output_type=pytesseract.Output.DICT,
                    config='--psm 6'  # Assume single uniform block of text
                )
                
                # Use TextWriter for proper text layer
                tw = fitz.TextWriter(page.rect)
                
                # Add text using insert_textbox for each word
                for i, text in enumerate(ocr_data['text']):
                    text = text.strip()
                    if not text:
                        continue
                    
                    conf = ocr_data['conf'][i]
                    if isinstance(conf, str):
                        try:
                            conf = int(conf)
                        except:
                            conf = 0
                    
                    # Skip low confidence results
                    if conf < 30:
                        continue
                    
                    # Get bounding box (scaled back from zoom)
                    x = ocr_data['left'][i] / zoom_factor
                    y = ocr_data['top'][i] / zoom_factor
                    w = ocr_data['width'][i] / zoom_factor
                    h = ocr_data['height'][i] / zoom_factor
                    
                    if w <= 0 or h <= 0:
                        continue
                    
                    # Create rectangle for the text
                    rect = fitz.Rect(x, y, x + w, y + h)
                    
                    # Calculate font size based on word height (slightly smaller to fit)
                    fontsize = max(6, min(h * 0.85, 20))
                    
                    try:
                        # Insert text in textbox - this creates selectable text
                        # Using nearly transparent color (very light gray close to white)
                        page.insert_textbox(
                            rect,
                            text,
                            fontsize=fontsize,
                            fontname="helv",
                            color=(0.999, 0.999, 0.999),  # Nearly white (almost invisible)
                            align=fitz.TEXT_ALIGN_LEFT
                        )
                    except Exception:
                        # Fallback to simple insert
                        try:
                            page.insert_text(
                                fitz.Point(x, y + h * 0.8),
                                text,
                                fontsize=fontsize,
                                color=(0.999, 0.999, 0.999)
                            )
                        except:
                            pass
            
            pdf_doc.save(output_path)
        finally:
            pdf_doc.close()
        
        return output_path
    
    @staticmethod
    def get_ocr_languages() -> List[str]:
        """
        Get list of available OCR languages
        """
        if not TESSERACT_AVAILABLE:
            return []
        
        try:
            langs = pytesseract.get_languages()
            return langs
        except Exception:
            return ["eng"]  # Default to English


# Create singleton instance
ocr_service = OCRService()
