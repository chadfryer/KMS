import React, { useState, useEffect } from 'react'
import { 
  Container, 
  Title, 
  Paper, 
  Stack, 
  Text, 
  Badge, 
  Group, 
  Loader, 
  Button, 
  Textarea
} from '@mantine/core'
import { IconDownload, IconEdit, IconCheck, IconX } from '@tabler/icons-react'

function QuestionnaireBacklog() {
  const [backlogEntries, setBacklogEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [editedAnswers, setEditedAnswers] = useState({})
  const [acceptedAnswers, setAcceptedAnswers] = useState([])

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/questionnaire-backlog')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        if (isMounted) {
          setBacklogEntries(data.entries || [])
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error fetching backlog:', error)
        if (isMounted) {
          setError(error.message)
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  const handleDownload = async (entryId, filename) => {
    try {
      // Create a copy of the current entries to modify
      const updatedEntries = backlogEntries.map(entry => 
        entry.id === entryId ? { ...entry, downloading: true } : entry
      );
      setBacklogEntries(updatedEntries);

      const response = await fetch(`http://localhost:8000/questionnaire-backlog/${entryId}/download`);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${filename}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const markResponse = await fetch(`http://localhost:8000/questionnaire-backlog/${entryId}/mark-downloaded`, {
        method: 'POST'
      });
      if (!markResponse.ok) throw new Error('Failed to mark as downloaded');

      // Update the local state directly instead of fetching again
      const finalEntries = backlogEntries.map(entry => 
        entry.id === entryId ? { ...entry, downloaded: true, downloading: false } : entry
      );
      setBacklogEntries(finalEntries);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError(error.message);
      // Reset the downloading state on error
      const resetEntries = backlogEntries.map(entry => 
        entry.id === entryId ? { ...entry, downloading: false } : entry
      );
      setBacklogEntries(resetEntries);
    }
  };

  const handleEdit = (entry) => {
    if (!entry) return;
    
    console.log('Opening edit popup for entry:', entry);
    
    // Initialize editedAnswers with current answers
    const initialAnswers = {};
    (entry.low_confidence_answers || []).forEach(answer => {
      if (answer && answer.index !== undefined) {
        initialAnswers[answer.index] = answer.answer || '';
      }
    });
    
    console.log('Initializing answers:', initialAnswers);
    
    setSelectedEntry(entry);
    setEditedAnswers(initialAnswers);
    setAcceptedAnswers(
      (entry.low_confidence_answers || [])
        .filter(a => a && a.accepted)
        .map(a => a.index)
        .filter(index => index !== undefined)
    );
    setShowPopup(true);
  }

  const handleClosePopup = () => {
    setShowPopup(false)
    setSelectedEntry(null)
    setEditedAnswers({})
    setAcceptedAnswers([])
  }

  const handleSaveEdits = async () => {
    if (!selectedEntry) return;

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

      if (!response.ok) {
        throw new Error('Failed to save edits')
      }

      const updatedResponse = await fetch('http://localhost:8000/questionnaire-backlog')
      if (!updatedResponse.ok) {
        throw new Error('Failed to fetch updated data')
      }
      const updatedData = await updatedResponse.json()
      setBacklogEntries(updatedData.entries || [])

      handleClosePopup()
    } catch (error) {
      console.error('Error saving edits:', error)
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

  const getStatusColor = (status, downloaded) => {
    if (status === 'failed') return 'red'
    if (status === 'processing') return 'blue'
    if (!downloaded) return 'cyan'
    return 'green'
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
                    <Group spacing="sm" position="right" ml="auto" style={{ zIndex: 2 }}>
                      {entry.status !== 'failed' && entry.status !== 'processing' && (
                        <Button
                          variant="light"
                          color="dark"
                          leftSection={<IconEdit size={16} />}
                          onClick={() => handleEdit(entry)}
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
                          disabled={entry.status === 'processing' || entry.status === 'failed' || entry.downloading}
                          loading={entry.downloading}
                        >
                          {entry.downloading ? 'Downloading...' : 
                           entry.downloaded ? 'Download Again' : 'Download'}
                        </Button>
                      )}
                    </Group>
                    <div style={{ 
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 1
                    }}>
                      <Badge 
                        size="lg"
                        color={getStatusColor(entry.status, entry.downloaded)}
                        variant="filled"
                      >
                        {entry.status === 'failed' ? 'Failed' :
                         entry.status === 'processing' ? 'Processing' :
                         !entry.downloaded ? 'In Review' : 'Completed'}
                      </Badge>
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
                      <Text size="sm" c="dimmed">Questions in Review</Text>
                      <Group spacing={4} align="baseline">
                        <Text size="lg" fw={500} c={entry.unaccepted_answers_count > 0 ? "red" : undefined}>
                          {entry.unaccepted_answers_count}
                        </Text>
                      </Group>
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

      {showPopup && selectedEntry && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#f5f5f5',
          color: '#2C2E33',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 1000
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #e0e0e0',
            paddingBottom: '10px'
          }}>
            <Text size="lg" fw={700} c="#000000">Edit Questions in Review</Text>
            <Button 
              variant="subtle" 
              color="dark" 
              onClick={handleClosePopup}
              leftSection={<IconX size={16} />}
            >
              Close
            </Button>
          </div>

          <Stack spacing="md">
            {selectedEntry.low_confidence_answers.map((answer, idx) => (
              <Paper 
                key={`${answer.index}-${idx}`}
                p="md" 
                withBorder 
                shadow="sm"
                bg="#2C2E33"
                style={{ border: '1px solid #373A40' }}
              >
                <Stack spacing="xs">
                  <Group position="apart">
                    <Text size="sm" fw={500} c="white">Question:</Text>
                    <Badge 
                      color="#D35400"
                      styles={{
                        root: {
                          backgroundColor: '#D35400',
                          opacity: 0.85
                        }
                      }}
                    >
                      Confidence: {Math.round(answer.confidence * 100)}%
                    </Badge>
                  </Group>
                  <Text c="white">{answer.question}</Text>
                  
                  <Text size="sm" fw={500} c="white">Original Answer:</Text>
                  <Text c="#909296">{answer.answer}</Text>
                  
                  <Text size="sm" fw={500} c="white">Edit Answer:</Text>
                  <Textarea
                    value={editedAnswers[answer.index] ?? answer.answer}
                    onChange={(event) => {
                      const newValue = event.currentTarget?.value;
                      if (newValue !== undefined) {
                        setEditedAnswers(prev => ({
                          ...prev,
                          [answer.index]: newValue
                        }));
                      }
                    }}
                    rows={4}
                    minRows={4}
                    styles={{
                      input: {
                        backgroundColor: 'white',
                        color: '#2C2E33',
                        border: '1px solid #373A40',
                        '&:focus': {
                          borderColor: '#228BE6'
                        }
                      }
                    }}
                  />
                  
                  <Group position="right" spacing="xs">
                    <Button
                      variant={acceptedAnswers.includes(answer.index) ? "filled" : "light"}
                      color="green"
                      leftSection={<IconCheck size={16} color={acceptedAnswers.includes(answer.index) ? "white" : "black"} />}
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
              <Button variant="light" onClick={handleClosePopup}>Cancel</Button>
              <Button onClick={handleSaveEdits}>Save Changes</Button>
            </Group>
          </Stack>
        </div>
      )}

      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999
        }} onClick={handleClosePopup} />
      )}
    </Container>
  )
}

export default QuestionnaireBacklog 