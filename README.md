# AI Research Paper Analyzer & Research Assistant

An intermediate-level, production-grade academic research platform designed for computer science engineering students, researchers, and developers. The system enables users to upload PDF research papers, extract structured technical analyses, query documents using Retrieval-Augmented Generation (RAG) with grounded page-level citations, contrast multiple papers across 10 academic dimensions, discover potential research gaps, generate publication-ready literature review drafts, and strictly verify citations against document text.

---

## 🏛️ System Architecture

The application is structured into three decoupled, modular tiers communicating via predictable REST APIs:

```
┌─────────────────────────────────────────────────────────────┐
│                   React + Vite Frontend                     │
│    (Pure Hand-Crafted CSS, React Hooks, Context State)      │
│     Port: 5173 | Dark Academic Theme | Zero Frameworks      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js + Express.js API Gateway            │
│  (JWT Auth, Project Isolation, Metadata Persistence, Proxy) │
│     Port: 5000 | MongoDB + Mongoose | Multer Storage        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Python AI Microservice                    │
│   (FastAPI, PyMuPDF, ChromaDB Vector Store, Gemini 1.5)     │
│     Port: 8000 | ONNX Embeddings | 10 Modular Engines       │
└─────────────────────────────────────────────────────────────┘
```

1. **Frontend (`frontend/`)**: React 18, Vite, pure CSS (STRICT: no Tailwind, Bootstrap, or component libraries). Features an academic UI with responsive grids, interactive matrix comparisons, RAG chat with citation badges, literature review editor, and citation verification modals.
2. **Backend Gateway (`backend/`)**: Node.js & Express. Enforces authentication via JWT and bcrypt, isolates project workspaces per user, manages controlled PDF storage in `./data/uploads/`, stores application metadata in MongoDB via Mongoose, and proxies AI workflows to the Python service.
3. **Python AI Service (`python-service/`)**: FastAPI, PyMuPDF, ChromaDB, and Google Gemini 1.5 Flash. Modular architecture with deterministic fallbacks when offline or without active LLM API keys:
   - `pdf_processing/extractor.py`: Page-by-page text extraction, hyphenation cleanup, scanned PDF detection.
   - `analysis/analyzer.py`: 12-section technical paper decomposition.
   - `rag/chunker.py` & `qa_engine.py`: Chunking with metadata preservation and dense semantic retrieval.
   - `vector_store/chroma_client.py`: Persistent ChromaDB vector storage with project-level collection isolation.
   - `comparison/comparator.py`: 10-dimension comparative matrix engine.
   - `research_gaps/gap_analyzer.py`: Potential research gap synthesis with epistemic boundaries.
   - `literature_review/generator.py`: 6-section academic literature review drafter.
   - `citation_verification/verifier.py`: 3-tier citation verification (paper existence, page existence, and factual claim support).

---

## 🚀 Key Features

### 1. User Authentication & Project Workspace
- User registration and login with bcrypt password hashing (10 salt rounds).
- Stateless JWT authentication in `Authorization: Bearer <token>` headers.
- Multi-project workspaces where each project contains its own papers, vector collections, chat histories, and literature reviews.
- Strict ownership authorization: users can only view and mutate their own projects.

### 2. High-Fidelity PDF Processing
- Page-by-page text extraction via PyMuPDF (`fitz`).
- Cleans hyphenated line-breaks (`trans-\nformer` &rarr; `transformer`) while preserving paragraph structures.
- Scanned PDF detection flag (`is_scanned: true` if `< 50` characters per page with raster images).
- Graceful edge-case handling for empty (0-byte), corrupted, and password-protected PDFs.

### 3. Structured 12-Section Technical Paper Analysis
Deconstructs any academic paper into 12 structured dimensions:
1. Paper Title
2. Abstract Summary
3. Research Problem
4. Research Objectives
5. Proposed Methodology
6. Algorithms & Techniques Used
7. Datasets Used
8. Experimental Setup
9. Results & Findings
10. Advantages & Strengths
11. Limitations & Bottlenecks
12. Future Scope
*Missing information rule*: If a section is unmentioned in the text, it explicitly states `"Information not found or not specified in paper text"` rather than hallucinating findings.

