import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from config.settings import settings


class ChromaVectorStore:
    """
    Manages persistent vector storage and semantic retrieval for research papers.
    Uses ChromaDB with local persistence in data/chroma/.
    """
    def __init__(self, persist_dir: Optional[str] = None):
        self.persist_dir = persist_dir or settings.CHROMA_PERSIST_DIRECTORY
        Path(self.persist_dir).mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False)
        )

    def _sanitize_collection_name(self, project_id: str) -> str:
        """
        Chroma collection names must be 3-63 characters, start/end with alnum,
        and contain only [a-zA-Z0-9._-].
        """
        clean_id = re.sub(r'[^a-zA-Z0-9_-]', '_', str(project_id))
        name = f"proj_{clean_id}"
        if len(name) > 60:
            name = name[:60]
        return name

    def get_or_create_collection(self, project_id: str):
        collection_name = self._sanitize_collection_name(project_id)
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"project_id": str(project_id)}
        )

    def index_chunks(self, project_id: str, chunks: List[Dict[str, Any]]) -> int:
        """
        Add document chunks to the project collection with metadata.
        """
        if not chunks:
            return 0

        collection = self.get_or_create_collection(project_id)

        ids = [c["chunk_id"] for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        # Chroma automatically generates embeddings using ONNX all-MiniLM-L6-v2 by default
        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

        return len(chunks)

    def query_relevant_chunks(
        self,
        project_id: str,
        query: str,
        n_results: int = 4,
        paper_id_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform dense semantic retrieval to retrieve top-k relevant chunks with citations.
        """
        collection = self.get_or_create_collection(project_id)

        if collection.count() == 0:
            return []

        where_filter = None
        if paper_id_filter:
            where_filter = {"paper_id": str(paper_id_filter)}

        # Cap n_results to collection size
        limit = min(n_results, collection.count())
        if limit <= 0:
            return []

        results = collection.query(
            query_texts=[query],
            n_results=limit,
            where=where_filter
        )

        matched_chunks = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)

            for i in range(len(docs)):
                matched_chunks.append({
                    "text": docs[i],
                    "metadata": metas[i],
                    "paper_title": metas[i].get("paper_title", "Unknown Paper"),
                    "page_number": metas[i].get("page_number", 1),
                    "paper_id": metas[i].get("paper_id", ""),
                    "similarity_distance": distances[i] if i < len(distances) else 0.0
                })

        return matched_chunks

    def delete_paper_chunks(self, project_id: str, paper_id: str) -> None:
        """
        Remove all vector chunks belonging to a deleted research paper.
        """
        collection = self.get_or_create_collection(project_id)
        collection.delete(where={"paper_id": str(paper_id)})


# Global Singleton Vector Store Instance
vector_store = ChromaVectorStore()
