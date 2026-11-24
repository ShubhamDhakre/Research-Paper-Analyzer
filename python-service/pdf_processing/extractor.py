import re
try:
    import pymupdf as fitz
except ImportError:
    import fitz

from typing import Dict, Any, List, Optional
from pathlib import Path


class PDFProcessingError(Exception):
    """Base exception for PDF extraction issues"""
    pass


class PDFPasswordProtectedError(PDFProcessingError):
    """Raised when PDF requires an unauthorized password"""
    pass


class PDFCorruptedError(PDFProcessingError):
    """Raised when PDF file is malformed or unreadable"""
    pass


class PDFEmptyError(PDFProcessingError):
    """Raised when PDF contains zero pages"""
    pass


def clean_extracted_text(text: str) -> str:
    """
    Clean raw extracted PDF text:
    - Merges hyphenated line-endings (e.g. 'atten-\\ntion' -> 'attention')
    - Replaces non-standard whitespace and multiple consecutive blank lines
    - Trims leading/trailing whitespace
    """
    if not text:
        return ""

    # Reconnect hyphenated word breaks across newlines
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)

    # Replace multiple horizontal spaces/tabs with a single space
    text = re.sub(r'[ \t]+', ' ', text)

    # Normalize excessive newlines (max 2 consecutive newlines)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def extract_pdf_data(file_source: Any, filename: Optional[str] = None) -> Dict[str, Any]:
    """
    Extract text page-by-page and metadata from a PDF file using PyMuPDF.
    
    :param file_source: File path (str/Path) or bytes buffer
    :param filename: Optional filename for title fallback
    :return: Dict containing total_pages, title, pages array, is_scanned, char_count
    """
    doc = None
    try:
        if isinstance(file_source, (str, Path)):
            path = Path(file_source)
            if not path.exists():
                raise PDFProcessingError(f"File not found at path: {path}")
            if path.stat().st_size == 0:
                raise PDFEmptyError("The uploaded PDF file is empty (0 bytes).")
            doc = fitz.open(str(path))
        elif isinstance(file_source, bytes):
            if len(file_source) == 0:
                raise PDFEmptyError("The uploaded PDF byte stream is empty.")
            doc = fitz.open(stream=file_source, filetype="pdf")
        else:
            raise PDFProcessingError("Unsupported file source type provided.")

    except (PDFProcessingError, PDFEmptyError):
        raise
    except Exception as e:
        # Catch corruption and invalid structure
        raise PDFCorruptedError(f"Corrupted or invalid PDF structure: {str(e)}")

    try:
        # Check password protection
        if doc.is_encrypted:
            if not doc.authenticate(""):
                raise PDFPasswordProtectedError("The PDF document is password-protected and cannot be parsed.")

        total_pages = len(doc)
        if total_pages == 0:
            raise PDFEmptyError("The PDF document has 0 pages.")

        pages_data: List[Dict[str, Any]] = []
        total_chars = 0
        has_images = False

        for page_num in range(total_pages):
            page = doc.load_page(page_num)
            raw_text = page.get_text("text") or ""
            cleaned = clean_extracted_text(raw_text)
            char_count = len(cleaned)
            total_chars += char_count

            if len(page.get_images()) > 0:
                has_images = True

            pages_data.append({
                "page_number": page_num + 1,
                "text": cleaned,
                "character_count": char_count
            })

        # Heuristic for scanned documents
        avg_chars = total_chars / total_pages if total_pages > 0 else 0
        is_scanned = avg_chars < 50 and has_images

        # Title extraction: check metadata first, fallback to first line of page 1, or filename
        meta = doc.metadata or {}
        extracted_title = meta.get("title", "").strip()

        if not extracted_title and len(pages_data) > 0:
            first_page_lines = [l.strip() for l in pages_data[0]["text"].split("\n") if l.strip()]
            if first_page_lines:
                extracted_title = first_page_lines[0][:150]

        if not extracted_title and filename:
            extracted_title = Path(filename).stem.replace('_', ' ').replace('-', ' ').title()

        return {
            "status": "success",
            "title": extracted_title or "Untitled Research Document",
            "total_pages": total_pages,
            "total_characters": total_chars,
            "is_scanned": is_scanned,
            "scan_notice": (
                "Document appears to be a scanned image with minimal selectable text. "
                "Optical Character Recognition (OCR) is recommended for complete extraction."
                if is_scanned else None
            ),
            "metadata": {
                "author": meta.get("author", ""),
                "creator": meta.get("creator", ""),
                "producer": meta.get("producer", ""),
                "creation_date": meta.get("creationDate", "")
            },
            "pages": pages_data
        }

    finally:
        if doc is not None:
            doc.close()