### 4. Grounded RAG Research Assistant
- Divides paper pages into contextual chunks (500 characters, 100 character overlap) while strictly preserving `paper_id`, `paper_title`, `page_number`, and `chunk_index`.
- Generates dense vector embeddings using local ONNX `all-MiniLM-L6-v2` stored in ChromaDB collections per project.
- Retrieves top-$k$ relevant passages and generates answers grounded in the retrieved passages.
- Includes clickable citation badges referencing exact paper names and page numbers.

### 5. Multi-Paper Comparative Matrix
- Select 2 or more uploaded papers to compare side-by-side across 10 academic axes.
- Pure CSS comparative matrix table with real-time paper toggling and dimension search filters.

### 6. Evidence-Based Potential Research Gap Analysis
- Synthesizes candidate research gaps derived from author-reported limitations, unaddressed challenges, and benchmark discrepancies.
- **Epistemic Humility**: Every gap is explicitly labeled as a **potential / candidate gap** derived from a limited corpus, never a proven universal field absence.
- Provides direct literature evidence quotes, research motivation ("Why worth investigating"), and concrete future directions.

### 7. Thematic Literature Review Generator
- Synthesizes a publication-ready academic draft organized into 6 canonical sections:
  1. Introduction & Research Scope
  2. Thematic Organization & Methodological Taxonomy
  3. Comparative Methodologies & Empirical Findings
  4. Critical Analysis of Limitations & Practical Trade-offs
  5. Emerging Research Trajectories & Future Horizons
  6. Grounded References List
- Fully editable markdown editor with live word count, copy-to-clipboard, markdown file export, and database persistence.

### 8. Rigorous 3-Tier Citation & Claim Verification Inspector
- Checks **1. Paper Existence**: Does the cited paper exist in the project repository?
- Checks **2. Page Existence**: Does the cited page number fall within the document's physical page boundary?
- Checks **3. Factual Claim Support**: Does the text on that page actually justify, support, or contradict the assertion?
- **Crucial Rule**: Does NOT mark a citation as verified merely because the paper exists! Distinguishes paper existence from claim support.

---

## 📡 REST API Reference

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Login and receive JWT token | No |
| `GET` | `/api/auth/me` | Get current authenticated profile | Yes |

### Project Management Routes (`/api/projects`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/projects` | List all projects belonging to user | Yes |
| `POST` | `/api/projects` | Create a new research project | Yes |
| `GET` | `/api/projects/:id` | Get project details by ID | Yes |
| `PUT` | `/api/projects/:id` | Update project title or description | Yes |
| `DELETE` | `/api/projects/:id` | Delete project and associated papers | Yes |

### Research Paper Routes (`/api/projects/:id/papers` & `/api/papers`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/projects/:id/papers` | Get all papers in a project | Yes |
| `POST` | `/api/projects/:id/papers` | Upload PDF paper (multipart/form-data) | Yes |
| `GET` | `/api/papers/:id` | Get paper metadata by ID | Yes |
| `DELETE` | `/api/papers/:id` | Delete paper, file, and embeddings | Yes |
| `POST` | `/api/papers/:id/analyze` | Run 12-section structured analysis | Yes |
| `GET` | `/api/papers/:id/analysis` | Get cached 12-section analysis | Yes |

### AI Research & Synthesis Routes (`/api/projects/:id`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/projects/:id/chat` | Send question to RAG Assistant | Yes |
| `GET` | `/api/projects/:id/chat` | Get chat history for project | Yes |
| `POST` | `/api/projects/:id/compare` | Compare 2+ papers across 10 dimensions | Yes |
| `POST` | `/api/projects/:id/research-gaps` | Synthesize potential research gaps | Yes |
| `POST` | `/api/projects/:id/literature-review/generate` | Generate literature review draft | Yes |
| `POST` | `/api/projects/:id/literature-review` | Save/update literature review draft | Yes |
| `GET` | `/api/projects/:id/literature-review` | Get saved literature review draft | Yes |
| `POST` | `/api/projects/:id/verify-citations` | Run 3-tier citation verification | Yes |

