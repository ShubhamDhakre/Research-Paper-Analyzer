/**
 * Frontend REST API Client Service
 * Communicates with the Express backend via Vite proxy (/api)
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('rpa_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.status) throw error;
    const netErr = new Error('Backend API is currently offline. Please ensure the Express server is running on port 5000.');
    netErr.status = 503;
    throw netErr;
  }
}

// Authentication API Endpoints
export const authAPI = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me', { method: 'GET' })
};

// Research Projects API Endpoints
export const projectsAPI = {
  getAll: () => request('/projects', { method: 'GET' }),
  getById: (id) => request(`/projects/${id}`, { method: 'GET' }),
  create: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
  getPapers: (id) => request(`/projects/${id}/papers`, { method: 'GET' })
};

// Research Papers API Endpoints
export const papersAPI = {
  getById: (id) => request(`/papers/${id}`, { method: 'GET' }),
  delete: (id) => request(`/papers/${id}`, { method: 'DELETE' }),
  upload: async (projectId, file) => {
    const token = localStorage.getItem('rpa_token');
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/papers`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || `Upload failed with status ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }
};

// Research Analysis API Endpoints
export const analysisAPI = {
  analyze: (paperId, force = false) => request(`/papers/${paperId}/analyze${force ? '?force=true' : ''}`, { method: 'POST' }),
  get: (paperId) => request(`/papers/${paperId}/analysis`, { method: 'GET' })
};

// AI Research Assistant (RAG Chat) API Endpoints
export const chatAPI = {
  sendMessage: (projectId, message, paperIdFilter = null) =>
    request(`/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, paperIdFilter })
    }),
  getHistory: (projectId) => request(`/projects/${projectId}/chat`, { method: 'GET' })
};

// Multi-Paper Comparative Analysis API Endpoints
export const comparisonAPI = {
  compare: (projectId, paperIds) =>
    request(`/projects/${projectId}/compare`, {
      method: 'POST',
      body: JSON.stringify({ paperIds })
    })
};

// Potential Research Gap Analysis API Endpoints
export const gapsAPI = {
  analyze: (projectId, paperIds = []) =>
    request(`/projects/${projectId}/research-gaps`, {
      method: 'POST',
      body: JSON.stringify({ paperIds })
    })
};

// Literature Review Generator API Endpoints
export const literatureAPI = {
  generate: (projectId, paperIds = [], theme = null) =>
    request(`/projects/${projectId}/literature-review/generate`, {
      method: 'POST',
      body: JSON.stringify({ paperIds, theme })
    }),
  save: (projectId, payload) =>
    request(`/projects/${projectId}/literature-review`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  get: (projectId) => request(`/projects/${projectId}/literature-review`, { method: 'GET' })
};

// Citation Verification API Endpoints
export const citationsAPI = {
  verify: (projectId, citations) =>
    request(`/projects/${projectId}/verify-citations`, {
      method: 'POST',
      body: JSON.stringify({ citations })
    })
};

export default {
  auth: authAPI,
  projects: projectsAPI,
  papers: papersAPI,
  analysis: analysisAPI,
  chat: chatAPI,
  comparison: comparisonAPI,
  gaps: gapsAPI,
  literature: literatureAPI,
  citations: citationsAPI
};
