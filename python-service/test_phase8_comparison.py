"""
Phase 8 Multiple Research Paper Comparison Verification Suite
Tests the 10-dimension comparative matrix, input validation, missing information handling,
and multi-paper comparative synthesis.
"""

import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from comparison.comparator import (
    compare_research_papers,
    COMPARISON_DIMENSIONS
)

SAMPLE_PAPERS = [
    {
        "paper_id": "paper_transformer_01",
        "paper_title": "Attention Is All You Need",
        "text": """
        Abstract: We propose the Transformer, a model architecture eschewing recurrence and relying entirely on attention mechanisms to draw global dependencies between input and output.
        Research Objectives: Eliminate recurrent networks and sequence-aligned recurrence in sequence transduction.
        Problem Statement: Recurrent models preclude parallelization within training examples, which becomes critical at longer sequence lengths.
        Proposed Methodology: An encoder-decoder architecture based solely on self-attention and point-wise fully connected layers.
        Algorithms: Scaled dot-product attention softmax(QK^T / sqrt(d_k))V and multi-head attention.
        Datasets Used: WMT 2014 English-to-German (4.5 million sentence pairs) and WMT 2014 English-to-French (36 million pairs).
        Results and Findings: 28.4 BLEU on English-to-German and 41.8 BLEU on English-to-French, training for 3.5 days on 8 P100 GPUs.
        Advantages: Highly parallelizable computation and reduced training times.
        Limitations: Quadratic computational and memory complexity with respect to sequence length O(n^2).
        Research Contributions: Introduced multi-head self-attention replacing RNNs/CNNs as the primary deep learning sequence backbone.
        Future Scope: Extend attention mechanisms to image, audio, and video modalities.
        """,
        "analysis": {
            "researchObjectives": "Eliminate recurrent networks and sequence-aligned recurrence.",
            "researchProblem": "Recurrent models preclude parallelization within training examples.",
            "proposedMethodology": "Encoder-decoder architecture based solely on self-attention.",
            "algorithmsTechniques": "Scaled dot-product attention and multi-head attention.",
            "datasetsUsed": "WMT 2014 English-to-German and English-to-French datasets.",
            "resultsFindings": "28.4 BLEU on En-De, 41.8 BLEU on En-Fr.",
            "advantages": "Highly parallelizable computation and reduced training time.",
            "limitations": "Quadratic computational and memory complexity O(n^2).",
            "abstractSummary": "Introduced the Transformer architecture.",
            "futureScope": "Extend attention mechanisms to image, audio, and video modalities."
        }
    },
    {
        "paper_id": "paper_bert_02",
        "paper_title": "BERT: Pre-training of Deep Bidirectional Transformers",
        "text": """
        Abstract: We introduce BERT (Bidirectional Encoder Representations from Transformers) designed to pre-train deep bidirectional representations from unlabeled text.
        Research Objectives: Pre-train deep bidirectional representations conditioned on both left and right context in all layers.
        Problem Statement: Standard language models are unidirectional, severely limiting architecture choices during pre-training.
        Proposed Methodology: Multi-layer bidirectional Transformer encoder based on the original Transformer architecture.
        Algorithms: Masked Language Modeling (MLM) and Next Sentence Prediction (NSP).
        Datasets Used: BooksCorpus (800M words) and English Wikipedia (2,500M words).
        Results and Findings: GLUE score of 80.5% (BERT Base) and 82.1% (BERT Large), advancing state-of-the-art across 11 NLP tasks.
        Advantages: Creates unified contextual representations easily fine-tuned for downstream tasks with minimal task-specific parameters.
        Limitations: Pre-train fine-tune discrepancy due to [MASK] tokens never seen during downstream evaluation; high pre-training cost.
        Research Contributions: First bidirectional pre-trained representation showing dominance across sentence and token level NLP tasks.
        Future Scope: Explore pre-training objectives beyond MLM and improve parameter efficiency.
        """,
        "analysis": {
            "researchObjectives": "Pre-train deep bidirectional representations conditioned on both left and right context.",
            "researchProblem": "Standard language models are unidirectional.",
            "proposedMethodology": "Multi-layer bidirectional Transformer encoder.",
            "algorithmsTechniques": "Masked Language Modeling (MLM) and Next Sentence Prediction (NSP).",
            "datasetsUsed": "BooksCorpus (800M words) and English Wikipedia (2,500M words).",
            "resultsFindings": "GLUE score of 80.5% on BERT Base and 82.1% on BERT Large.",
            "advantages": "Unified contextual representations fine-tuned with minimal task-specific modifications.",
            "limitations": "Pre-train fine-tune discrepancy due to [MASK] tokens; high compute requirement.",
            "abstractSummary": "Bidirectional Transformer pre-training for NLP.",
            "futureScope": "Explore pre-training objectives beyond MLM."
        }
    }
]

