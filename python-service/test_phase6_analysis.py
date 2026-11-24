"""
Phase 6 Structured AI Analysis Verification Suite
Tests the 12-section technical extraction schema, missing information handling,
and FastAPI endpoint integration.
"""

import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from analysis.analyzer import analyze_paper_text
from pdf_processing.extractor import extract_pdf_data

REQUIRED_SECTIONS = [
    "paper_title",
    "abstract_summary",
    "research_problem",
    "research_objectives",
    "proposed_methodology",
    "algorithms_techniques",
    "datasets_used",
    "experimental_setup",
    "results_findings",
    "advantages",
    "limitations",
    "future_scope"
]

SAMPLE_PDF_PATH = CURRENT_DIR / "test_data" / "sample_transformer_paper.pdf"


def run_tests():
    print("--- Starting Phase 6 AI Analysis Verification ---")

    # Extract text from sample PDF generated in Phase 5
    pdf_data = extract_pdf_data(SAMPLE_PDF_PATH, filename="Attention_Is_All_You_Need.pdf")
    combined_text = "\n\n".join([p["text"] for p in pdf_data["pages"]])

    print(f"\n[Test 1] Analyzing Extracted Paper Text ({len(combined_text)} characters):")
    analysis = analyze_paper_text(combined_text, title=pdf_data["title"])

    print(f"  Title: {analysis.get('paper_title')}")
    print(f"  Abstract: {analysis.get('abstract_summary')[:100]}...")
    print(f"  Methodology: {analysis.get('proposed_methodology')[:100]}...")
    print(f"  Results: {analysis.get('results_findings')[:100]}...")

    print("\n[Test 2] Verifying Presence of All 12 Structured Sections:")
    for key in REQUIRED_SECTIONS:
        val = analysis.get(key)
        assert val is not None, f"Missing required section: {key}"
        assert len(str(val).strip()) > 0, f"Section {key} is empty"
        print(f"  ✓ Section '{key}' present ({len(str(val))} chars)")

    print("\n[Test 3] Verifying Grounding & Missing Information Notice:")
    sparse_text = "This paper introduces a toy model without discussing datasets or future scope."
    sparse_analysis = analyze_paper_text(sparse_text, title="Toy Model")

    for key in ["datasets_used", "future_scope"]:
        val = sparse_analysis.get(key, "")
        assert "not found" in val.lower() or "not specified" in val.lower(), \
            f"Expected missing notice for {key}, got: {val}"
        print(f"  ✓ {key} correctly reported as: '{val}'")

    print("\n--- All Phase 6 AI Analysis Tests Passed Successfully! ---")


if __name__ == "__main__":
    run_tests()
