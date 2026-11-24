import React, { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';

export function Projects({ onNavigate, onOpenCreate }) {
  const { projects, selectProject, deleteProject } = useProjects();
  const [search, setSearch] = useState('');

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Projects</h1>
          <p className="page-subtitle">Organize research papers by topic, domain, or thesis chapters</p>
        </div>
        <Button variant="primary" icon="➕" onClick={onOpenCreate}>
          Create Project
        </Button>
      </div>

      <div style={{ marginBottom: '1.5rem', maxWidth: '420px' }}>
        <Input
          placeholder="Search projects by title, domain, or keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📂"
          title="No research projects found"
          description="Create your first research project to begin uploading and analyzing papers."
          actionLabel="Create New Project"
          onAction={onOpenCreate}
        />
      ) : (
        <div className="projects-grid">
          {filtered.map((proj) => (
            <Card
              key={proj.id}
              interactive
              onClick={() => {
                selectProject(proj.id);
                onNavigate('project-details');
              }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <Badge variant="blue">{proj.domain}</Badge>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
                  title="Delete project"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete project "${proj.title}"?`)) {
                      deleteProject(proj.id);
                    }
                  }}
                >
                  🗑️
                </button>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {proj.title}
              </h3>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', flex: 1, marginBottom: '1.25rem', lineHeight: 1.5 }}>
                {proj.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>📑 {proj.papers?.length || 0} Papers</span>
                <span>📅 {proj.createdAt}</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Open &rarr;</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Projects;