SPARSE_PAPER = {
    "paper_id": "paper_sparse_03",
    "paper_title": "A Minimal Concept Note Without Experiments",
    "text": "This note conceptualizes an idea without providing datasets, algorithms, or experimental results.",
    "analysis": {
        "researchObjectives": "Conceptualize a hypothetical model.",
        "researchProblem": "Lack of conceptual models in the area.",
        # Missing datasets, algorithms, results, limitations, etc.
    }
}


def run_tests():
    print("--- Starting Phase 8 Multi-Paper Comparison Verification ---")

    # Test 1: Validation - require at least 2 papers
    print("\n[Test 1] Testing Input Validation (<2 papers):")
    try:
        compare_research_papers([SAMPLE_PAPERS[0]])
        assert False, "Should have raised ValueError when less than 2 papers are provided"
    except ValueError as e:
        print(f"  ✓ Correctly rejected single paper with ValueError: '{str(e)}'")

    # Test 2: Two-paper comparison across all 10 dimensions
    print("\n[Test 2] Comparing Two Research Papers across 10 Dimensions:")
    result = compare_research_papers(SAMPLE_PAPERS)

    assert "summary" in result, "Missing 'summary' in comparison result"
    assert "dimensions" in result, "Missing 'dimensions' in comparison result"
    assert len(result["dimensions"]) == 10, f"Expected 10 dimensions, got {len(result['dimensions'])}"

    print(f"  Summary: {result['summary']}")
    print(f"  Dimensions count: {len(result['dimensions'])}")

    required_keys = [d["key"] for d in COMPARISON_DIMENSIONS]
    for dim in result["dimensions"]:
        d_key = dim["dimension_key"]
        d_label = dim["dimension_label"]
        assert d_key in required_keys, f"Unexpected dimension key: {d_key}"
        assert "paper_transformer_01" in dim["comparison"], f"Missing paper 1 in dimension {d_key}"
        assert "paper_bert_02" in dim["comparison"], f"Missing paper 2 in dimension {d_key}"
        print(f"  ✓ Dimension '{d_label}' ({d_key}):")
        print(f"    - Paper 1: {dim['comparison']['paper_transformer_01'][:70]}...")
        print(f"    - Paper 2: {dim['comparison']['paper_bert_02'][:70]}...")

    # Test 3: Handling missing/sparse information gracefully
    print("\n[Test 3] Testing Missing Information Handling with Sparse Paper:")
    sparse_comparison = compare_research_papers([SAMPLE_PAPERS[0], SPARSE_PAPER])

    dim_datasets = next(d for d in sparse_comparison["dimensions"] if d["dimension_key"] == "datasets")
    sparse_val = dim_datasets["comparison"]["paper_sparse_03"]
    print(f"  Sparse Paper Datasets field value: '{sparse_val}'")
    assert "not found" in sparse_val.lower() or "not specified" in sparse_val.lower(), \
        f"Expected missing information notice, got: {sparse_val}"
    print("  ✓ Correctly labeled omitted information without hallucination.")

    # Test 4: Three-paper comparison
    print("\n[Test 4] Testing 3-Paper Comparative Synthesis:")
    three_papers_result = compare_research_papers([SAMPLE_PAPERS[0], SAMPLE_PAPERS[1], SPARSE_PAPER])
    assert len(three_papers_result["dimensions"]) == 10
    dim_objectives = next(d for d in three_papers_result["dimensions"] if d["dimension_key"] == "research_objectives")
    assert len(dim_objectives["comparison"]) == 3, f"Expected 3 paper comparisons in dimension, got {len(dim_objectives['comparison'])}"
    print(f"  ✓ Successfully compared 3 papers simultaneously across all 10 dimensions.")

    print("\n✓ All Phase 8 Comparison Verification Tests PASSED successfully!")


if __name__ == "__main__":
    run_tests()
