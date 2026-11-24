import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import settings
from pdf_processing.extractor import (
    extract_pdf_data,
    PDFProcessingError,
    PDFPasswordProtectedError,
    PDFCorruptedError,
    PDFEmptyError
)
from analysis.analyzer import analyze_paper_text
from rag.chunker import chunk_paper_pages
from vector_store.chroma_client import vector_store
from rag.qa_engine import answer_research_question
from comparison.comparator import compare_research_papers
from research_gaps.gap_analyzer import analyze_research_gaps
from literature_review.generator import generate_literature_review
from citation_verification.verifier import verify_citations_batch

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python AI Service providing PDF extraction, ChromaDB RAG, research analysis, and citation verification."
)

origins = [
    settings.CLIENT_URL,
    settings.BACKEND_URL,
    "http://localhost:5000",
    "http://localhost:5173",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

START_TIME = time.time()


class ProcessPathRequest(BaseModel):
    file_path: str
    original_filename: Optional[str] = None
    project_id: Optional[str] = None
    paper_id: Optional[str] = None


class AnalyzePaperRequest(BaseModel):
    file_path: Optional[str] = None
    paper_text: Optional[str] = None
    paper_title: Optional[str] = "Untitled Paper"


class IndexPaperRequest(BaseModel):
    project_id: str
    paper_id: str
    paper_title: str
    file_path: Optional[str] = None
    pages: Optional[List[Dict[str, Any]]] = None


class ChatQueryRequest(BaseModel):
    project_id: str
    query: str
    paper_id_filter: Optional[str] = None
    top_k: Optional[int] = 4


class ComparePapersRequest(BaseModel):
    papers: List[Dict[str, Any]]


class AnalyzeGapsRequest(BaseModel):
    papers: List[Dict[str, Any]]


class GenerateReviewRequest(BaseModel):
    papers: List[Dict[str, Any]]
    theme: Optional[str] = None


class VerifyCitationsRequest(BaseModel):
    citations: List[Dict[str, Any]]
    papers: List[Dict[str, Any]]


@app.get("/")
def read_root():
    return {
        "status": "success",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    uptime_seconds = int(time.time() - START_TIME)
    return {
        "status": "ok",
        "service": "python-ai-service",
        "uptime": f"{uptime_seconds}s",
        "environment": settings.ENVIRONMENT,
        "llm_provider": settings.LLM_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL
    }


@app.post("/process-pdf")
async def process_pdf(
    file: Optional[UploadFile] = File(None),
    file_path: Optional[str] = Form(None),
    original_filename: Optional[str] = Form(None),
    project_id: Optional[str] = Form(None),
    paper_id: Optional[str] = Form(None)
):
    try:
        if file is not None:
            contents = await file.read()
            filename = original_filename or file.filename
            result = extract_pdf_data(contents, filename=filename)
        elif file_path:
            result = extract_pdf_data(file_path, filename=original_filename)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided. Either upload a PDF file or provide a valid 'file_path'."
            )

        if project_id and paper_id and result.get("pages"):
            chunks = chunk_paper_pages(
                pages=result["pages"],
                paper_id=paper_id,
                paper_title=result.get("title", filename or "Untitled Paper")
            )
            indexed_count = vector_store.index_chunks(project_id, chunks)
            result["chunks_indexed"] = indexed_count

        return result

    except PDFPasswordProtectedError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except PDFEmptyError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PDFCorruptedError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/process-pdf-path")
async def process_pdf_by_path(req: ProcessPathRequest):
    try:
        result = extract_pdf_data(req.file_path, filename=req.original_filename)

        if req.project_id and req.paper_id and result.get("pages"):
            chunks = chunk_paper_pages(
                pages=result["pages"],
                paper_id=req.paper_id,
                paper_title=result.get("title", req.original_filename or "Untitled Paper")
            )
            indexed_count = vector_store.index_chunks(req.project_id, chunks)
            result["chunks_indexed"] = indexed_count

        return result
    except PDFPasswordProtectedError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except PDFEmptyError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PDFCorruptedError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/index-paper-chunks")
async def index_paper_chunks(req: IndexPaperRequest):
    pages_to_index = req.pages or []

    if not pages_to_index and req.file_path:
        pdf_data = extract_pdf_data(req.file_path, filename=req.paper_title)
        pages_to_index = pdf_data.get("pages", [])

    if not pages_to_index:
        raise HTTPException(status_code=400, detail="No readable pages found to index.")

    chunks = chunk_paper_pages(
        pages=pages_to_index,
        paper_id=req.paper_id,
        paper_title=req.paper_title
    )
    indexed_count = vector_store.index_chunks(req.project_id, chunks)

    return {
        "status": "success",
        "project_id": req.project_id,
        "paper_id": req.paper_id,
        "chunks_indexed": indexed_count
    }


@app.post("/chat-query")
async def chat_query(req: ChatQueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    result = answer_research_question(
        project_id=req.project_id,
        query=req.query,
        paper_id_filter=req.paper_id_filter,
        n_results=req.top_k or 4
    )

    return {
        "status": "success",
        "data": result
    }


@app.post("/analyze-paper")
async def analyze_paper(req: AnalyzePaperRequest):
    text_to_analyze = req.paper_text or ""

    if not text_to_analyze and req.file_path:
        try:
            pdf_data = extract_pdf_data(req.file_path, filename=req.paper_title)
            text_to_analyze = "\n\n".join([f"--- Page {p['page_number']} ---\n{p['text']}" for p in pdf_data["pages"]])
            if not req.paper_title or req.paper_title == "Untitled Paper":
                req.paper_title = pdf_data.get("title", req.paper_title)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Failed to extract text from PDF: {str(e)}")

    if not text_to_analyze.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No readable text available to analyze.")

    analysis_result = analyze_paper_text(text_to_analyze, title=req.paper_title or "Research Paper")
    return {
        "status": "success",
        "data": analysis_result
    }


@app.post("/compare-papers")
async def compare_papers(req: ComparePapersRequest):
    """
    Compare 2 or more research papers across 10 academic dimensions.
    """
    if not req.papers or len(req.papers) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two research papers are required to generate a comparison."
        )

    try:
        comparison = compare_research_papers(req.papers)
        return {
            "status": "success",
            "data": comparison
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@app.post("/analyze-research-gaps")
async def analyze_gaps_endpoint(req: AnalyzeGapsRequest):
    """
    Synthesize potential research gaps across a collection of research papers.
    """
    if not req.papers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one research paper is required to analyze potential research gaps."
        )

    try:
        result = analyze_research_gaps(req.papers)
        return {
            "status": "success",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")


@app.post("/generate-literature-review")
async def generate_review_endpoint(req: GenerateReviewRequest):
    """
    Synthesize an academic literature review from a corpus of research papers.
    """
    if not req.papers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one research paper is required to generate a literature review."
        )

    try:
        result = generate_literature_review(req.papers, theme=req.theme)
        return {
            "status": "success",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Review generation failed: {str(e)}")


@app.post("/verify-citations")
async def verify_citations_endpoint(req: VerifyCitationsRequest):
    """
    Rigorously verify citations and claims against the project paper corpus.
    Distinguishes citation existence from claim support.
    """
    if not req.citations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one citation claim must be provided for verification."
        )

    try:
        result = verify_citations_batch(req.citations, req.papers)
        return {
            "status": "success",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Citation verification failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
