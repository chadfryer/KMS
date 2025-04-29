import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, FileInput, Select, Group, Box, Badge, Alert, Progress } from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'

function QuestionnaireManagement() {
  // State management
  const [questionnaireFile, setQuestionnaireFile] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState(null)
  const [processStatus, setProcessStatus] = useState(null)
  const [currentResults, setCurrentResults] = useState([])
  const [processProgress, setProcessProgress] = useState({
    current: 0,
    total: 0,
    phase: 'Preparing'
  })

  // Debug logging function
  const logDebug = (type, message, data = null) => {
    const logMessage = `[QuestionnaireManagement] ${type}: ${message}`
    if (data) {
      console.log(logMessage, data)
    } else {
      console.log(logMessage)
    }
  }

  const handleProcessQuestionnaire = async () => {
    if (!questionnaireFile) {
      logDebug('Error', 'No file selected')
      return
    }

    const clientId = `process-${Date.now()}`
    logDebug('Process', `Starting questionnaire processing with client ID: ${clientId}`)
    
    // Reset states
    setIsProcessing(true)
    setProcessProgress({
      current: 0,
      total: 0,
      phase: 'Preparing'
    })
    setProcessStatus(null)
    setCurrentResults([])
    setProcessingResults(null)

    try {
      // Set up EventSource for progress updates
      const eventSourceUrl = new URL('http://localhost:8000/questionnaire-progress')
      eventSourceUrl.searchParams.append('client_id', clientId)
      logDebug('Connection', `Setting up new process EventSource connection to: ${eventSourceUrl.toString()}`)

      const eventSource = new EventSource(eventSourceUrl.toString())
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          logDebug('Progress', 'Parsed progress data:', data)
          
          setProcessProgress({
            current: data.current_entry,
            total: data.total_entries,
            phase: data.phase
          })

          if (data.processed_result) {
            setCurrentResults(prev => [...prev, data.processed_result])
          }

          if (data.phase === 'Complete') {
            eventSource.close()
          }
        } catch (error) {
          logDebug('Error', 'Error parsing progress event:', error)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
      }

      // Start the questionnaire processing
      logDebug('Process', 'Starting questionnaire processing...')
      const formData = new FormData()
      formData.append('file', questionnaireFile)

      const url = new URL('http://localhost:8000/process-questionnaire')
      url.searchParams.append('client_id', clientId)
      if (selectedEntity) {
        url.searchParams.append('entity', selectedEntity)
      }

      logDebug('Request', `Sending processing request to: ${url.toString()}`)
      const response = await fetch(url.toString(), {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to process questionnaire')
      }

      const data = await response.json()
      logDebug('Response', 'Processing completed successfully:', data)
      
      if (data.results) {
        setProcessingResults(data.results)
        setProcessStatus({
          type: 'success',
          message: `Processed ${data.results.length} questions successfully`
        })
        setCurrentResults(data.results)

        // Move CSV download to after user has reviewed results
        if (data.csv_content) {
          const downloadCsv = () => {
            const blob = new Blob([data.csv_content], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = data.filename || 'processed_questionnaire.csv'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            logDebug('Download', 'CSV file downloaded successfully')
          }
          
          // Store download function for later use
          window.downloadProcessedQuestionnaire = downloadCsv
        }
      }
    } catch (error) {
      logDebug('Error', 'Error processing questionnaire:', error)
      setProcessStatus({
        type: 'error',
        message: error.message || 'Failed to process questionnaire. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Container size="lg">
      <Stack spacing="md">
        <Title order={2} mb="lg">Process Questionnaire</Title>
        <Text color="dimmed" size="sm">
          Upload a questionnaire CSV file to have it automatically filled out using the knowledge base.
          The system will attempt to match each question with the most relevant answer from the knowledge base.
        </Text>

        <Paper shadow="xs" p="md">
          <Stack spacing="md">
            <Group>
              <FileInput
                placeholder="Choose questionnaire file"
                label="Questionnaire CSV"
                description="Upload a CSV file containing questions to be processed"
                accept=".csv"
                value={questionnaireFile}
                onChange={setQuestionnaireFile}
                style={{ flex: 1 }}
              />
              <Select
                label="Filter Entity"
                description="Optionally limit matches to a specific entity"
                placeholder="Select entity"
                data={[
                  { value: 'Mindbody', label: 'Mindbody' },
                  { value: 'ClassPass', label: 'ClassPass' }
                ]}
                value={selectedEntity}
                onChange={setSelectedEntity}
                style={{ width: '200px' }}
              />
              <Button
                onClick={handleProcessQuestionnaire}
                loading={isProcessing}
                disabled={!questionnaireFile}
                mt="auto"
              >
                Process Questionnaire
              </Button>
            </Group>

            {isProcessing && (
              <Paper p="md" withBorder>
                <Stack spacing="sm">
                  <Group position="apart">
                    <Text size="sm">Uploading {questionnaireFile?.name}</Text>
                    <Badge color="blue">PROCESSING</Badge>
                  </Group>
                  <Progress
                    animate
                    size="xl"
                    radius="xl"
                    color="blue"
                    value={100}
                    striped
                  />
                  <Text size="sm" c="dimmed">Processing file, please wait...</Text>
                </Stack>
              </Paper>
            )}

            {processStatus && !isProcessing && (
              <Alert 
                color={processStatus.type === 'success' ? 'green' : 'red'}
                styles={(theme) => ({
                  root: {
                    backgroundColor: processStatus.type === 'success' ? theme.colors.green[5] : undefined,
                  },
                  message: {
                    color: processStatus.type === 'success' ? 'white' : undefined,
                    fontWeight: 700
                  }
                })}
              >
                {processStatus.message}
              </Alert>
            )}
          </Stack>
        </Paper>

        {processingResults && processingResults.length > 0 && (
          <Paper shadow="xs" p="md" pos="relative">
            <Button 
              onClick={() => window.downloadProcessedQuestionnaire()} 
              variant="light"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              Download CSV
            </Button>
            <Stack spacing="md">
              <Title order={4}>Processing Results</Title>
              <Stack spacing="sm">
                {processingResults.map((result, index) => (
                  <Paper key={index} p="md" withBorder>
                    <Group position="apart" mb="xs">
                      <Text weight={500}>Question {index + 1}</Text>
                      {result.best_match && (
                        <Badge 
                          color={
                            result.best_match.similarity >= 0.8 ? 'green' : 
                            result.best_match.similarity >= 0.6 ? 'yellow' : 
                            'red'
                          }
                        >
                          {Math.round(result.best_match.similarity * 100)}% Match
                        </Badge>
                      )}
                    </Group>
                    <Text size="sm" color="dimmed" mb="xs">Original: {result.input_question}</Text>
                    {result.best_match ? (
                      <>
                        <Text size="sm" weight={500} mt="md">Best Match:</Text>
                        <Text size="sm" color="dimmed" mb="xs">Question: {result.best_match.question}</Text>
                        <Text size="sm">Answer: {result.best_match.answer_key}</Text>
                        {result.best_match.comment && (
                          <Text size="sm" mt="xs" color="blue">{result.best_match.comment}</Text>
                        )}
                      </>
                    ) : (
                      <Text size="sm" color="red">No matching answer found</Text>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}

export default QuestionnaireManagement 