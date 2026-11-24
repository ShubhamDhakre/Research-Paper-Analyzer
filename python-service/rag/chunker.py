import re
from typing import List, Dict, Any


def chunk_paper_pages(
    pages: List[Dict[str, Any]],
    paper_id: str,
    paper_title: str,
    chunk_size: int = 600,
    chunk_overlap: int = 100
) -> List[Dict[str, Any]]:
    """
    Divide page-by-page extracted text into semantically coherent overlapping chunks.
    Crucial Rule: Every chunk preserves paper_id, paper_title, and page_number for citation tracking.

    :param pages: List of dicts with 'page_number' and 'text'
    :param paper_id: Unique paper identifier
    :param paper_title: Human-readable paper title
    :param chunk_size: Target character length per chunk (default: 600)
    :param chunk_overlap: Overlapping characters between consecutive chunks (default: 100)
    :return: List of chunk dicts ready for embedding and ChromaDB indexing
    """
    all_chunks: List[Dict[str, Any]] = []

    for page in pages:
        page_num = page.get("page_number", 1)
        page_text = page.get("text", "").strip()

        if not page_text:
            continue

        # If page text is shorter than chunk_size, keep as a single chunk
        if len(page_text) <= chunk_size:
            chunk_id = f"{paper_id}_p{page_num}_c0"
            all_chunks.append({
                "chunk_id": chunk_id,
                "text": page_text,
                "metadata": {
                    "paper_id": str(paper_id),
                    "paper_title": str(paper_title),
                    "page_number": int(page_num),
                    "chunk_index": 0,
                    "character_count": len(page_text)
                }
            })
            continue

        # Split long page text with step = chunk_size - chunk_overlap
        start = 0
        step = max(chunk_size - chunk_overlap, 100)
        chunk_idx = 0

        while start < len(page_text):
            end = start + chunk_size
            chunk_content = page_text[start:end].strip()

            if len(chunk_content) > 30: # Filter out noise fragments
                chunk_id = f"{paper_id}_p{page_num}_c{chunk_idx}"
                all_chunks.append({
                    "chunk_id": chunk_id,
                    "text": chunk_content,
                    "metadata": {
                        "paper_id": str(paper_id),
                        "paper_title": str(paper_title),
                        "page_number": int(page_num),
                        "chunk_index": chunk_idx,
                        "character_count": len(chunk_content)
                    }
                })
                chunk_idx += 1

            start += step

    return all_chunks
