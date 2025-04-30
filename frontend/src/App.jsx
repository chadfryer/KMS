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
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, createRoutesFromElements } from 'react-router-dom'
import { AppShell, Group, Stack, Button, Container, Title, Text } from '@mantine/core'
import { IconHome, IconDatabase, IconUpload, IconClipboardList, IconChartBar, IconInbox } from '@tabler/icons-react'
import DatabaseView from './DatabaseView.jsx'
import KnowledgeBaseUpload from './KnowledgeBaseUpload.jsx'
import QuestionnaireManagement from './QuestionnaireManagement.jsx'
import MetricsView from './MetricsView.jsx'
import MainView from './MainView.jsx'
import QuestionnaireBacklog from './QuestionnaireBacklog.jsx'
import headerImage from './assets/header-image.png'
import './App.css'

const FUTURE_FLAGS = {
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

function NavContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <Stack spacing="md">
      <Group justify="center" mb="md">
        <img 
          src={headerImage} 
          alt="Chad's Knowledge Management" 
          style={{ 
            height: '180px',
            objectFit: 'contain'
          }} 
        />
      </Group>
      <Button
        variant={location.pathname === '/' ? 'filled' : 'light'}
        onClick={() => navigate('/')}
        leftSection={<IconHome size={20} className={location.pathname !== '/' ? 'navIconUnselected' : ''} />}
        fullWidth
        className="navButton"
      >
        Home
      </Button>
      <Button
        variant={location.pathname === '/knowledge-base' ? 'filled' : 'light'}
        onClick={() => navigate('/knowledge-base')}
        leftSection={<IconDatabase size={20} className={location.pathname !== '/knowledge-base' ? 'navIconUnselected' : ''} />}
        fullWidth
        className="navButton"
      >
        View Knowledge Base
      </Button>
      <Button
        variant={location.pathname === '/knowledge-base-upload' ? 'filled' : 'light'}
        onClick={() => navigate('/knowledge-base-upload')}
        leftSection={<IconUpload size={20} className={location.pathname !== '/knowledge-base-upload' ? 'navIconUnselected' : ''} />}
        fullWidth
        className="navButton"
      >
        Upload Knowledge
      </Button>
      <Button
        variant={location.pathname === '/questionnaire-management' ? 'filled' : 'light'}
        onClick={() => navigate('/questionnaire-management')}
        leftSection={<IconClipboardList size={20} className={location.pathname !== '/questionnaire-management' ? 'navIconUnselected' : ''} />}
        fullWidth
        className="navButton"
      >
        Process Questionnaire
      </Button>
      <Button
        variant={location.pathname === '/metrics' ? 'filled' : 'light'}
        onClick={() => navigate('/metrics')}
        leftSection={<IconChartBar size={20} className={location.pathname !== '/metrics' ? 'navIconUnselected' : ''} />}
        fullWidth
        className="navButton"
      >
        Metrics
      </Button>
      <Button
        variant={location.pathname === '/backlog' ? 'filled' : 'light'}
        onClick={() => navigate('/backlog')}
        leftSection={<IconInbox size={20} className={location.pathname !== '/backlog' ? 'navIconUnselected' : ''} />}
        fullWidth
        className="navButton"
      >
        Questionnaire Backlog
      </Button>
    </Stack>
  );
}

function AppContent() {
  const navigate = useNavigate();
  
  return (
    <AppShell
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: true }
      }}
      layout="default"
      padding="md"
      withBorder
      styles={(theme) => ({
        root: {
          width: '100%',
          minHeight: '100vh'
        },
        main: {
          width: '100%',
          flex: 1,
          backgroundColor: '#000000',
          paddingLeft: 'calc(300px + 40px)', // navbar width + padding
          paddingRight: '40px',
          paddingTop: '20px',
          paddingBottom: '20px',
          [`@media (maxWidth: ${theme.breakpoints.sm})`]: {
            paddingLeft: '40px'
          }
        },
        navbar: {
          backgroundColor: '#333333',
          borderRight: '1px solid #3A4444'
        }
      })}
    >
      <AppShell.Navbar p="md">
        <NavContent />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<MainView onViewDatabase={() => navigate('/knowledge-base')} />} />
          <Route path="/knowledge-base" element={<DatabaseView />} />
          <Route path="/knowledge-base-upload" element={<KnowledgeBaseUpload />} />
          <Route path="/questionnaire-management" element={<QuestionnaireManagement />} />
          <Route path="/metrics" element={<MetricsView />} />
          <Route path="/backlog" element={<QuestionnaireBacklog />} />
          <Route path="*" element={<MainView onViewDatabase={() => navigate('/knowledge-base')} />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
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