---

## 🛠️ Installation & Local Setup

### Prerequisites
- Node.js (v18.0.0 or higher) & npm
- Python (v3.10, v3.11, or v3.12)
- MongoDB instance running locally (`mongodb://localhost:27017`) or MongoDB Atlas URI

### Step 1: Clone & Configure Environment Variables
```bash
git clone <repository-url>
cd "Research Paper Analyzer"
cp .env.example .env
```
Edit `.env` to configure your MongoDB connection string and optionally your Gemini API key:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/research_paper_analyzer
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
PYTHON_SERVICE_URL=http://localhost:8000
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_api_key_here
```

### Step 2: Set Up Python AI Microservice
```bash
cd python-service
# Activate existing virtual environment
source venv/bin/activate
# Start FastAPI microservice
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger documentation available at `http://localhost:8000/docs`.*

### Step 3: Set Up Backend API Gateway
```bash
cd ../backend
npm install
npm run dev
```
*Server running on `http://localhost:5000`.*

### Step 4: Set Up React Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Application accessible at `http://localhost:5173`.*

---

## 🧪 Comprehensive Automated Testing

The project includes unit, integration, and verification suites covering all phases:

```bash
# Run all Python AI microservice test suites (Phases 5-11):
./python-service/venv/bin/python python-service/test_phase5_pdf.py
./python-service/venv/bin/python python-service/test_phase6_analysis.py
./python-service/venv/bin/python python-service/test_phase7_rag.py
./python-service/venv/bin/python python-service/test_phase8_comparison.py
./python-service/venv/bin/python python-service/test_phase9_gaps.py
./python-service/venv/bin/python python-service/test_phase10_literature.py
./python-service/venv/bin/python python-service/test_phase11_citations.py

# Run Node.js backend integration & security tests:
cd backend && npm test

# Verify React production build:
cd ../frontend && npm run build
```

---

## 🎓 College Viva & Defense Talking Points (For CSE Students)

When presenting this project to external examiners or professors, highlight these key design decisions:

1. **Why 3 decoupled tiers instead of monolithic Python/Node?**
   - *Answer*: Separation of concerns. Node.js with non-blocking I/O excels at handling concurrent HTTP requests, user sessions, authentication, and file routing. Python is the industry standard for AI, scientific computing (PyMuPDF), and vector embeddings (ChromaDB). Placing them in decoupled microservices ensures independent scalability, modular testability, and isolated failure domains.
2. **How does your RAG system prevent hallucinations?**
   - *Answer*: We employ a 3-step guardrail:
     - 1. Chunks retain metadata tags (`paper_title`, `page_number`).
     - 2. System prompts strictly constrain generation to retrieved context chunks with a low temperature (0.1).
     - 3. If evidence is absent, the model is instructed to output `"Information not found in uploaded papers"` rather than guessing.
3. **What is the difference between Paper Existence and Claim Support in Citation Verification?**
   - *Answer*: A common defect in naive AI tools is declaring a citation "verified" simply because a paper titled *"Attention Is All You Need"* exists. In our engine, we evaluate 3 separate levels:
     - *Paper Existence*: Does the document exist in the database?
     - *Page Existence*: Is page 8 within the 11-page boundary of the document?
     - *Claim Support*: Does the text on page 8 factually support the claim (e.g. 28.4 BLEU)? If the claim asserts an impossible figure like 99.9% BLEU, it is marked `UNSUPPORTED` despite the paper and page existing.
4. **Why Pure CSS instead of CSS frameworks like Tailwind or Bootstrap?**
   - *Answer*: Demonstrates foundational web engineering mastery of CSS Grid, Flexbox, custom CSS variables, responsive design, and CSS animations without framework bundle bloat.
5. **How does the system handle scanned or image-based PDFs?**
   - *Answer*: PyMuPDF inspects character density per page. If a document averages fewer than 50 extracted characters per page while containing image blocks, it is flagged as `is_scanned: true`. This notifies the user that OCR pre-processing (such as Tesseract) is required.

---

## 📄 License
This project is open-source and developed for educational and academic research purposes.
# Research-Paper-Analyzer
