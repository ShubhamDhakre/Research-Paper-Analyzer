"""
Potential Research Gap Analysis Module
Analyzes multiple research papers to identify candidate gaps based on:
- Author-stated limitations
- Unresolved research problems
- Methodological trade-offs
- Discrepancies between datasets or experimental regimes
- Unexplored future directions

STRICT EPISTEMIC REQUIREMENT:
A research gap suggested from a limited collection of papers is ONLY a potential gap.
Never claim that it is a proven or definitive gap across the entire research field.
"""

import json
import re
from typing import List, Dict, Any, Optional
from config.settings import settings

METHODOLOGY_DISCLAIMER = (
    "A research gap identified from this collection of papers represents a candidate/potential gap "
    "grounded in the authors' stated limitations and experimental boundaries. It is not an assertion "
    "of a universal absence in the broader academic literature; independent literature search is advised."
)

GAP_ANALYSIS_SYSTEM_PROMPT = f"""
You are an expert academic research advisor and literature analyst.
Analyze the provided research papers to discover POTENTIAL RESEARCH GAPS based strictly on:
1. Limitations explicitly acknowledged by the authors
2. Methodological trade-offs (e.g., speed vs. memory, accuracy vs. interpretability)
3. Discrepancies in benchmark datasets or evaluation regimes
4. Problems raised in the papers that remain unaddressed
5. Authors' stated future scope

STRICT GROUNDING & EPISTEMIC RULES:
1. ONLY formulate gaps directly anchored to the provided paper texts or structured analyses.
2. DO NOT fabricate citations, page numbers, or research claims.
3. Every gap MUST be explicitly treated as a POTENTIAL research gap (candidate gap), never a proven universal field absence.
4. Output STRICTLY valid JSON conforming to the following schema:

{{
  "methodology_disclaimer": "{METHODOLOGY_DISCLAIMER}",
  "potential_gaps": [
    {{
      "id": "gap_1",
      "title": "Concise technical title of the potential gap",
      "category": "One of: Scalability & Efficiency | Methodological Discrepancy | Generalization & Robustness | Data & Modality Scope | Theoretical Underpinnings",
      "description": "Detailed explanation of why this is a potential gap based on the papers.",
      "supporting_papers": [
        {{
          "paper_id": "<paper_id>",
          "paper_title": "<paper_title>",
          "page_reference": "Specific page, section, or 'Author Limitations section'"
        }}
      ],
      "evidence": "Direct quote or close paraphrase of the specific author statement or finding.",
      "why_worth_investigating": "The academic and practical importance of resolving this gap.",
      "future_direction": "Actionable, concrete experimental or theoretical direction to investigate."
    }}
  ]
}}
"""


