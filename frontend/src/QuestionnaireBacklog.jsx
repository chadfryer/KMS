import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Badge, Group, Loader, Button, Modal, Textarea, ActionIcon, Tooltip } from '@mantine/core'
import { IconDownload, IconEdit, IconCheck, IconX } from '@tabler/icons-react'

function QuestionnaireBacklog() {
  const [backlogEntries, setBacklogEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [editedAnswers, setEditedAnswers] = useState({})
  const [acceptedAnswers, setAcceptedAnswers] = useState([])

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

  const handleEdit = (entry) => {
    setSelectedEntry(entry)
    setEditedAnswers(entry.edited_answers || {})
    setAcceptedAnswers(entry.low_confidence_answers
      .filter(a => a.accepted)
      .map(a => a.index))
    setEditModalOpen(true)
  }

  const handleSaveEdits = async () => {
    if (!selectedEntry) return

    try {
      const response = await fetch(`http://localhost:8000/questionnaire-backlog/${selectedEntry.id}/update-answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          edited_answers: editedAnswers,
          accepted_answers: acceptedAnswers
        })
      })

      if (!response.ok) throw new Error('Failed to save edits')

      // Refresh the backlog
      fetchBacklog()
      setEditModalOpen(false)
    } catch (error) {
      console.error('Error saving edits:', error)
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
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    position: 'relative'
                  }}>
                    <Text size="lg" fw={500} style={{ flex: '1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.filename}
                    </Text>
                    <div style={{ 
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 1
                    }}>
                      <Badge 
                        size="lg"
                        color={getStatusColor(entry.status)}
                        variant="filled"
                      >
                        {entry.status === 'ready' ? 'In Review' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </Badge>
                    </div>
                    <Group spacing="sm" ml="auto">
                      {entry.status === 'completed' && (
                        <Button
                          variant="light"
                          color="dark"
                          leftSection={<IconEdit size={16} />}
                          onClick={() => handleEdit(entry)}
                          disabled={entry.status === 'processing' || entry.status === 'failed'}
                        >
                          Edit
                        </Button>
                      )}
                      {entry.can_download && (
                        <Button
                          variant="light"
                          color={entry.downloaded ? "gray" : "dark"}
                          leftSection={<IconDownload size={16} />}
                          onClick={() => handleDownload(entry.id, entry.filename)}
                          disabled={entry.status === 'processing' || entry.status === 'failed'}
                        >
                          {entry.downloaded ? 'Download Again' : 'Download'}
                        </Button>
                      )}
                    </Group>
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
                      <Text size="sm" c="dimmed">Low Confidence Answers</Text>
                      <Group spacing={4} align="baseline">
                        <Text size="lg" fw={500} c={entry.unaccepted_answers_count > 0 ? "red" : undefined}>
                          {entry.unaccepted_answers_count}
                        </Text>
                        <Text size="xs" c="dimmed">unaccepted</Text>
                      </Group>
                      <Text size="xs" c="dimmed">(&lt;50% confidence)</Text>
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

      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={
          <Group>
            <Text size="lg" fw={500}>Edit Low Confidence Answers</Text>
            <Text size="sm" c="dimmed">(&lt;50% confidence)</Text>
          </Group>
        }
        size="xl"
      >
        {selectedEntry && (
          <Stack spacing="md">
            {selectedEntry.low_confidence_answers.map((answer, idx) => (
              <Paper key={idx} p="md" withBorder>
                <Stack spacing="xs">
                  <Group position="apart">
                    <Text size="sm" fw={500}>Question:</Text>
                    <Badge color="blue">Confidence: {Math.round(answer.confidence * 100)}%</Badge>
                  </Group>
                  <Text>{answer.question}</Text>
                  
                  <Text size="sm" fw={500}>Original Answer:</Text>
                  <Text>{answer.answer}</Text>
                  
                  <Text size="sm" fw={500}>Edit Answer:</Text>
                  <Textarea
                    value={editedAnswers[answer.index] || answer.answer}
                    onChange={(event) => setEditedAnswers(prev => ({
                      ...prev,
                      [answer.index]: event.currentTarget.value
                    }))}
                    minRows={2}
                  />
                  
                  <Group position="right" spacing="xs">
                    <Button
                      variant={acceptedAnswers.includes(answer.index) ? "filled" : "light"}
                      color="green"
                      leftSection={<IconCheck size={16} />}
                      onClick={() => {
                        if (acceptedAnswers.includes(answer.index)) {
                          setAcceptedAnswers(prev => prev.filter(i => i !== answer.index))
                        } else {
                          setAcceptedAnswers(prev => [...prev, answer.index])
                        }
                      }}
                    >
                      {acceptedAnswers.includes(answer.index) ? 'Accepted' : 'Accept'}
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            ))}
            
            <Group position="right" mt="xl">
              <Button variant="light" onClick={() => setEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdits}>Save Changes</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  )
}

export default QuestionnaireBacklog 