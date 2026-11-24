import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const ProjectContext = createContext(null);

const DEFAULT_PROJECTS = [
  {
    id: 'proj_default_1',
    title: 'Attention & Transformer Architectures',
    description: 'Investigating self-attention mechanisms, multi-head attention efficiency, and positional encodings in large language models.',
    domain: 'Natural Language Processing',
    papersCount: 3,
    createdAt: '2026-11-15',
    papers: [
      {
        id: 'paper_1',
        title: 'Attention Is All You Need',
        authors: 'Vaswani et al.',
        year: 2017,
        status: 'Analyzed',
        pageCount: 15,
        fileName: 'attention_is_all_you_need.pdf'
      },
      {
        id: 'paper_2',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        authors: 'Devlin et al.',
        year: 2018,
        status: 'Analyzed',
        pageCount: 16,
        fileName: 'bert_pretraining.pdf'
      },
      {
        id: 'paper_3',
        title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
        authors: 'Dao et al.',
        year: 2022,
        status: 'Indexed',
        pageCount: 12,
        fileName: 'flash_attention.pdf'
      }
    ]
  }
];

export function ProjectProvider({ children }) {
  const { isAuthenticated, token } = useAuth();

  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('rpa_projects');
    return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    return localStorage.getItem('rpa_active_project') || 'proj_default_1';
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync projects with backend API when authenticated
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await projectsAPI.getAll();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setProjects(res.data);
      }
    } catch (err) {
      // If backend is offline, preserve local projects
      console.info('[Projects] Using local project cache');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  useEffect(() => {
    localStorage.setItem('rpa_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('rpa_active_project', activeProjectId);
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId || p._id === activeProjectId) || projects[0] || null;

  const createProject = async (title, description, domain) => {
    const newProjData = {
      title,
      description: description || '',
      domain: domain || 'General Computer Science'
    };

    try {
      const res = await projectsAPI.create(newProjData);
      if (res?.data) {
        setProjects((prev) => [res.data, ...prev]);
        setActiveProjectId(res.data._id || res.data.id);
        return res.data;
      }
    } catch (err) {
      console.info('[Projects] Created project in local workspace');
    }

    // Local fallback
    const fallbackProj = {
      id: 'proj_' + Date.now(),
      title,
      description: description || '',
      domain: domain || 'General Computer Science',
      papersCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      papers: []
    };
    setProjects((prev) => [fallbackProj, ...prev]);
    setActiveProjectId(fallbackProj.id);
    return fallbackProj;
  };

  const deleteProject = async (id) => {
    try {
      await projectsAPI.delete(id);
    } catch (err) {
      console.info('[Projects] Removed project from local workspace');
    }

    setProjects((prev) => prev.filter((p) => (p._id || p.id) !== id));
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => (p._id || p.id) !== id);
      setActiveProjectId(remaining.length > 0 ? (remaining[0]._id || remaining[0].id) : null);
    }
  };

  const selectProject = (id) => {
    setActiveProjectId(id);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        activeProjectId,
        isLoading,
        selectProject,
        createProject,
        deleteProject,
        refreshProjects: fetchProjects
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
