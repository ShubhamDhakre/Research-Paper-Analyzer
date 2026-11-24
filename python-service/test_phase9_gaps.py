"""
Phase 9 Potential Research Gap Analysis Verification Suite
Tests the discovery of candidate research gaps based on author limitations,
cross-paper discrepancies, epistemic boundaries, and structured JSON output.
"""

import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from research_gaps.gap_analyzer import (
    analyze_research_gaps,
    METHODOLOGY_DISCLAIMER
)

SAMPLE_PAPERS = [
    {
        "paper_id": "transformer_2017",
        "paper_title": "Attention Is All You Need",
        "text": """
        The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality.
        However, a critical limitation is that self-attention layers exhibit quadratic time and memory complexity O(n^2) with sequence length.
        This imposes severe memory bottlenecks when scaling to long documents or high-resolution inputs.
        In the future, we plan to investigate restricted and local attention mechanisms to handle longer contexts.
        """,
        "analysis": {
            "researchObjectives": "Replace recurrent mechanisms with self-attention.",
            "limitations": "Quadratic computational and memory complexity O(n^2) with respect to sequence length, creating heavy GPU memory overhead.",
            "futureScope": "Investigate restricted, sparse, or local attention mechanisms to handle longer contexts and extend to other modalities."
        }
    },
    {
        "paper_id": "bert_2018",
        "paper_title": "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
        "text": """
        BERT addresses unidirectional constraints in existing language models by using Masked Language Modeling.
        A noticeable drawback and limitation is the pre-train fine-tune discrepancy created because the [MASK] token never appears during fine-tuning.
        Additionally, the 512 token absolute positional embedding limits its ability to model arbitrary-length sequences.
        Future work will explore alternative pre-training objectives and investigate parameter-efficient transfer methods.
        """,
        "analysis": {
            "researchObjectives": "Bidirectional representation pre-training using masked language modeling.",
            "limitations": "Pre-training and fine-tuning mismatch due to artificial [MASK] token; absolute sequence limit of 512 tokens.",
            "futureScope": "Explore alternative objectives that eliminate mask discrepancy and reduce pre-training compute footprint."
        }
    }
]

SPARSE_PAPER = {
    "paper_id": "sparse_note",
    "paper_title": "Brief Technical Note on Heuristics",
    "text": "This note provides a heuristic without experimental datasets or benchmarks.",
    "analysis": {}
}


def run_tests():
    print("--- Starting Phase 9 Potential Research Gap Analysis Verification ---")

    # Test 1: Validation - require at least 1 paper
    print("\n[Test 1] Testing Input Validation (Empty papers list):")
    try:
        analyze_research_gaps([])
        assert False, "Should have raised ValueError on empty papers list"
    except ValueError as e:
        print(f"  ✓ Correctly rejected empty paper list with ValueError: '{str(e)}'")

    # Test 2: Single paper gap discovery
    print("\n[Test 2] Single Paper Potential Gap Discovery:")
    single_res = analyze_research_gaps([SAMPLE_PAPERS[0]])
    assert "potential_gaps" in single_res, "Missing 'potential_gaps' in response"
    assert len(single_res["potential_gaps"]) >= 1, "Expected at least 1 potential gap from single paper"

    gap0 = single_res["potential_gaps"][0]
    print(f"  Title: {gap0.get('title')}")
    print(f"  Category: {gap0.get('category')}")
    print(f"  Evidence: {gap0.get('evidence')[:80]}...")
    print(f"  Future Direction: {gap0.get('future_direction')[:80]}...")

    required_fields = [
        "id", "title", "category", "description",
        "supporting_papers", "evidence", "why_worth_investigating", "future_direction"
    ]
    for field in required_fields:
        assert field in gap0, f"Missing required gap field: '{field}'"
        assert gap0[field], f"Field '{field}' must not be empty"
    print("  ✓ All required schema fields verified in single paper gap.")

    # Test 3: Multi-paper comparative gap synthesis
    print("\n[Test 3] Multi-Paper Comparative Gap Synthesis:")
    multi_res = analyze_research_gaps(SAMPLE_PAPERS)
    gaps = multi_res.get("potential_gaps", [])
    print(f"  Discovered {len(gaps)} potential research gaps across {len(SAMPLE_PAPERS)} papers.")
    assert len(gaps) >= 2, f"Expected at least 2 gaps from multi-paper corpus, got {len(gaps)}"

    for idx, g in enumerate(gaps, 1):
        print(f"  Gap #{idx}: [{g.get('category')}] {g.get('title')}")
        assert len(g["supporting_papers"]) >= 1, f"Gap #{idx} has no supporting papers"
    print("  ✓ Multi-paper gap synthesis verified with supporting paper links.")

    # Test 4: Epistemic boundary and methodology disclaimer
    print("\n[Test 4] Verifying Epistemic Boundary & Methodology Disclaimer:")
    disclaimer = multi_res.get("methodology_disclaimer", "")
    assert disclaimer, "Missing methodology_disclaimer in gap analysis result"
    assert "potential" in disclaimer.lower() or "candidate" in disclaimer.lower(), \
        "Disclaimer must explicitly identify gaps as potential/candidate gaps"
    print(f"  ✓ Mandatory disclaimer verified: '{disclaimer[:85]}...'")

    # Test 5: Sparse paper handling without crash or hallucination
    print("\n[Test 5] Handling Sparse Paper Gracefully:")
    sparse_res = analyze_research_gaps([SPARSE_PAPER])
    assert len(sparse_res["potential_gaps"]) >= 1
    print(f"  ✓ Sparse paper produced safe fallback gap without crashing: '{sparse_res['potential_gaps'][0]['title']}'")

    print("\n✓ All Phase 9 Research Gap Verification Tests PASSED successfully!")


if __name__ == "__main__":
    run_tests()
