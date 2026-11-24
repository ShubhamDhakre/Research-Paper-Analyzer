"""
Citation Verification Module
Rigorously evaluates citations and claims extracted from research answers or literature reviews.

CRITICAL ARCHITECTURAL RULE:
Clearly distinguish citation existence from claim support:
1. Paper existence: Does the cited paper exist in the project repository?
2. Page existence: Does the cited page exist within the document's page range?
3. Claim support: Does the source text on that page actually support the factual assertion?

NEVER mark a citation as verified merely because the paper exists.
"""

import re
from typing import List, Dict, Any, Optional
from config.settings import settings


def _evaluate_claim_support_lexical(claim: str, source_text: str) -> Dict[str, Any]:
    """
    Deterministic lexical & semantic overlap evaluation when running offline or without LLM.
    Identifies key entities, numerical figures, and keywords from the claim.
    """
    if not source_text or not source_text.strip():
        return {
            "status": "UNSUPPORTED",
            "confidence": 0.1,
            "evidence_snippet": "No readable text found on the cited page.",
            "reasoning": "The target page contains no text to evaluate support."
        }

    # Extract numerical figures and acronyms/proper nouns from claim
    numbers_in_claim = re.findall(r"\b\d+(?:\.\d+)?%?\b", claim)
    words_in_claim = set(re.findall(r"\b[a-zA-Z]{4,}\b", claim.lower()))

    # Ignore common stop words
    stop_words = {"this", "that", "these", "those", "with", "from", "which", "about", "using", "paper", "model", "demonstrate", "propose", "shows"}
    substantive_words = words_in_claim - stop_words

    source_lower = source_text.lower()

    # Check numerical alignment
    numbers_matched = [num for num in numbers_in_claim if num in source_text]
    words_matched = [w for w in substantive_words if w in source_lower]

    match_ratio = len(words_matched) / max(len(substantive_words), 1)

    # Find closest snippet in source text containing matched words
    sentences = re.split(r"(?<=[.!?])\s+", source_text)
    best_sentence = ""
    best_score = 0
    for s in sentences:
        s_lower = s.lower()
        score = sum(1 for w in substantive_words if w in s_lower)
        if score > best_score:
            best_score = score
            best_sentence = s

    if not best_sentence and sentences:
        best_sentence = sentences[0]

    # Evaluate claim support
    # If the claim asserts quantitative numbers/percentages that do not appear on the cited page:
    if numbers_in_claim and not numbers_matched:
        return {
            "status": "UNSUPPORTED",
            "confidence": 0.85,
            "evidence_snippet": best_sentence[:300].strip() if best_sentence else "",
            "reasoning": f"Key quantitative metric(s) {numbers_in_claim} in claim were not found on the cited page."
        }

    if (numbers_matched and match_ratio >= 0.3) or (match_ratio >= 0.6):
        return {
            "status": "SUPPORTED",
            "confidence": min(0.6 + (match_ratio * 0.4), 0.95),
            "evidence_snippet": best_sentence[:300].strip(),
            "reasoning": f"Cited text on page contains {len(words_matched)} matching terms" + (f" and confirmed figures {numbers_matched}." if numbers_matched else ".")
        }
    else:
        return {
            "status": "UNSUPPORTED",
            "confidence": 0.70,
            "evidence_snippet": best_sentence[:300].strip() if best_sentence else "No relevant sentence located on cited page.",
            "reasoning": f"Insufficient factual overlap with claim (only {len(words_matched)} of {len(substantive_words)} key concepts matched on cited page)."
        }


