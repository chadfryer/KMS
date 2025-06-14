/**
 * Main application component for the Questionnaire Management System.
 * 
 * This application provides a user interface for:
 * - Adding new question-answer pairs
 * - Uploading and processing CSV files
 * - Searching the knowledge base
 * - Viewing the database contents
 */

import React from 'react'
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { IconHome, IconDatabase, IconUpload, IconClipboardList, IconChartBar, IconInbox } from '@tabler/icons-react'
import DatabaseView from './DatabaseView.jsx'
import KnowledgeBaseUpload from './KnowledgeBaseUpload.jsx'
import QuestionnaireManagement from './QuestionnaireManagement.jsx'
import MetricsView from './MetricsView.jsx'
import MainView from './MainView.jsx'
import QuestionnaireBacklog from './QuestionnaireBacklog.jsx'
import headerImage from './assets/header-image.png'

const FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

function NavContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navButtonClass = (path) => `
    w-full flex items-center px-4 py-2 mb-2 rounded
    ${location.pathname === path 
      ? 'bg-blue-600 text-white' 
      : 'bg-white text-gray-700 hover:bg-gray-100'}
    transition-colors duration-200
  `;
  
  return (
    <div className="flex flex-col">
      <div className="flex justify-center mb-6">
        <img 
          src={headerImage} 
          alt="Chad's Knowledge Management" 
          className="h-[180px] object-contain"
        />
      </div>
      
      <button
        className={navButtonClass('/')}
        onClick={() => navigate('/')}
      >
        <IconHome size={20} className="mr-2" />
        Home
      </button>
      
      <button
        className={navButtonClass('/knowledge-base')}
        onClick={() => navigate('/knowledge-base')}
      >
        <IconDatabase size={20} className="mr-2" />
        View Knowledge Base
      </button>
      
      <button
        className={navButtonClass('/knowledge-base-upload')}
        onClick={() => navigate('/knowledge-base-upload')}
      >
        <IconUpload size={20} className="mr-2" />
        Upload Knowledge
      </button>
      
      <button
        className={navButtonClass('/questionnaire-management')}
        onClick={() => navigate('/questionnaire-management')}
      >
        <IconClipboardList size={20} className="mr-2" />
        Process Questionnaire
      </button>
      
      <button
        className={navButtonClass('/metrics')}
        onClick={() => navigate('/metrics')}
      >
        <IconChartBar size={20} className="mr-2" />
        Metrics
      </button>
      
      <button
        className={navButtonClass('/backlog')}
        onClick={() => navigate('/backlog')}
      >
        <IconInbox size={20} className="mr-2" />
        Questionnaire Backlog
      </button>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <nav className="w-[300px] bg-white p-4 border-r border-gray-200 fixed h-full overflow-y-auto">
        <NavContent />
      </nav>

      {/* Main Content */}
      <main className="flex-1 ml-[300px] p-8">
        <Routes>
          <Route path="/" element={<MainView onViewDatabase={() => navigate('/knowledge-base')} />} />
          <Route path="/knowledge-base" element={<DatabaseView />} />
          <Route path="/knowledge-base-upload" element={<KnowledgeBaseUpload />} />
          <Route path="/questionnaire-management" element={<QuestionnaireManagement />} />
          <Route path="/metrics" element={<MetricsView />} />
          <Route path="/backlog" element={<QuestionnaireBacklog />} />
          <Route path="*" element={<MainView onViewDatabase={() => navigate('/knowledge-base')} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router future={FUTURE_FLAGS}>
      <AppContent />
    </Router>
  )
}

export default App
