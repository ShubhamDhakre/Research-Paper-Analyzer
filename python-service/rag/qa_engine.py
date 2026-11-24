import json
from typing import Dict, Any, List, Optional
from vector_store.chroma_client import vector_store
from config.settings import settings

RAG_SYSTEM_PROMPT = """
You are an expert AI Research Assistant. Your job is to answer the researcher's query
STRICTLY AND EXCLUSIVELY based on the provided research paper excerpts.

CRITICAL GROUNDING RULES:
1. Base your answer ONLY on the provided excerpts. Do NOT assume, fabricate, or extrapolate facts.
2. If the excerpts do NOT contain sufficient information to answer the question, state clearly:
   "I cannot find sufficient evidence in the uploaded research papers to answer this question."
3. Every factual statement or finding MUST include an inline citation citing the paper and page number,
   for example: [Attention Is All You Need, Page 4].
4. Clearly distinguish facts directly found in the papers from general background terminology.
5. Never invent or hallucinate citations or page numbers.
"""


def _extractive_qa_fallback(query: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic answer generator when LLM API key is not configured or offline.
    Synthesizes the most relevant text passages with verified citations.
    """
    if not chunks:
        return {
            "answer": "I cannot find sufficient evidence in the uploaded research papers to answer this question. Please ensure papers are uploaded and indexed.",
            "citations": [],
            "grounded": False
        }

    # Synthesize top matches
    top_chunk = chunks[0]
    answer_text = (
        f"Based on the indexed paper \"{top_chunk['paper_title']}\" (Page {top_chunk['page_number']}):\n\n"
        f"\"{top_chunk['text']}\"\n\n"
        f"[Source: {top_chunk['paper_title']}, Page {top_chunk['page_number']}]"
    )

    citations = [
        {
            "paper_title": c["paper_title"],
            "page_number": c["page_number"],
            "excerpt": c["text"][:180] + ("..." if len(c["text"]) > 180 else "")
        }
        for c in chunks
    ]

    return {
        "answer": answer_text,
        "citations": citations,
        "grounded": True,
        "_metadata": {
            "engine": "extractive-rag-fallback",
            "retrieved_chunks": len(chunks)
        }
    }


def answer_research_question(
    project_id: str,
    query: str,
    paper_id_filter: Optional[str] = None,
    n_results: int = 4
) -> Dict[str, Any]:
    """
    Retrieve relevant chunks from ChromaDB and generate a grounded, cited answer using LLM.
    """
    # 1. Retrieve top-k semantic chunks from ChromaDB
    chunks = vector_store.query_relevant_chunks(
        project_id=project_id,
        query=query,
        n_results=n_results,
        paper_id_filter=paper_id_filter
    )

    if not chunks:
        return {
            "answer": "I cannot find sufficient evidence in the uploaded research papers to answer this question. No indexed chunks were found for this project.",
            "citations": [],
            "grounded": False
        }

    # Extract clean citations
    citations = [
        {
            "paper_title": c["paper_title"],
            "page_number": c["page_number"],
            "excerpt": c["text"][:180] + ("..." if len(c["text"]) > 180 else "")
        }
        for c in chunks
    ]

    # 2. Check if LLM API key is available
    api_key = settings.LLM_API_KEY.strip() if settings.LLM_API_KEY else ""
    is_placeholder_key = not api_key or "your_" in api_key.lower() or "here" in api_key.lower()

    if is_placeholder_key or settings.LLM_PROVIDER != "gemini":
        return _extractive_qa_fallback(query, chunks)

    # 3. Format Context Snippets for LLM
    context_blocks = []
    for idx, c in enumerate(chunks, 1):
        context_blocks.append(
            f"[Excerpt {idx}]\n"
            f"Paper: {c['paper_title']}\n"
            f"Page: {c['page_number']}\n"
            f"Content: {c['text']}\n"
        )
    formatted_context = "\n".join(context_blocks)

    user_prompt = (
        f"{RAG_SYSTEM_PROMPT}\n\n"
        f"RETRIEVED EXCERPTS:\n{formatted_context}\n\n"
        f"USER QUESTION: {query}\n\n"
        f"GROUNDED ANSWER (with citations):"
    )

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name=settings.LLM_MODEL)
        response = model.generate_content(user_prompt)

        return {
            "answer": response.text.strip(),
            "citations": citations,
            "grounded": True,
            "_metadata": {
                "engine": f"gemini-rag ({settings.LLM_MODEL})",
                "retrieved_chunks": len(chunks)
            }
        }
    except Exception as e:
        print(f"[RAG QA Engine] LLM generation error: {str(e)}. Falling back to extractive answer.")
        fallback = _extractive_qa_fallback(query, chunks)
        fallback["_metadata"]["error"] = str(e)
        return fallback
