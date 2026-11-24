"""
Phase 11 Citation Verification Verification Suite
Tests the three-tier verification architecture:
1. Paper existence check
2. Page existence check
3. Semantic claim support check (distinguishing citation existence from factual claim support)
"""

import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from citation_verification.verifier import (
    verify_citation_claim,
    verify_citations_batch
)

MOCK_PROJECT_PAPERS = [
    {
        "paper_id": "transformer_vaswani_2017",
        "paper_title": "Attention Is All You Need",
        "total_pages": 11,
        "pages": [
            {
                "page_number": 1,
                "text": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence entirely."
            },
            {
                "page_number": 4,
                "text": "An attention function can be described as mapping a query and a set of key-value pairs to an output. We compute the matrix of outputs as: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V."
            },
            {
                "page_number": 8,
                "text": "On the WMT 2014 English-to-German translation task, the big transformer model achieves 28.4 BLEU, outperforming the best previously reported models by over 2.0 BLEU. On the English-to-French task, our model achieves 41.8 BLEU."
            }
        ]
    }
]


def run_tests():
    print("--- Starting Phase 11 Citation Verification Verification Suite ---")

    # Test 1: Validation - require at least 1 citation
    print("\n[Test 1] Testing Input Validation (Empty citations):")
    try:
        verify_citations_batch([], MOCK_PROJECT_PAPERS)
        assert False, "Should have raised ValueError on empty citations"
    except ValueError as e:
        print(f"  ✓ Correctly rejected empty citations with ValueError: '{str(e)}'")

    # Test 2: Valid Paper + Valid Page + Supported Claim
    print("\n[Test 2] Verifying Valid Paper, Valid Page & SUPPORTED Claim:")
    claim_supported = "The Transformer achieves 28.4 BLEU on the WMT 2014 English-to-German translation task."
    res_supported = verify_citation_claim(
        claim=claim_supported,
        cited_paper_id="transformer_vaswani_2017",
        cited_page_number=8,
        project_papers=MOCK_PROJECT_PAPERS
    )

    assert res_supported["paper_exists"] is True, "Paper should exist"
    assert res_supported["page_exists"] is True, "Page 8 should exist"
    assert res_supported["claim_support_status"] == "SUPPORTED", f"Expected SUPPORTED, got {res_supported['claim_support_status']}"
    assert res_supported["support_confidence"] >= 0.7
    print(f"  Status: {res_supported['claim_support_status']} (Confidence: {res_supported['support_confidence']:.2f})")
    print(f"  Snippet: {res_supported['evidence_snippet']}")
    print(f"  Summary: {res_supported['verification_summary'][:90]}...")
    print("  ✓ Correctly marked as verified and supported by source page.")

    # Test 3: Valid Paper + Valid Page + UNSUPPORTED Claim (Distinguishing existence from support!)
    print("\n[Test 3] Verifying Valid Paper & Page BUT UNSUPPORTED Claim (Critical Rule):")
    claim_hallucinated = "The Transformer achieves 99.8% BLEU score on Chinese translation benchmarks."
    res_unsupported = verify_citation_claim(
        claim=claim_hallucinated,
        cited_paper_id="transformer_vaswani_2017",
        cited_page_number=8,
        project_papers=MOCK_PROJECT_PAPERS
    )

    assert res_unsupported["paper_exists"] is True, "Paper exists"
    assert res_unsupported["page_exists"] is True, "Page exists"
    assert res_unsupported["claim_support_status"] == "UNSUPPORTED", \
        f"MUST be marked UNSUPPORTED despite paper existing! Got: {res_unsupported['claim_support_status']}"
    print(f"  Status: {res_unsupported['claim_support_status']}")
    print(f"  Reasoning in Summary: {res_unsupported['verification_summary'][:100]}...")
    print("  ✓ CRITICAL RULE VERIFIED: Did NOT mark citation verified merely because paper exists!")

    # Test 4: Valid Paper + INVALID Page (Out of bounds)
    print("\n[Test 4] Verifying Valid Paper with INVALID Page Number:")
    res_invalid_page = verify_citation_claim(
        claim="Transformer self-attention details",
        cited_paper_id="transformer_vaswani_2017",
        cited_page_number=999,  # Document has 11 pages
        project_papers=MOCK_PROJECT_PAPERS
    )

    assert res_invalid_page["paper_exists"] is True
    assert res_invalid_page["page_exists"] is False
    assert res_invalid_page["claim_support_status"] == "INVALID_PAGE"
    print(f"  Status: {res_invalid_page['claim_support_status']}")
    print(f"  Summary: {res_invalid_page['verification_summary'][:95]}...")
    print("  ✓ Correctly identified out-of-bounds page reference.")

    # Test 5: Non-existent Paper ID
    print("\n[Test 5] Verifying NON-EXISTENT Paper Citation:")
    res_non_existent = verify_citation_claim(
        claim="Random non-existent claim",
        cited_paper_id="fake_paper_id_404",
        cited_page_number=1,
        project_papers=MOCK_PROJECT_PAPERS
    )

    assert res_non_existent["paper_exists"] is False
    assert res_non_existent["claim_support_status"] == "INVALID_REFERENCE"
    print(f"  Status: {res_non_existent['claim_support_status']}")
    print("  ✓ Correctly flagged invalid paper reference.")

    # Test 6: Batch Verification & Statistics
    print("\n[Test 6] Testing Batch Verification with Aggregate Statistics:")
    batch_claims = [
        {"claim": claim_supported, "cited_paper_id": "transformer_vaswani_2017", "cited_page_number": 8},
        {"claim": claim_hallucinated, "cited_paper_id": "transformer_vaswani_2017", "cited_page_number": 8},
        {"claim": "Invalid page test", "cited_paper_id": "transformer_vaswani_2017", "cited_page_number": 50},
        {"claim": "Missing paper test", "cited_paper_id": "ghost_paper", "cited_page_number": 1}
    ]

    batch_res = verify_citations_batch(batch_claims, MOCK_PROJECT_PAPERS)
    stats = batch_res["statistics"]

    print(f"  Total Checked: {stats['total_checked']}")
    print(f"  Papers Found: {stats['papers_found']}")
    print(f"  Claims Supported: {stats['claims_supported']}")
    print(f"  Claims Unsupported: {stats['claims_unsupported']}")
    print(f"  Invalid References: {stats['invalid_references']}")

    assert stats["total_checked"] == 4
    assert stats["claims_supported"] == 1
    assert stats["claims_unsupported"] == 1
    assert stats["invalid_references"] == 1
    print("  ✓ Batch statistics mathematically verified.")

    print("\n✓ All Phase 11 Citation Verification Tests PASSED successfully!")


if __name__ == "__main__":
    run_tests()
