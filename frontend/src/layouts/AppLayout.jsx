import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Textarea } from '../components/Textarea';
import { Button } from '../components/Button';
import { useProjects } from '../context/ProjectContext';

export function AppLayout({ currentView, setCurrentView, children }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');

  const { createProject } = useProjects();

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    createProject(title.trim(), description.trim(), domain.trim());
    setTitle('');
    setDescription('');
    setDomain('');
    setError('');
    setIsModalOpen(false);
    setCurrentView('project-details');
  };

  return (
    <div className="app-layout">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      <div className="main-wrapper">
        <Navbar
          currentView={currentView}
          onOpenCreateProject={() => setIsModalOpen(true)}
        />

        <main className="page-container">{children}</main>
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Research Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Create Project
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate}>
          <Input
            label="Project Title"
            required
            placeholder="e.g., Graph Neural Networks for Drug Discovery"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={error}
          />

          <Input
            label="Research Domain / Field"
            placeholder="e.g., Bioinformatics, Machine Learning, Computer Vision"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            helperText="Helps categorize your research documents and contextualize AI analysis"
          />

          <Textarea
            label="Research Objective / Description"
            placeholder="Describe the research questions, problems, or objectives for this paper collection..."
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
}

export default AppLayout;