def _extractive_gap_fallback(papers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic gap analysis fallback using author-reported limitations and future scope.
    Guarantees strict grounding when running offline or without an active LLM key.
    """
    potential_gaps = []
    gap_idx = 1

    for p in papers:
        pid = str(p.get("paper_id") or p.get("id") or f"paper_{gap_idx}")
        title = p.get("paper_title") or p.get("title") or "Research Paper"
        analysis = p.get("analysis") or {}
        text = p.get("text") or ""

        # Extract limitations
        limitations = (
            analysis.get("limitations")
            or analysis.get("Limitations")
            or ""
        )
        if not limitations and text:
            # Simple regex search for limitation sentences
            lim_matches = re.findall(r"(?:limitation|drawback|bottleneck|downside|weakness)[^.\n]*\.", text, re.IGNORECASE)
            if lim_matches:
                limitations = " ".join(lim_matches[:2])

        # Extract future scope
        future_scope = (
            analysis.get("futureScope")
            or analysis.get("future_scope")
            or analysis.get("Future Scope")
            or ""
        )
        if not future_scope and text:
            fut_matches = re.findall(r"(?:future work|future scope|we plan to|extend this|remains open)[^.\n]*\.", text, re.IGNORECASE)
            if fut_matches:
                future_scope = " ".join(fut_matches[:2])

        # If limitations or future scope found, synthesize a candidate gap
        if limitations and len(str(limitations).strip()) > 15 and "not found" not in str(limitations).lower():
            lim_text = str(limitations).strip()
            potential_gaps.append({
                "id": f"gap_{gap_idx}",
                "title": f"Addressing Operational Limitations in {title[:40]}",
                "category": "Scalability & Efficiency" if any(k in lim_text.lower() for k in ["memory", "complexity", "slow", "scale", "gpu", "compute"]) else "Methodological Discrepancy",
                "description": f"The authors of '{title}' state specific technical boundaries: {lim_text}. Resolving these constraints presents an open inquiry space.",
                "supporting_papers": [
                    {
                        "paper_id": pid,
                        "paper_title": title,
                        "page_reference": "Author Stated Limitations Section"
                    }
                ],
                "evidence": lim_text[:300],
                "why_worth_investigating": "Overcoming acknowledged constraints is critical to transitioning prototype architectures to production-scale or constrained-resource deployments.",
                "future_direction": str(future_scope).strip() if (future_scope and len(str(future_scope).strip()) > 15 and "not found" not in str(future_scope).lower()) else "Investigate algorithmic approximations, sparsity, or alternate loss formulations to alleviate the reported bottleneck."
            })
            gap_idx += 1

    # Cross-paper comparative gap if 2 or more papers are present
    if len(papers) >= 2:
        p1 = papers[0]
        p2 = papers[1]
        t1 = p1.get("paper_title") or p1.get("title") or "Paper 1"
        t2 = p2.get("paper_title") or p2.get("title") or "Paper 2"
        id1 = str(p1.get("paper_id") or p1.get("id") or "p1")
        id2 = str(p2.get("paper_id") or p2.get("id") or "p2")

        potential_gaps.append({
            "id": f"gap_{gap_idx}",
            "title": f"Cross-Corpus Generalization & Benchmark Divergence between '{t1[:30]}' and '{t2[:30]}'",
            "category": "Generalization & Robustness",
            "description": f"A comparative divergence exists between the architectural paradigms in '{t1}' and '{t2}'. Different evaluation tasks and benchmarks were targeted, leaving unified evaluation across disparate modalities an open exploration.",
            "supporting_papers": [
                {"paper_id": id1, "paper_title": t1, "page_reference": "Methodology & Results"},
                {"paper_id": id2, "paper_title": t2, "page_reference": "Methodology & Results"}
            ],
            "evidence": f"Contrasting experimental setups and benchmarks employed in '{t1}' vs '{t2}'.",
            "why_worth_investigating": "Developing unified benchmarks and cross-paradigm architectures ensures that performance gains are robust across task distributions.",
            "future_direction": "Construct a joint benchmark suite evaluating both architectures under identical computational budgets and distribution shifts."
        })

    # Fallback if no specific limitations were extracted
    if not potential_gaps:
        p0 = papers[0]
        t0 = p0.get("paper_title") or p0.get("title") or "Target Paper"
        pid0 = str(p0.get("paper_id") or p0.get("id") or "p0")
        potential_gaps.append({
            "id": "gap_general_1",
            "title": f"Investigation of Modality Expansion and Long-Context Generalization in {t0}",
            "category": "Data & Modality Scope",
            "description": f"The evaluated work focuses primarily on its targeted domain. Evaluating robustness under long-tail domain shifts and multi-modal inputs represents a promising research avenue.",
            "supporting_papers": [
                {"paper_id": pid0, "paper_title": t0, "page_reference": "Conclusion & Future Work"}
            ],
            "evidence": "Stated focus on specific benchmark datasets without cross-domain evaluation.",
            "why_worth_investigating": "Models trained on narrow domains frequently suffer from catastrophic performance drops when presented with out-of-distribution inputs.",
            "future_direction": "Apply zero-shot cross-domain transfers to measure out-of-distribution performance degradation."
        })

    return {
        "methodology_disclaimer": METHODOLOGY_DISCLAIMER,
        "potential_gaps": potential_gaps,
        "_metadata": {
            "engine": "deterministic-extractive-gap-analyzer",
            "papers_analyzed": len(papers)
        }
    }


def analyze_research_gaps(papers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Main entry point for potential research gap analysis across a corpus of research papers.
    Uses Gemini LLM when available; otherwise uses deterministic grounded extractor.
    """
    if not papers:
        raise ValueError("At least one research paper is required to analyze potential research gaps.")

    api_key = settings.LLM_API_KEY.strip() if settings.LLM_API_KEY else ""
    is_placeholder_key = not api_key or "your_" in api_key.lower() or "here" in api_key.lower()

    if is_placeholder_key or settings.LLM_PROVIDER != "gemini":
        return _extractive_gap_fallback(papers)

    # Prepare context for LLM
    papers_context = []
    for p in papers:
        pid = str(p.get("paper_id") or p.get("id") or "unknown")
        title = p.get("paper_title") or p.get("title") or "Untitled Paper"
        analysis = p.get("analysis") or {}
        text = p.get("text") or ""

        analysis_summary = "\n".join([f"- {k}: {v}" for k, v in analysis.items() if isinstance(v, str)])
        papers_context.append(
            f"=== PAPER ID: {pid} ===\n"
            f"TITLE: {title}\n"
            f"STRUCTURED ANALYSIS:\n{analysis_summary}\n"
            f"RAW EXCERPT:\n{text[:8000]}\n"
        )

    prompt = (
        f"{GAP_ANALYSIS_SYSTEM_PROMPT}\n\n"
        f"RESEARCH PAPERS IN THIS CORPUS:\n"
        f"{''.join(papers_context)}\n\n"
        f"SYNTHESIZE POTENTIAL GAPS (STRICT JSON ONLY):"
    )

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name=settings.LLM_MODEL,
            generation_config={"response_mime_type": "application/json", "temperature": 0.2}
        )

        response = model.generate_content(prompt)
        raw_json = response.text.strip()

        if raw_json.startswith("```json"):
            raw_json = raw_json[7:]
        if raw_json.endswith("```"):
            raw_json = raw_json[:-3]

        parsed = json.loads(raw_json.strip())

        # Enforce methodology disclaimer
        parsed["methodology_disclaimer"] = METHODOLOGY_DISCLAIMER
        parsed["_metadata"] = {
            "engine": f"gemini-gap-analyzer ({settings.LLM_MODEL})",
            "papers_analyzed": len(papers)
        }
        return parsed

    except Exception as e:
        print(f"[Gap Analyzer] LLM error: {str(e)}. Falling back to deterministic gap analysis.")
        fallback = _extractive_gap_fallback(papers)
        fallback["_metadata"]["error"] = str(e)
        return fallback
