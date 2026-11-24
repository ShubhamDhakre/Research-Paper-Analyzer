import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { AppLayout } from './layouts/AppLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { PaperAnalysisView } from './pages/PaperAnalysisView';
import { ChatView } from './pages/ChatView';
import { ComparisonView } from './pages/ComparisonView';
import { ResearchGapsView } from './pages/ResearchGapsView';
import { LiteratureReviewView } from './pages/LiteratureReviewView';
import { SettingsView } from './pages/SettingsView';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [currentView, setCurrentView] = useState('dashboard');

  // If not signed in, show academic auth screens
  if (!isAuthenticated) {
    if (authMode === 'register') {
      return <Register onNavigateLogin={() => setAuthMode('login')} />;
    }
    return <Login onNavigateRegister={() => setAuthMode('register')} />;
  }

  // Render appropriate view inside the application layout
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'projects':
        return (
          <Projects
            onNavigate={setCurrentView}
            onOpenCreate={() => {
              // Trigger project modal in layout or switch to workspace
              setCurrentView('projects');
            }}
          />
        );
      case 'project-details':
        return <ProjectDetails onNavigate={setCurrentView} />;
      case 'analysis':
        return <PaperAnalysisView />;
      case 'chat':
        return <ChatView />;
      case 'compare':
        return <ComparisonView />;
      case 'gaps':
        return <ResearchGapsView />;
      case 'literature-review':
        return <LiteratureReviewView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <AppLayout currentView={currentView} setCurrentView={setCurrentView}>
      {renderView()}
    </AppLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;
