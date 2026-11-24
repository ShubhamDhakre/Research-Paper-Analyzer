import os
import json
import re
from typing import Dict, Any, Optional
from config.settings import settings

ANALYSIS_SYSTEM_PROMPT = """
You are an expert academic peer-reviewer and computer science researcher.
Your task is to analyze the provided research paper text and generate an accurate, structured 12-section technical summary.

You must strictly output a valid JSON object with the following 12 keys:
{
  "paper_title": "Official paper title",
  "abstract_summary": "Concise summary of the abstract and core premise",
  "research_problem": "The fundamental problem or research gap addressed by the authors",
  "research_objectives": "Explicit goals and intended milestones of the paper",
  "proposed_methodology": "The architectural, theoretical, or experimental methodology proposed",
  "algorithms_techniques": "Specific mathematical formulations, algorithms, or techniques used (e.g. attention, loss functions)",
  "datasets_used": "Names, sizes, and descriptions of benchmark datasets used",
  "experimental_setup": "Hardware (e.g. GPUs), hyperparameters, training time, and baselines",
  "results_findings": "Key empirical findings, metrics (e.g. BLEU, accuracy, F1), and state-of-the-art comparisons",
  "advantages": "Key strengths and improvements over prior work stated in the text",
  "limitations": "Direct limitations or failure modes acknowledged by the authors",
  "future_scope": "Future research directions explicitly noted by the authors"
}

STRICT GROUNDING RULES:
1. Rely ONLY on the information present in the paper text.
2. DO NOT fabricate findings, benchmarks, datasets, or metrics.
3. If the paper does NOT contain sufficient information for a specific section, you MUST output:
   "Information not found or not specified in paper text"
4. Output valid JSON only, without markdown markdown code blocks or explanatory prefixes.
"""


def _extractive_fallback_analysis(text: str, title: str) -> Dict[str, Any]:
    """
    Deterministic rule-based extractor used when LLM API key is not configured.
    Scans for academic sections and extracts initial sentences.
    """
    def find_section_text(keywords, default_text="Information not found or not specified in paper text"):
        for kw in keywords:
            pattern = rf"(?i)(?:{kw}[:\n\r])(.*?)(?=\n[A-Z0-9\s]{{3,25}}[:\n]|\Z)"
            match = re.search(pattern, text, re.DOTALL)
            if match and len(match.group(1).strip()) > 20:
                extracted = match.group(1).strip()[:500]
                return extracted.replace('\n', ' ')
        return default_text

    return {
        "paper_title": title or "Untitled Research Document",
        "abstract_summary": find_section_text(["abstract", "summary", "overview"]),
        "research_problem": find_section_text(["problem", "background", "motivation"]),
        "research_objectives": find_section_text(["objective", "goal", "in this paper we"]),
        "proposed_methodology": find_section_text(["methodology", "method", "proposed architecture", "model architecture"]),
        "algorithms_techniques": find_section_text(["algorithm", "attention mechanism", "technique", "formulation"]),
        "datasets_used": find_section_text(["dataset", "benchmark", "data collection", "wmt", "corpus"]),
        "experimental_setup": find_section_text(["experimental setup", "training setup", "implementation details", "hardware"]),
        "results_findings": find_section_text(["results", "findings", "empirical evaluation", "bleu"]),
        "advantages": find_section_text(["advantage", "strength", "superiority", "benefits"]),
        "limitations": find_section_text(["limitation", "bottleneck", "weakness"]),
        "future_scope": find_section_text(["future work", "future scope", "conclusion"]),
        "_metadata": {
            "engine": "extractive-fallback",
            "notice": "LLM_API_KEY was not configured or offline. Generated via deterministic structural parser."
        }
    }


def analyze_paper_text(text: str, title: str = "Untitled Paper") -> Dict[str, Any]:
    """
    Generate structured 12-section research analysis using Google Gemini or configured LLM.
    Falls back gracefully if LLM_API_KEY is not configured.
    """
    api_key = settings.LLM_API_KEY.strip() if settings.LLM_API_KEY else ""
    is_placeholder_key = not api_key or "your_" in api_key.lower() or "here" in api_key.lower()

    if is_placeholder_key:
        print("[LLM Analyzer] LLM_API_KEY not configured. Using deterministic extractor.")
        return _extractive_fallback_analysis(text, title)

    try:
        if settings.LLM_PROVIDER == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)

            model = genai.GenerativeModel(
                model_name=settings.LLM_MODEL,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.1
                }
            )

            prompt = f"{ANALYSIS_SYSTEM_PROMPT}\n\nPAPER TITLE: {title}\n\nPAPER CONTENT:\n{text[:25000]}"
            response = model.generate_content(prompt)

            raw_json = response.text.strip()
            # Clean possible markdown block if returned
            if raw_json.startswith("```json"):
                raw_json = raw_json[7:]
            if raw_json.endswith("```"):
                raw_json = raw_json[:-3]

            parsed = json.loads(raw_json.strip())
            parsed["_metadata"] = {
                "engine": f"gemini ({settings.LLM_MODEL})",
                "status": "grounded_ai_analysis"
            }
            return parsed
        else:
            return _extractive_fallback_analysis(text, title)

    except Exception as e:
        print(f"[LLM Analyzer] Error invoking Gemini API: {str(e)}. Falling back to deterministic extractor.")
        fallback = _extractive_fallback_analysis(text, title)
        fallback["_metadata"]["error"] = f"LLM Call Failed: {str(e)}"
        return fallback
