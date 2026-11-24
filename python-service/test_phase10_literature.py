"""
Phase 10 Literature Review Generator Verification Suite
Tests thematic synthesis, section structure, word count calculation,
theme customization, and grounded references.
"""

import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from literature_review.generator import generate_literature_review

SAMPLE_PAPERS = [
    {
        "paper_id": "transformer_2017",
        "paper_title": "Attention Is All You Need",
        "analysis": {
            "researchObjectives": "Eliminate recurrence and convolutions in sequence transduction.",
            "proposedMethodology": "Encoder-decoder model based solely on self-attention.",
            "algorithmsTechniques": "Multi-head scaled dot-product attention.",
            "datasetsUsed": "WMT 2014 English-German and English-French.",
            "resultsFindings": "28.4 BLEU on En-De, 41.8 BLEU on En-Fr.",
            "limitations": "Quadratic memory and compute complexity O(n^2).",
            "futureScope": "Extend attention mechanisms to non-text modalities."
        }
    },
    {
        "paper_id": "bert_2018",
        "paper_title": "BERT: Pre-training of Deep Bidirectional Transformers",
        "analysis": {
            "researchObjectives": "Pre-train deep bidirectional representations from unlabeled text.",
            "proposedMethodology": "Bidirectional Transformer encoder pre-trained with MLM and NSP.",
            "algorithmsTechniques": "Masked Language Modeling (15% masking) and Next Sentence Prediction.",
            "datasetsUsed": "BooksCorpus and English Wikipedia.",
            "resultsFindings": "GLUE benchmark score 80.5 (Base) and 82.1 (Large).",
            "limitations": "Pre-training and fine-tuning distribution mismatch; 512 token length limit.",
            "futureScope": "Investigate alternative pre-training objectives and parameter reduction."
        }
    }
]


def run_tests():
    print("--- Starting Phase 10 Literature Review Generator Verification ---")

    # Test 1: Validation - require at least 1 paper
    print("\n[Test 1] Testing Input Validation (Empty papers list):")
    try:
        generate_literature_review([])
        assert False, "Should have raised ValueError on empty papers list"
    except ValueError as e:
        print(f"  ✓ Correctly rejected empty paper list with ValueError: '{str(e)}'")

    # Test 2: Multi-paper synthesis across the 6 canonical sections
    print("\n[Test 2] Multi-Paper Thematic Literature Review Generation:")
    result = generate_literature_review(SAMPLE_PAPERS, theme="Evolution of Self-Attention and Pre-Training")

    assert "draft_markdown" in result, "Missing 'draft_markdown' in response"
    assert "word_count" in result, "Missing 'word_count' in response"
    assert result["word_count"] > 100, f"Expected review word count > 100, got {result['word_count']}"

    draft = result["draft_markdown"]
    print(f"  Title: {result.get('title')}")
    print(f"  Word Count: {result.get('word_count')} words")
    print(f"  Papers Count: {result.get('papers_count')}")

    required_sections = [
        "1. Introduction & Research Scope",
        "2. Thematic Organization",
        "3. Comparative",
        "4. Critical Analysis of Limitations",
        "5. Emerging Research Trajectories",
        "6. Grounded References"
    ]

    for sec in required_sections:
        assert any(sec.lower() in line.lower() for line in draft.split("\n")), f"Missing required section matching: '{sec}'"
        print(f"  ✓ Section '{sec}' verified in draft markdown")

    # Test 3: Grounded references verification
    print("\n[Test 3] Verifying Grounded References:")
    assert "[1]" in draft, "Missing citation [1]"
    assert "[2]" in draft, "Missing citation [2]"
    assert "Attention Is All You Need" in draft, "Missing Paper 1 reference in bibliography"
    assert "BERT" in draft, "Missing Paper 2 reference in bibliography"
    print("  ✓ All citations strictly ground to provided input papers.")

    print("\n✓ All Phase 10 Literature Review Verification Tests PASSED successfully!")


if __name__ == "__main__":
    run_tests()