def verify_citation_claim(
    claim: str,
    cited_paper_id: str,
    cited_page_number: Optional[int],
    project_papers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Verify a single citation and claim against the project paper corpus.
    """
    # 1. Paper Existence Check
    matched_paper = None
    for p in project_papers:
        pid = str(p.get("paper_id") or p.get("id") or p.get("_id") or "")
        title = (p.get("paper_title") or p.get("title") or "").lower()
        if pid == str(cited_paper_id) or (cited_paper_id.lower() in title and len(cited_paper_id) > 4):
            matched_paper = p
            break

    if not matched_paper:
        return {
            "claim": claim,
            "cited_paper_id": cited_paper_id,
            "cited_page_number": cited_page_number,
            "paper_exists": False,
            "page_exists": False,
            "claim_support_status": "INVALID_REFERENCE",
            "support_confidence": 0.0,
            "evidence_snippet": None,
            "verification_summary": f"Citation verification FAILED: Cited paper '{cited_paper_id}' does not exist in the project repository."
        }

    paper_title = matched_paper.get("paper_title") or matched_paper.get("title") or "Untitled Paper"
    total_pages = matched_paper.get("total_pages") or len(matched_paper.get("pages") or []) or 1
    pages_data = matched_paper.get("pages") or []

    # 2. Page Existence Check
    if cited_page_number is None or cited_page_number < 1:
        # Cited without specific page number
        target_page_text = "\n\n".join([p.get("text", "") for p in pages_data[:3]])
        page_exists = True
        page_note = "No specific page provided; evaluated against first pages of paper."
    elif cited_page_number > total_pages:
        return {
            "claim": claim,
            "cited_paper_id": str(matched_paper.get("paper_id") or matched_paper.get("id")),
            "paper_title": paper_title,
            "cited_page_number": cited_page_number,
            "paper_exists": True,
            "page_exists": False,
            "claim_support_status": "INVALID_PAGE",
            "support_confidence": 0.0,
            "evidence_snippet": None,
            "verification_summary": (
                f"Page existence check FAILED: Cited page {cited_page_number} exceeds total document pages "
                f"({total_pages}) for '{paper_title}'. Paper exists, but cited reference is invalid."
            )
        }
    else:
        page_exists = True
        target_page_obj = next((p for p in pages_data if p.get("page_number") == cited_page_number), None)
        target_page_text = target_page_obj.get("text", "") if target_page_obj else ""
        page_note = f"Verified page {cited_page_number} of {total_pages}."

    # 3. Grounding / Claim Support Check (Semantic / Lexical)
    eval_result = _evaluate_claim_support_lexical(claim, target_page_text)

    status_str = eval_result["status"]
    conf = eval_result["confidence"]
    snippet = eval_result["evidence_snippet"]
    reasoning = eval_result["reasoning"]

    if status_str == "SUPPORTED":
        summary = (
            f"VERIFIED: Paper exists in project ('{paper_title}'), page {cited_page_number or 1} exists, "
            f"and the claim is SUPPORTED by the text on that page ({int(conf * 100)}% confidence). {reasoning}"
        )
    else:
        summary = (
            f"NOT VERIFIED: Paper and page exist in project ('{paper_title}'), but the claim is UNSUPPORTED "
            f"by the text on page {cited_page_number or 1}. {reasoning}"
        )

    return {
        "claim": claim,
        "cited_paper_id": str(matched_paper.get("paper_id") or matched_paper.get("id")),
        "paper_title": paper_title,
        "cited_page_number": cited_page_number,
        "paper_exists": True,
        "page_exists": page_exists,
        "claim_support_status": status_str,
        "support_confidence": conf,
        "evidence_snippet": snippet,
        "verification_summary": summary
    }


def verify_citations_batch(
    citations_to_verify: List[Dict[str, Any]],
    project_papers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Verify multiple citation-claim pairs against a project corpus.
    """
    if not citations_to_verify:
        raise ValueError("At least one citation claim must be provided for verification.")

    verified_items = []
    stats = {
        "total_checked": len(citations_to_verify),
        "papers_found": 0,
        "pages_valid": 0,
        "claims_supported": 0,
        "claims_unsupported": 0,
        "invalid_references": 0
    }

    for item in citations_to_verify:
        claim = item.get("claim") or item.get("text") or ""
        paper_id = str(item.get("cited_paper_id") or item.get("paper_id") or item.get("paperId") or "")
        page_num = item.get("cited_page_number") or item.get("page_number") or item.get("pageNumber")
        if page_num is not None:
            try:
                page_num = int(page_num)
            except (ValueError, TypeError):
                page_num = None

        result = verify_citation_claim(
            claim=claim,
            cited_paper_id=paper_id,
            cited_page_number=page_num,
            project_papers=project_papers
        )

        # Update statistics
        if result["paper_exists"]:
            stats["papers_found"] += 1
        else:
            stats["invalid_references"] += 1

        if result["page_exists"]:
            stats["pages_valid"] += 1

        if result["claim_support_status"] == "SUPPORTED":
            stats["claims_supported"] += 1
        elif result["claim_support_status"] == "UNSUPPORTED":
            stats["claims_unsupported"] += 1

        verified_items.append(result)

    return {
        "statistics": stats,
        "results": verified_items,
        "_metadata": {
            "engine": "strict-citation-verifier-v1",
            "distinguishes_existence_from_support": True
        }
    }
