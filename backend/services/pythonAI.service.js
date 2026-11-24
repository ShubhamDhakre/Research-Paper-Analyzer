const http = require('http');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * Client service to communicate with the Python FastAPI microservice
 */
class PythonAIService {
  constructor() {
    this.baseUrl = PYTHON_SERVICE_URL;
  }

  async _postJson(path, payload, timeoutMs = 60000) {
    const url = new URL(path, this.baseUrl);
    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 8000,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          },
          timeout: timeoutMs
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => (responseData += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseData);
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(parsed);
              } else {
                const message = parsed.detail?.message || parsed.detail || 'Python microservice error';
                const err = new Error(typeof message === 'object' ? JSON.stringify(message) : message);
                err.status = res.statusCode;
                reject(err);
              }
            } catch (e) {
              reject(new Error(`Failed to parse Python service response: ${responseData}`));
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(new Error(`Failed to connect to Python AI microservice at ${PYTHON_SERVICE_URL}: ${err.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request to Python service timed out after ${timeoutMs / 1000} seconds`));
      });

      req.write(body);
      req.end();
    });
  }

  async processPDF(filePath, originalFilename, projectId = null, paperId = null) {
    return this._postJson('/process-pdf-path', {
      file_path: filePath,
      original_filename: originalFilename,
      project_id: projectId ? String(projectId) : undefined,
      paper_id: paperId ? String(paperId) : undefined
    }, 45000);
  }

  async indexPaperChunks(projectId, paperId, paperTitle, filePath) {
    return this._postJson('/index-paper-chunks', {
      project_id: String(projectId),
      paper_id: String(paperId),
      paper_title: paperTitle,
      file_path: filePath
    }, 45000);
  }

  async queryRAG(projectId, query, paperIdFilter = null, topK = 4) {
    const response = await this._postJson('/chat-query', {
      project_id: String(projectId),
      query: query,
      paper_id_filter: paperIdFilter ? String(paperIdFilter) : null,
      top_k: topK
    }, 60000);
    return response.data || response;
  }

  async analyzePaper(filePath, paperTitle) {
    const response = await this._postJson('/analyze-paper', {
      file_path: filePath,
      paper_title: paperTitle
    }, 90000);
    return response.data || response;
  }

  async comparePapers(papersList) {
    const response = await this._postJson('/compare-papers', {
      papers: papersList
    }, 90000);
    return response.data || response;
  }

  async analyzeResearchGaps(papersList) {
    const response = await this._postJson('/analyze-research-gaps', {
      papers: papersList
    }, 90000);
    return response.data || response;
  }

  async generateLiteratureReview(papersList, theme = null) {
    const response = await this._postJson('/generate-literature-review', {
      papers: papersList,
      theme: theme
    }, 120000);
    return response.data || response;
  }

  async verifyCitations(citations, papers) {
    const response = await this._postJson('/verify-citations', {
      citations: citations,
      papers: papers
    }, 90000);
    return response.data || response;
  }

  async checkHealth() {
    const url = new URL('/health', this.baseUrl);
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ status: 'unknown' });
          }
        });
      }).on('error', reject);
    });
  }
}

module.exports = new PythonAIService();
