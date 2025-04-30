import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, FileInput, Select, Group, Box, Badge, Alert, Progress, Tooltip, Textarea } from '@mantine/core'
import { IconUpload, IconInfoCircle } from '@tabler/icons-react'

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
  const [editedAnswers, setEditedAnswers] = useState({})
  const [acceptedAnswers, setAcceptedAnswers] = useState({})

  // Debug logging function
  const logDebug = (type, message, data = null) => {
    const logMessage = `[QuestionnaireManagement] ${type}: ${message}`
    if (data) {
      console.log(logMessage, data)
    } else {
      console.log(logMessage)
    }
  }

  // Download CSV function as a component method
  const downloadCsv = () => {
    if (!processingResults) return;
    
    logDebug('Download', 'Current state:', { editedAnswers, acceptedAnswers });
    
    const processedResults = processingResults.map((result, index) => {
      let answer = '';
      
      if (result.best_match) {
        const hasLowConfidence = result.best_match.similarity < 0.5;
        
        logDebug('Processing', `Question ${index + 1}:`, {
          hasLowConfidence,
          isAccepted: acceptedAnswers[index],
          editedAnswer: editedAnswers[index],
          originalAnswer: result.best_match.answer_key
        });

        if (hasLowConfidence && acceptedAnswers[index] === true && editedAnswers[index]) {
          answer = editedAnswers[index];
          logDebug('Answer', `Using edited answer for question ${index + 1}:`, answer);
        } else {
          answer = result.best_match.answer_key;
          logDebug('Answer', `Using original answer for question ${index + 1}:`, answer);
        }
      }

      return {
        question: result.input_question,
        answer: answer,
        confidence: result.best_match ? Math.round(result.best_match.similarity * 100) + '%' : '0%'
      };
    });

    logDebug('Download', 'Final processed results:', processedResults);

    const headers = ['Question', 'Answer', 'Confidence'];
    const csvRows = [
      headers.join(','),
      ...processedResults.map(row => 
        [
          `"${row.question.replace(/"/g, '""')}"`,
          `"${row.answer.replace(/"/g, '""')}"`,
          row.confidence
        ].join(',')
      )
    ];
    const csvContent = csvRows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed_questionnaire.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

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

  // Add handler for answer changes
  const handleAnswerChange = (index, value) => {
    setEditedAnswers(prev => ({
      ...prev,
      [index]: value
    }));
    // Clear accepted state when answer is edited
    setAcceptedAnswers(prev => ({
      ...prev,
      [index]: false
    }));
  };

  const handleAcceptAnswer = (index) => {
    if (editedAnswers[index]) {
      setAcceptedAnswers(prev => ({
        ...prev,
        [index]: true
      }));
    }
  };

  const handleEditAcceptedAnswer = (index) => {
    setAcceptedAnswers(prev => ({
      ...prev,
      [index]: false
    }));
  };

  return (
    <Container size="xl">
      <Stack spacing="md" mt={40}>
        <Title order={1} size={32}>Process Questionnaire</Title>
        <Text size="lg" c="dimmed">
          Upload a questionnaire CSV file to have it automatically filled out using the knowledge base.
          The system will attempt to match each question with the most relevant answer from the knowledge base.
        </Text>

        <Paper p={40} radius="lg" withBorder>
          <Stack spacing="md">
            <Group position="apart">
              <Title order={2} size={28}>Upload Customer Questionnaire</Title>
              <Tooltip label="Upload a questionnaire to be processed against the knowledge base" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <Stack spacing="md">
              <FileInput
                placeholder="Choose questionnaire file"
                label={<Text size="sm" fw={600} c="#FFFFFF">Questionnaire</Text>}
                description={<Text c="#94A3B8" size="sm" component="span">Upload a CSV file containing questions to be processed</Text>}
                accept=".csv"
                value={questionnaireFile}
                onChange={setQuestionnaireFile}
              />
              <Select
                label={<Text size="sm" fw={600} c="#FFFFFF">Filter by Entity</Text>}
                description={<Text c="#94A3B8" size="sm" component="span">Optionally limit matches to a specific entity</Text>}
                placeholder="Select entity"
                data={[
                  { value: 'Mindbody', label: 'Mindbody' },
                  { value: 'ClassPass', label: 'ClassPass' }
                ]}
                value={selectedEntity}
                onChange={setSelectedEntity}
              />
              <Group position="right">
                <Button
                  onClick={handleProcessQuestionnaire}
                  loading={isProcessing}
                  disabled={!questionnaireFile}
                >
                  Process Questionnaire
                </Button>
              </Group>
            </Stack>

            {isProcessing && (
              <Paper p={40} radius="lg" withBorder>
                <Stack spacing="sm">
                  <Group position="apart">
                    <Text size="sm">Uploading {questionnaireFile?.name}</Text>
                    <Badge color="blue">PROCESSING</Badge>
                  </Group>
                  <Progress
                    animate="true"
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
          <Paper p={40} radius="lg" withBorder pos="relative" mt="xl">
            <Button 
              onClick={downloadCsv}
              variant="light"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              Download CSV
            </Button>
            <Stack spacing="xl">
              <Title order={2} size={28}>Processed Results</Title>
              <Stack spacing="xl" mt={40}>
                {processingResults.map((result, index) => (
                  <Paper 
                    key={index} 
                    p="md" 
                    withBorder
                    bg={result.best_match && result.best_match.similarity < 0.5 ? 'white' : undefined}
                  >
                    <Group position="apart" mb="xs">
                      <Text fw={700} c={result.best_match && result.best_match.similarity < 0.5 ? 'dark' : undefined}>Question {index + 1}</Text>
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
                    <Text size="sm" c={result.best_match && result.best_match.similarity < 0.5 ? 'dark' : undefined} mb="xs">
                      <Text component="span" fw={700} c={result.best_match && result.best_match.similarity < 0.5 ? 'dark' : undefined}>Original: </Text>
                      {result.input_question}
                    </Text>
                    {result.best_match ? (
                      <>
                        <Text size="sm" weight={500} mt="md">
                          <Text component="span" fw={700} c={result.best_match.similarity < 0.5 ? 'dark' : undefined}>Best Match:</Text>
                        </Text>
                        <Text size="sm" c={result.best_match.similarity < 0.5 ? 'dark' : undefined} mb="xs">
                          <Text component="span" fw={700} c={result.best_match.similarity < 0.5 ? 'dark' : undefined}>Question: </Text>
                          {result.best_match.question}
                        </Text>
                        {result.best_match.similarity < 0.5 ? (
                          <Stack spacing="xs">
                            <Text component="span" fw={700} c="dark">Answer: </Text>
                            <Group align="flex-start" spacing="sm">
                              <Textarea
                                value={editedAnswers[index] || result.best_match.answer_key}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                minRows={2}
                                disabled={acceptedAnswers[index]}
                                style={{ flex: 1 }}
                                styles={{
                                  input: {
                                    backgroundColor: 'white',
                                    color: 'dark',
                                  }
                                }}
                              />
                              {acceptedAnswers[index] ? (
                                <Button
                                  size="sm"
                                  color="yellow"
                                  onClick={() => handleEditAcceptedAnswer(index)}
                                >
                                  Edit
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  color={acceptedAnswers[index] ? "green" : "blue"}
                                  onClick={() => handleAcceptAnswer(index)}
                                  disabled={acceptedAnswers[index] || !editedAnswers[index]}
                                >
                                  Accept
                                </Button>
                              )}
                            </Group>
                          </Stack>
                        ) : (
                          <Text size="sm" c={result.best_match.similarity < 0.5 ? 'dark' : undefined}>
                            <Text component="span" fw={700} c={result.best_match.similarity < 0.5 ? 'dark' : undefined}>Answer: </Text>
                            {result.best_match.answer_key}
                          </Text>
                        )}
                        {result.best_match.comment && (
                          <Text 
                            size="sm" 
                            mt="xs" 
                            fw={700}
                            c={result.best_match.similarity < 0.5 ? 'dark' : 'white'}
                          >
                            {result.best_match.comment}
                          </Text>
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