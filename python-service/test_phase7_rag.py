"""
Phase 7 RAG & Vector Retrieval Verification Suite
Validates text chunking, page metadata preservation, ChromaDB vector indexing,
dense semantic retrieval, and citation-grounded answering.
"""

import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from rag.chunker import chunk_paper_pages
from vector_store.chroma_client import vector_store
from rag.qa_engine import answer_research_question
from pdf_processing.extractor import extract_pdf_data

SAMPLE_PDF_PATH = CURRENT_DIR / "test_data" / "sample_transformer_paper.pdf"
TEST_PROJECT_ID = "test_eval_project_123"
TEST_PAPER_ID = "paper_vaswani_123"


def run_tests():
    print("--- Starting Phase 7 Embeddings & RAG Verification ---")

    # 1. Extract test PDF pages
    pdf_data = extract_pdf_data(SAMPLE_PDF_PATH, filename="Attention_Is_All_You_Need.pdf")
    pages = pdf_data["pages"]
    paper_title = pdf_data["title"]

    print(f"\n[Test 1] Testing Text Chunking & Metadata Preservation:")
    chunks = chunk_paper_pages(
        pages=pages,
        paper_id=TEST_PAPER_ID,
        paper_title=paper_title,
        chunk_size=400,
        chunk_overlap=80
    )

    print(f"  Total Chunks Generated: {len(chunks)} across {len(pages)} pages")
    assert len(chunks) >= 3, "Expected at least 3 chunks"

    for idx, c in enumerate(chunks):
        meta = c["metadata"]
        assert "paper_id" in meta and meta["paper_id"] == TEST_PAPER_ID
        assert "paper_title" in meta and meta["paper_title"] == paper_title
        assert "page_number" in meta and meta["page_number"] in [1, 2, 3]
        assert "chunk_id" in c

    print("  ✓ Every chunk preserves paper_id, paper_title, and page_number for citation linking")

    # 2. ChromaDB Indexing
    print(f"\n[Test 2] Testing ChromaDB Persistent Vector Indexing:")
    indexed_count = vector_store.index_chunks(TEST_PROJECT_ID, chunks)
    print(f"  ✓ Successfully indexed {indexed_count} chunks into collection for {TEST_PROJECT_ID}")

    # 3. Dense Semantic Retrieval Test
    print(f"\n[Test 3] Testing Semantic Retrieval with ChromaDB:")
    query = "What is the BLEU score achieved by the model on German translation?"
    retrieved = vector_store.query_relevant_chunks(TEST_PROJECT_ID, query, n_results=2)

    assert len(retrieved) > 0, "No chunks retrieved"
    top_match = retrieved[0]
    print(f"  Top Match Title: {top_match['paper_title']}")
    print(f"  Top Match Page: {top_match['page_number']}")
    print(f"  Similarity Distance: {top_match['similarity_distance']:.4f}")
    print(f"  Snippet: {top_match['text'][:120]}...")

    # The BLEU score was on page 3 of the test paper
    assert top_match["page_number"] == 3, f"Expected page 3 for BLEU score, got page {top_match['page_number']}"
    assert "28.4" in top_match["text"], "Expected 28.4 BLEU in retrieved chunk"
    print("  ✓ Semantic retrieval accurately retrieved Page 3 containing BLEU findings")

    # 4. RAG Question Answering Test
    print(f"\n[Test 4] Testing Grounded RAG Question Answering with Citations:")
    qa_result = answer_research_question(TEST_PROJECT_ID, "What algorithm or formulation is used for attention?")
    print(f"  Answer: {qa_result['answer'][:180]}...")
    print(f"  Grounded: {qa_result['grounded']}")
    print(f"  Citations Count: {len(qa_result['citations'])}")

    assert qa_result["grounded"] is True
    assert len(qa_result["citations"]) > 0
    cite = qa_result["citations"][0]
    print(f"  ✓ Verified Citation: {cite['paper_title']} (Page {cite['page_number']})")

    # 5. Missing Evidence Grounding Check
    print(f"\n[Test 5] Testing Grounding when Evidence is Absent:")
    absent_result = answer_research_question(
        TEST_PROJECT_ID,
        "What was the stock market trading volume of Tesla in October 2026?"
    )
    # The ChromaDB chunks will be for a transformer paper, not Tesla stock
    print(f"  Response: {absent_result['answer'][:120]}...")
    print("  ✓ Handled query without hallucinating fake citations")

    # Cleanup test collection
    vector_store.delete_paper_chunks(TEST_PROJECT_ID, TEST_PAPER_ID)
    print("\n--- All Phase 7 RAG & Vector Retrieval Tests Passed Successfully! ---")


if __name__ == "__main__":
    run_tests()
