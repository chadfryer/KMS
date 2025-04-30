import React from 'react'
import { Container, Title, Stack, Text, Group, Paper, Grid } from '@mantine/core'
import { IconDatabase, IconUpload, IconClipboardList, IconChartBar, IconInbox } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

/**
 * MainView component provides the primary interface for interacting with the system.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onViewDatabase - Callback function to view the database
 */
function MainView({ onViewDatabase }) {
  const navigate = useNavigate()

  const paperStyle = {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    }
  }

  return (
    <Container size="xl" py={40}>
      <Stack spacing={40}>
        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Knowledge Management System</Title>
            <Text c="dimmed" size="lg">Manage and search your question-answer database.</Text>
          </Stack>
        </Group>

        <Grid>
          <Grid.Col span={6}>
            <Paper 
              p="xl" 
              radius="md" 
              withBorder
              onClick={() => navigate('/knowledge-base')}
              sx={paperStyle}
            >
              <Group spacing="md" mb="md">
                <IconDatabase size={24} style={{ color: '#94A3B8' }} />
                <Title order={2} size={24}>Knowledge Base</Title>
              </Group>
              <Text c="dimmed">
                View and manage your complete knowledge base. Browse through all questions and answers, 
                filter by entity, and easily find specific information. The knowledge base provides a 
                comprehensive view of all stored information with powerful search and filtering capabilities.
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={6}>
            <Paper 
              p="xl" 
              radius="md" 
              withBorder
              onClick={() => navigate('/knowledge-base-upload')}
              sx={paperStyle}
            >
              <Group spacing="md" mb="md">
                <IconUpload size={24} style={{ color: '#94A3B8' }} />
                <Title order={2} size={24}>Upload Knowledge</Title>
              </Group>
              <Text c="dimmed">
                Bulk upload questions and answers using CSV files. This feature allows you to efficiently 
                import large sets of data into the knowledge base. The system automatically checks for 
                duplicates and validates the data format to ensure data quality and consistency.
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={6}>
            <Paper 
              p="xl" 
              radius="md" 
              withBorder
              onClick={() => navigate('/questionnaire-management')}
              sx={paperStyle}
            >
              <Group spacing="md" mb="md">
                <IconClipboardList size={24} style={{ color: '#94A3B8' }} />
                <Title order={2} size={24}>Process Questionnaire</Title>
              </Group>
              <Text c="dimmed">
                Process and analyze questionnaires with AI assistance. Upload questionnaires and receive 
                intelligent suggestions for answers based on the existing knowledge base. This tool helps 
                streamline the questionnaire completion process and ensures consistency across responses.
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={6}>
            <Paper 
              p="xl" 
              radius="md" 
              withBorder
              onClick={() => navigate('/metrics')}
              sx={paperStyle}
            >
              <Group spacing="md" mb="md">
                <IconChartBar size={24} style={{ color: '#94A3B8' }} />
                <Title order={2} size={24}>Metrics</Title>
              </Group>
              <Text c="dimmed">
                View detailed analytics and metrics about your knowledge base. Track growth over time, 
                analyze question complexity, monitor entity distribution, and gain insights into system 
                usage. The metrics dashboard provides valuable data to help optimize your knowledge management.
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={12}>
            <Paper 
              p="xl" 
              radius="md" 
              withBorder
              onClick={() => navigate('/backlog')}
              sx={paperStyle}
            >
              <Group spacing="md" mb="md">
                <IconInbox size={24} style={{ color: '#94A3B8' }} />
                <Title order={2} size={24}>Questionnaire Backlog</Title>
              </Group>
              <Text c="dimmed">
                Manage and track questionnaires that are in progress or pending review. The backlog provides 
                a clear overview of all questionnaires being processed, their current status, and any actions 
                required. This helps maintain an organized workflow and ensures no questionnaire is overlooked.
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}

export default MainView 