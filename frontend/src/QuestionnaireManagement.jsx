import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, FileInput, Select, Group, Box, Badge, Alert, Progress, Tooltip, Textarea } from '@mantine/core'
import { IconUpload, IconInfoCircle } from '@tabler/icons-react'

function QuestionnaireManagement() {
  const [questionnaireFile, setQuestionnaireFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedQuestionnaires, setProcessedQuestionnaires] = useState([])
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null)

  const handleProcessQuestionnaire = async () => {
    if (!questionnaireFile) return

    setIsProcessing(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', questionnaireFile)

    try {
      const response = await fetch('http://localhost:8000/process-questionnaire', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to process questionnaire')
      }

      const data = await response.json()
      setProcessedQuestionnaires(prevState => [data, ...prevState])
      setQuestionnaireFile(null)
    } catch (error) {
      console.error('Error processing questionnaire:', error)
      setError(error.message || 'Failed to process questionnaire. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

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

            {error && (
              <Alert 
                color="red"
                styles={(theme) => ({
                  root: {
                    backgroundColor: theme.colors.red[5],
                  },
                  message: {
                    color: 'white',
                    fontWeight: 700
                  }
                })}
              >
                {error}
              </Alert>
            )}
          </Stack>
        </Paper>

        {processedQuestionnaires.length > 0 && (
          <Paper p={40} radius="lg" withBorder pos="relative" mt="xl">
            <Button 
              onClick={() => setShowDownloadModal(true)}
              variant="light"
              style={{ position: 'absolute', top: '16px', right: '16px' }}
            >
              Download CSV
            </Button>
            <Stack spacing="xl">
              <Title order={2} size={28}>Processed Results</Title>
              <Stack spacing="xl" mt={40}>
                {processedQuestionnaires.map((result, index) => (
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
                                value={result.best_match.answer_key}
                                minRows={2}
                                disabled
                                style={{ flex: 1 }}
                                styles={{
                                  input: {
                                    backgroundColor: 'white',
                                    color: 'dark',
                                  }
                                }}
                              />
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

      {showDownloadModal && (
        <Paper p={40} radius="lg" withBorder pos="relative" mt="xl">
          <Button 
            onClick={() => setShowDownloadModal(false)}
            variant="light"
            style={{ position: 'absolute', top: '16px', right: '16px' }}
          >
            Close
          </Button>
          <Stack spacing="xl">
            <Title order={2} size={28}>Download CSV</Title>
            <Text size="lg" c="dimmed">
              The processed questionnaire CSV file is ready for download.
            </Text>
            <Group position="right">
              <Button
                onClick={() => {
                  // Implement CSV download logic here
                }}
              >
                Download CSV
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}
    </Container>
  )
}

export default QuestionnaireManagement 