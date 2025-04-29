/**
 * Main application component for the Questionnaire Management System.
 * 
 * This application provides a user interface for:
 * - Adding new question-answer pairs
 * - Uploading and processing CSV files
 * - Searching the knowledge base
 * - Viewing the database contents
 */

import React, { useState } from 'react'
import { AppShell, Group, Stack, Button, Container, Title, Text } from '@mantine/core'
import { IconHome, IconDatabase, IconUpload, IconClipboardList, IconChartBar, IconInbox } from '@tabler/icons-react'
import DatabaseView from './DatabaseView.jsx'
import KnowledgeBaseUpload from './KnowledgeBaseUpload.jsx'
import QuestionnaireManagement from './QuestionnaireManagement.jsx'
import MetricsView from './MetricsView.jsx'
import MainView from './MainView.jsx'
import headerImage from './assets/header-image.png'
import './App.css'

function App() {
  const [opened, setOpened] = useState(false)
  const [currentView, setCurrentView] = useState('main')

  const renderContent = () => {
    switch (currentView) {
      case 'main':
        return <MainView onViewDatabase={() => setCurrentView('knowledge-base')} />
      case 'knowledge-base':
        return <DatabaseView />
      case 'knowledge-base-upload':
        return <KnowledgeBaseUpload />
      case 'questionnaire-management':
        return <QuestionnaireManagement />
      case 'metrics':
        return <MetricsView />
      case 'backlog':
        return (
          <Container size="xl" py={40}>
            <Title order={1}>Questionnaire Backlog</Title>
            <Text c="dimmed">Coming soon...</Text>
          </Container>
        )
      default:
        return <MainView onViewDatabase={() => setCurrentView('knowledge-base')} />
    }
  }

  return (
    <AppShell
      padding={0}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
    >
      <AppShell.Navbar p="md" style={{ backgroundColor: '#333333', borderRight: '1px solid #3A4444' }}>
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
            variant={currentView === 'main' ? 'filled' : 'light'}
            onClick={() => setCurrentView('main')}
            leftSection={<IconHome size={20} className={currentView !== 'main' ? 'navIconUnselected' : ''} />}
            fullWidth
            className="navButton"
          >
            Home
          </Button>
          <Button
            variant={currentView === 'knowledge-base' ? 'filled' : 'light'}
            onClick={() => setCurrentView('knowledge-base')}
            leftSection={<IconDatabase size={20} className={currentView !== 'knowledge-base' ? 'navIconUnselected' : ''} />}
            fullWidth
            className="navButton"
          >
            View Knowledge Base
          </Button>
          <Button
            variant={currentView === 'knowledge-base-upload' ? 'filled' : 'light'}
            onClick={() => setCurrentView('knowledge-base-upload')}
            leftSection={<IconUpload size={20} className={currentView !== 'knowledge-base-upload' ? 'navIconUnselected' : ''} />}
            fullWidth
            className="navButton"
          >
            Upload Knowledge
          </Button>
          <Button
            variant={currentView === 'questionnaire-management' ? 'filled' : 'light'}
            onClick={() => setCurrentView('questionnaire-management')}
            leftSection={<IconClipboardList size={20} className={currentView !== 'questionnaire-management' ? 'navIconUnselected' : ''} />}
            fullWidth
            className="navButton"
          >
            Process Questionnaire
          </Button>
          <Button
            variant={currentView === 'metrics' ? 'filled' : 'light'}
            onClick={() => setCurrentView('metrics')}
            leftSection={<IconChartBar size={20} className={currentView !== 'metrics' ? 'navIconUnselected' : ''} />}
            fullWidth
            className="navButton"
          >
            Metrics
          </Button>
          <Button
            variant={currentView === 'backlog' ? 'filled' : 'light'}
            onClick={() => setCurrentView('backlog')}
            leftSection={<IconInbox size={20} className={currentView !== 'backlog' ? 'navIconUnselected' : ''} />}
            fullWidth
            className="navButton"
          >
            Questionnaire Backlog
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: '#000000', paddingLeft: '340px', paddingTop: '20px', paddingRight: '40px', paddingBottom: '40px' }}>
        {renderContent()}
      </AppShell.Main>
    </AppShell>
  )
}

export default App
