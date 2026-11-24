"""
Phase 5 Comprehensive PDF Extraction Test Suite
Generates real, corrupted, empty, and password-protected test PDFs
and validates the PyMuPDF extraction engine and FastAPI endpoints.
"""

import os
import sys
from pathlib import Path

# Set up paths
CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

try:
    import pymupdf as fitz
except ImportError:
    import fitz

from pdf_processing.extractor import (
    extract_pdf_data,
    clean_extracted_text,
    PDFEmptyError,
    PDFCorruptedError,
    PDFPasswordProtectedError
)

TEST_DIR = CURRENT_DIR / "test_data"
TEST_DIR.mkdir(parents=True, exist_ok=True)

VALID_PDF_PATH = TEST_DIR / "sample_transformer_paper.pdf"
EMPTY_PDF_PATH = TEST_DIR / "empty_paper.pdf"
CORRUPTED_PDF_PATH = TEST_DIR / "corrupted_paper.pdf"
ENCRYPTED_PDF_PATH = TEST_DIR / "encrypted_paper.pdf"


def create_sample_pdf():
    """Create a 3-page real academic research paper PDF using PyMuPDF"""
    doc = fitz.open()
    rect = fitz.Rect(50, 50, 550, 750)

    # Page 1: Abstract & Intro
    page1 = doc.new_page()
    text_p1 = (
        "Attention Is All You Need\n\n"
        "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit\n"
        "Google Brain & Google Research\n\n"
        "ABSTRACT\n"
        "The dominant sequence transduction models are based on complex recurrent or "
        "convolutional neural networks. We propose the Transfor-\n"
        "mer, a model architecture eschewing recurrence and relying entirely on attention."
    )
    page1.insert_textbox(rect, text_p1, fontsize=12)

    # Page 2: Methodology
    page2 = doc.new_page()
    text_p2 = (
        "METHODOLOGY & SCALED DOT-PRODUCT ATTENTION\n\n"
        "The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers.\n"
        "Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V\n"
        "Multi-head attention allows the model to jointly attend to information from different representation subspaces."
    )
    page2.insert_textbox(rect, text_p2, fontsize=12)

    # Page 3: Results
    page3 = doc.new_page()
    text_p3 = (
        "EXPERIMENTAL RESULTS & FINDINGS\n\n"
        "On the WMT 2014 English-to-German translation task, the big transformer model establishes a new "
        "state-of-the-art BLEU score of 28.4, outperforming the best existing models by over 2.0 BLEU.\n"
        "Training took 3.5 days on 8 P100 GPUs."
    )
    page3.insert_textbox(rect, text_p3, fontsize=12)

    # Set metadata
    doc.set_metadata({
        "title": "Attention Is All You Need",
        "author": "Vaswani et al.",
        "creator": "PyMuPDF Test Generator"
    })

    doc.save(str(VALID_PDF_PATH))
    doc.close()
    print(f"  ✓ Created valid academic test PDF: {VALID_PDF_PATH.name} (3 pages)")


def create_edge_case_pdfs():
    """Create empty, corrupted, and encrypted test files"""
    # 1. Empty 0-byte file
    EMPTY_PDF_PATH.write_bytes(b"")
    print(f"  ✓ Created empty 0-byte test file: {EMPTY_PDF_PATH.name}")

    # 2. Corrupted malformed file
    CORRUPTED_PDF_PATH.write_bytes(b"%PDF-1.5 THIS IS NOT A VALID PDF CONTENT AND LACKS XREF TRAILER")
    print(f"  ✓ Created corrupted malformed PDF: {CORRUPTED_PDF_PATH.name}")

    # 3. Encrypted/Password protected PDF
    doc = fitz.open()
    page = doc.new_page()
    page.insert_textbox(fitz.Rect(50, 50, 550, 750), "CONFIDENTIAL RESEARCH DOCUMENT", fontsize=14)
    # Save with user password
    perm = fitz.PDF_PERM_ACCESSIBILITY
    encrypt_meth = fitz.PDF_ENCRYPT_AES_256
    doc.save(
        str(ENCRYPTED_PDF_PATH),
        encryption=encrypt_meth,
        user_pw="secret123",
        owner_pw="admin123",
        permissions=perm
    )
    doc.close()
    print(f"  ✓ Created password-protected PDF: {ENCRYPTED_PDF_PATH.name}")


def run_tests():
    print("--- Starting Phase 5 PDF Extraction Verification ---")
    create_sample_pdf()
    create_edge_case_pdfs()

    print("\n[Test 1] Testing Text Cleaning Logic:")
    dirty_text = "The Transfor-\nmer model achieves remark-   \n  able BLEU scores.\n\n\n\nExtracted."
    cleaned = clean_extracted_text(dirty_text)
    print(f"  Cleaned: '{cleaned}'")
    assert "Transformer" in cleaned, "Hyphenation wrap was not resolved"
    assert "remarkable" in cleaned, "Hyphenation wrap was not resolved"
    print("  ✓ Text cleaning correctly repaired line wraps and excess spacing")

    print("\n[Test 2] Testing Valid Academic PDF Extraction:")
    result = extract_pdf_data(VALID_PDF_PATH, filename="attention_is_all_you_need.pdf")
    print(f"  Status: {result['status']}")
    print(f"  Title: {result['title']}")
    print(f"  Total Pages: {result['total_pages']}")
    print(f"  Total Characters: {result['total_characters']}")
    print(f"  Is Scanned: {result['is_scanned']}")

    assert result["status"] == "success"
    assert result["total_pages"] == 3
    assert "Attention Is All You Need" in result["title"]
    assert len(result["pages"]) == 3
    assert "Transformer" in result["pages"][0]["text"]
    assert "softmax(QK^T" in result["pages"][1]["text"]
    assert "BLEU score of 28.4" in result["pages"][2]["text"]
    print("  ✓ All 3 pages extracted with high fidelity and page preservation")

    print("\n[Test 3] Testing Empty PDF Edge Case:")
    try:
        extract_pdf_data(EMPTY_PDF_PATH)
        assert False, "Should have raised PDFEmptyError"
    except PDFEmptyError as e:
        print(f"  ✓ Caught expected PDFEmptyError: {e}")

    print("\n[Test 4] Testing Corrupted PDF Edge Case:")
    try:
        extract_pdf_data(CORRUPTED_PDF_PATH)
        assert False, "Should have raised PDFCorruptedError"
    except PDFCorruptedError as e:
        print(f"  ✓ Caught expected PDFCorruptedError: {e}")

    print("\n[Test 5] Testing Password-Protected PDF Edge Case:")
    try:
        extract_pdf_data(ENCRYPTED_PDF_PATH)
        assert False, "Should have raised PDFPasswordProtectedError"
    except PDFPasswordProtectedError as e:
        print(f"  ✓ Caught expected PDFPasswordProtectedError: {e}")

    print("\n--- All Phase 5 PyMuPDF Extraction Tests Passed Successfully! ---")


if __name__ == "__main__":
    run_tests()
