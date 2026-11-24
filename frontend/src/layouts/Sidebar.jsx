import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';

export function Sidebar({ currentView, setCurrentView }) {
  const { user, logout } = useAuth();
  const { activeProject } = useProjects();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', section: 'Overview' },
    { id: 'projects', label: 'Projects', icon: '📁', section: 'Overview' },
    { id: 'project-details', label: 'Project Workspace', icon: '🔬', section: 'Research Tools' },
    { id: 'analysis', label: 'Paper Analysis', icon: '📑', section: 'Research Tools' },
    { id: 'chat', label: 'AI Assistant (RAG)', icon: '💬', section: 'Research Tools' },
    { id: 'compare', label: 'Compare Papers', icon: '⚖️', section: 'Synthesis' },
    { id: 'gaps', label: 'Research Gaps', icon: '🔍', section: 'Synthesis' },
    { id: 'literature-review', label: 'Literature Review', icon: '📝', section: 'Synthesis' },
    { id: 'settings', label: 'Settings', icon: '⚙️', section: 'System' }
  ];

  // Group items by section
  const sections = ['Overview', 'Research Tools', 'Synthesis', 'System'];

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">📚</div>
        <div>
          <div className="sidebar-brand-name">Paper Analyzer</div>
          <div className="sidebar-brand-tag">AI Research Suite</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => {
          const items = navItems.filter((item) => item.section === section);
          return (
            <React.Fragment key={section}>
              <div className="nav-section-title">{section}</div>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                  onClick={() => setCurrentView(item.id)}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'Researcher'}</div>
            <div className="user-role">{user?.institution || 'Academic Lab'}</div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={logout}
            title="Log Out"
            style={{ padding: '0.3rem', fontSize: '0.9rem' }}
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
