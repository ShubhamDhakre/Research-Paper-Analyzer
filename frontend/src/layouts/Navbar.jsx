import React from 'react';
import { useProjects } from '../context/ProjectContext';
import { Button } from '../components/Button';

export function Navbar({ onOpenCreateProject, currentView }) {
  const { projects, activeProject, selectProject } = useProjects();

  const viewTitles = {
    dashboard: 'Dashboard & Research Metrics',
    projects: 'All Research Projects',
    'project-details': activeProject ? `${activeProject.title} — Workspace` : 'Project Workspace',
    analysis: 'Structured Research Paper Analysis',
    chat: 'AI Research Assistant (RAG with Citations)',
    compare: 'Multi-Paper Comparative Matrix',
    gaps: 'Potential Research Gap Analysis',
    'literature-review': 'Literature Review Generator & Editor',
    settings: 'System Settings & Model Configuration'
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {viewTitles[currentView] || 'Research Suite'}
        </h2>

        {projects.length > 0 && (
          <div className="project-selector">
            <span>Project:</span>
            <select
              value={activeProject?.id || ''}
              onChange={(e) => selectProject(e.target.value)}
              aria-label="Active Project Selector"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="navbar-right">
        <Button
          variant="outline"
          size="sm"
          icon="➕"
          onClick={onOpenCreateProject}
        >
          New Project
        </Button>
      </div>
    </header>
  );
}

export default Navbar;
