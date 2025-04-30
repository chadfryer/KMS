import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Badge, Group, Loader, Button } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'

function QuestionnaireBacklog() {
  const [backlogEntries, setBacklogEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBacklog = async () => {
    try {
      const response = await fetch('http://localhost:8000/questionnaire-backlog')
      if (!response.ok) {
        throw new Error('Failed to fetch backlog entries')
      }
      const data = await response.json()
      setBacklogEntries(data.entries)
    } catch (error) {
      console.error('Error fetching backlog:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBacklog()
  }, [])

  const handleDownload = async (entryId, filename) => {
    try {
      // Download the file
      const response = await fetch(`http://localhost:8000/questionnaire-backlog/${entryId}/download`)
      if (!response.ok) throw new Error('Failed to download file')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `processed_${filename}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Mark as downloaded
      const markResponse = await fetch(`http://localhost:8000/questionnaire-backlog/${entryId}/mark-downloaded`, {
        method: 'POST'
      })
      if (!markResponse.ok) throw new Error('Failed to mark as downloaded')

      // Refresh the backlog to update UI
      fetchBacklog()
    } catch (error) {
      console.error('Error downloading file:', error)
      setError(error.message)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Date not available'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'green'
      case 'ready':
        return 'cyan'
      case 'processing':
        return 'blue'
      case 'failed':
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <Container size="xl" py={40}>
      <Stack spacing={40}>
        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Questionnaire Backlog</Title>
            <Text c="dimmed" size="lg">History of processed questionnaires and their status.</Text>
          </Stack>
        </Group>

        {isLoading ? (
          <Paper p={40} radius="lg" withBorder>
            <Stack align="center" spacing={40}>
              <Loader size="lg" />
              <Text size="sm" c="dimmed">Loading backlog entries...</Text>
            </Stack>
          </Paper>
        ) : error ? (
          <Paper p={40} radius="lg" withBorder>
            <Stack align="center" spacing={40}>
              <Text c="red" size="lg">{error}</Text>
            </Stack>
          </Paper>
        ) : backlogEntries.length === 0 ? (
          <Paper p={40} radius="lg" withBorder>
            <Stack align="center" spacing={40}>
              <Text size="lg" c="dimmed">No questionnaires have been processed yet.</Text>
            </Stack>
          </Paper>
        ) : (
          <Stack spacing="md">
            {backlogEntries.map((entry) => (
              <Paper key={entry.id} p="lg" radius="md" withBorder>
                <Stack spacing="md">
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: '16px',
                    width: '100%'
                  }}>
                    <Text size="lg" fw={500}>{entry.filename}</Text>
                    <Badge 
                      size="lg"
                      color={getStatusColor(entry.status)}
                      variant="filled"
                    >
                      {entry.status === 'ready' ? 'In Review' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </Badge>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {entry.can_download && (
                        <Button
                          variant="light"
                          color={entry.downloaded ? "gray" : "blue"}
                          leftSection={<IconDownload size={16} color="black" />}
                          onClick={() => handleDownload(entry.id, entry.filename)}
                          disabled={entry.status === 'processing' || entry.status === 'failed'}
                        >
                          {entry.downloaded ? 'Download Again' : 'Download'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <Text size="sm" c="dimmed">Processed {formatDate(entry.created_at)}</Text>

                  <Group spacing="xl">
                    <Stack spacing={2}>
                      <Text size="sm" c="dimmed">Questions</Text>
                      <Text size="lg" fw={500}>{entry.questions_count}</Text>
                    </Stack>
                    <Stack spacing={2}>
                      <Text size="sm" c="dimmed">Processed</Text>
                      <Text size="lg" fw={500}>{entry.processed_count}</Text>
                    </Stack>
                    <Stack spacing={2}>
                      <Text size="sm" c="dimmed">Success Rate</Text>
                      <Text size="lg" fw={500}>{entry.success_rate}%</Text>
                    </Stack>
                    <Stack spacing={2}>
                      <Text size="sm" c="dimmed">Unaccepted Answers</Text>
                      <Text size="lg" fw={500} c={entry.unaccepted_answers_count > 0 ? "red" : undefined}>
                        {entry.unaccepted_answers_count}
                      </Text>
                    </Stack>
                    {entry.entity && (
                      <Stack spacing={2}>
                        <Text size="sm" c="dimmed">Entity</Text>
                        <Badge size="lg" variant="dot">{entry.entity}</Badge>
                      </Stack>
                    )}
                  </Group>

                  {entry.error_message && (
                    <Text size="sm" c="red">Error: {entry.error_message}</Text>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}

export default QuestionnaireBacklog 