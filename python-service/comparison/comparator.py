import json
import re
from typing import List, Dict, Any
from config.settings import settings

COMPARISON_DIMENSIONS = [
    {"key": "research_objectives", "label": "Research Objectives"},
    {"key": "problem_statements", "label": "Problem Statements"},
    {"key": "methodologies", "label": "Methodologies"},
    {"key": "algorithms", "label": "Algorithms & Techniques"},
    {"key": "datasets", "label": "Datasets Used"},
    {"key": "results", "label": "Results & Findings"},
    {"key": "advantages", "label": "Advantages & Strengths"},
    {"key": "limitations", "label": "Limitations"},
    {"key": "research_contributions", "label": "Research Contributions"},
    {"key": "future_scope", "label": "Future Scope"}
]

COMPARISON_SYSTEM_PROMPT = """
You are an expert academic peer-reviewer and comparative research analyst.
Your task is to compare two or more research papers side-by-side across EXACTLY these 10 dimensions:
1. research_objectives: Explicit research objectives and goals
2. problem_statements: The specific technical problem being solved
3. methodologies: Architectural or theoretical approach
4. algorithms: Algorithms, mathematical formulas, or techniques
5. datasets: Datasets, benchmarks, and corpus scale
6. results: Quantitative findings, metrics, and state-of-the-art results
7. advantages: Advantages and strengths reported by authors
8. limitations: Weaknesses, bottlenecks, and failure modes stated
9. research_contributions: Key novel contributions to the research field
10. future_scope: Stated future research directions

STRICT GROUNDING RULES:
1. Rely ONLY on the information provided for each paper.
2. DO NOT fabricate findings or extrapolate unstated facts.
3. If a paper does not mention information for a dimension, output: "Information not found or not specified in paper text".
4. Output strictly valid JSON matching this schema:
{
  "summary": "Concise architectural contrast across the papers",
  "dimensions": [
    {
      "dimension_key": "research_objectives",
      "dimension_label": "Research Objectives",
      "comparison": {
        "<paper_id_1>": "...",
        "<paper_id_2>": "..."
      }
    },
    ...
  ]
}
"""


def _extractive_comparison_fallback(papers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic fallback when LLM API key is not configured or in offline mode.
    Maps pre-extracted analysis or uses regex extraction per paper.
    """
    dimensions_result = []

    for dim in COMPARISON_DIMENSIONS:
        dim_key = dim["key"]
        dim_label = dim["label"]
        comp_map = {}

        for p in papers:
            pid = str(p.get("paper_id") or p.get("id") or "paper")
            analysis = p.get("analysis") or {}

            # Map analysis keys to dimension keys if available
            key_mapping = {
                "research_objectives": analysis.get("researchObjectives") or analysis.get("research_objectives"),
                "problem_statements": analysis.get("researchProblem") or analysis.get("research_problem"),
                "methodologies": analysis.get("proposedMethodology") or analysis.get("proposed_methodology"),
                "algorithms": analysis.get("algorithmsTechniques") or analysis.get("algorithms_techniques"),
                "datasets": analysis.get("datasetsUsed") or analysis.get("datasets_used"),
                "results": analysis.get("resultsFindings") or analysis.get("results_findings"),
                "advantages": analysis.get("advantages"),
                "limitations": analysis.get("limitations"),
                "research_contributions": analysis.get("abstractSummary") or analysis.get("abstract_summary"),
                "future_scope": analysis.get("futureScope") or analysis.get("future_scope")
            }

            val = key_mapping.get(dim_key)
            if not val or len(str(val).strip()) < 10:
                comp_map[pid] = "Information not found or not specified in paper text"
            else:
                comp_map[pid] = str(val).strip()

        dimensions_result.append({
            "dimension_key": dim_key,
            "dimension_label": dim_label,
            "comparison": comp_map
        })

    titles = [p.get("paper_title") or p.get("title") or "Paper" for p in papers]
    return {
        "summary": f"Comparative structural synthesis of {len(papers)} papers: {', '.join(titles)}.",
        "dimensions": dimensions_result,
        "_metadata": {
            "engine": "deterministic-comparison-fallback",
            "papers_count": len(papers)
        }
    }


def compare_research_papers(papers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compare multiple research papers across 10 academic dimensions using LLM or deterministic fallback.
    """
    if len(papers) < 2:
        raise ValueError("At least two research papers are required for comparative analysis.")

    api_key = settings.LLM_API_KEY.strip() if settings.LLM_API_KEY else ""
    is_placeholder_key = not api_key or "your_" in api_key.lower() or "here" in api_key.lower()

    if is_placeholder_key or settings.LLM_PROVIDER != "gemini":
        return _extractive_comparison_fallback(papers)

    # Format papers context for LLM
    papers_context = []
    for p in papers:
        pid = str(p.get("paper_id") or p.get("id"))
        title = p.get("paper_title") or p.get("title") or "Untitled Paper"
        text = p.get("text") or ""
        analysis = p.get("analysis") or {}

        # If full text is not passed, use structured analysis string
        if not text and analysis:
            text = "\n".join([f"{k}: {v}" for k, v in analysis.items() if isinstance(v, str)])

        papers_context.append(
            f"=== PAPER ID: {pid} ===\n"
            f"TITLE: {title}\n"
            f"CONTENT:\n{text[:12000]}\n"
        )

    formatted_prompt = (
        f"{COMPARISON_SYSTEM_PROMPT}\n\n"
        f"RESEARCH PAPERS TO COMPARE:\n"
        f"{''.join(papers_context)}\n\n"
        f"OUTPUT (JSON ONLY):"
    )

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        model = genai.GenerativeModel(
            model_name=settings.LLM_MODEL,
            generation_config={"response_mime_type": "application/json", "temperature": 0.1}
        )

        response = model.generate_content(formatted_prompt)
        raw_json = response.text.strip()

        if raw_json.startswith("```json"):
            raw_json = raw_json[7:]
        if raw_json.endswith("```"):
            raw_json = raw_json[:-3]

        parsed = json.loads(raw_json.strip())
        parsed["_metadata"] = {
            "engine": f"gemini-comparison ({settings.LLM_MODEL})",
            "papers_count": len(papers)
        }
        return parsed

    except Exception as e:
        print(f"[Comparison Engine] LLM generation error: {str(e)}. Using fallback.")
        fallback = _extractive_comparison_fallback(papers)
        fallback["_metadata"]["error"] = str(e)
        return fallback
