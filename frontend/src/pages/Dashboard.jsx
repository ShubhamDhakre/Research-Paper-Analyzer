import React from 'react';
import { useProjects } from '../context/ProjectContext';
import { Button } from '../components/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Badge } from '../components/Badge';

export function Dashboard({ onNavigate }) {
  const { projects, selectProject } = useProjects();

  const totalPapers = projects.reduce((acc, p) => acc + (p.papers?.length || 0), 0);

  const stats = [
    { label: 'Active Projects', value: projects.length, icon: '📁', color: 'blue' },
    { label: 'Uploaded Papers', value: totalPapers, icon: '📑', color: 'violet' },
    { label: 'Analyzed Papers', value: '4', icon: '⚡', color: 'cyan' },
    { label: 'Verified Citations', value: '38', icon: '🛡️', color: 'success' }
  ];

  const recentPapers = [
    { title: 'Attention Is All You Need', project: 'Attention & Transformer Architectures', status: 'Analyzed', date: '2 hours ago' },
    { title: 'High-Resolution Image Synthesis with Latent Diffusion Models', project: 'Medical Imaging via Diffusion Models', status: 'Indexed', date: 'Yesterday' },
    { title: 'FlashAttention: Fast and Memory-Efficient Exact Attention', project: 'Attention & Transformer Architectures', status: 'Analyzed', date: 'Nov 22, 2026' }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Research Dashboard</h1>
          <p className="page-subtitle">Academic project tracking, paper indexing, and AI synthesis</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => onNavigate('chat')} icon="💬">
            Open AI Chat
          </Button>
          <Button variant="primary" onClick={() => onNavigate('project-details')} icon="📤">
            Upload Research Paper
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid">
        {stats.map((s, idx) => (
          <div key={idx} className="stat-card">
            <div className={`stat-icon badge-${s.color}`}>{s.icon}</div>
            <div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-split">
        {/* Left Column: Research Projects Overview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Active Research Projects
            </h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('projects')}>
              View All ({projects.length}) &rarr;
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {projects.map((proj) => (
              <Card
                key={proj.id}
                interactive
                onClick={() => {
                  selectProject(proj.id);
                  onNavigate('project-details');
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {proj.title}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {proj.description}
                    </p>
                  </div>
                  <Badge variant="blue">{proj.domain}</Badge>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>📑 {proj.papers?.length || 0} Papers uploaded</span>
                  <span>📅 Created {proj.createdAt}</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Open Workspace &rarr;</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Recent Activity & Analyzed Papers */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Recent Paper Activity
          </h3>

          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentPapers.map((paper, idx) => (
                <div
                  key={idx}
                  style={{
                    paddingBottom: idx !== recentPapers.length - 1 ? '1rem' : '0',
                    borderBottom: idx !== recentPapers.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {paper.title}
                    </h5>
                    <Badge variant={paper.status === 'Analyzed' ? 'success' : 'violet'}>
                      {paper.status}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{paper.project}</span>
                    <span>{paper.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick RAG Assistant Prompt Box */}
          <Card style={{ marginTop: '1.5rem', background: 'var(--accent-primary-light)', borderColor: 'var(--accent-primary-border)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              💡 Quick Research Query
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
              Ask a question across your indexed papers with page-level citations.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('chat')}
              style={{ width: '100%' }}
            >
              Ask RAG Assistant
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
