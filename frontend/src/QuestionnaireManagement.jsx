import React, { useState } from 'react'
import { Container, Title, Paper, Stack, Text, Button, FileInput, Group, Alert, Badge, Modal, Tooltip } from '@mantine/core'
import { IconUpload, IconInfoCircle } from '@tabler/icons-react'

function QuestionnaireManagement() {
  const [questionnaireFile, setQuestionnaireFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState(null)
  const [processStatus, setProcessStatus] = useState(null)
  const [processingResultsModal, setProcessingResultsModal] = useState({
    opened: false,
    results: null
  })

  const handleProcessQuestionnaire = async () => {
    if (!questionnaireFile) return

    setIsProcessing(true)
    setProcessingResults(null)
    setProcessStatus(null)

    try {
      const formData = new FormData()
      
      // Read the file content
      const fileContent = await questionnaireFile.text()
      
      // Parse CSV properly handling line breaks within fields
      const rows = []
      let inQuotes = false
      let currentField = ''
      let currentRow = []
      
      for (let i = 0; i < fileContent.length; i++) {
        const char = fileContent[i]
        const nextChar = fileContent[i + 1]
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Handle escaped quotes
            currentField += '"'
            i++ // Skip next quote
          } else {
            // Toggle quotes mode
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          currentRow.push(currentField.trim())
          currentField = ''
        } else if (char === '\n' && !inQuotes) {
          // End of row
          currentRow.push(currentField.trim())
          if (currentRow.some(field => field)) { // Only add non-empty rows
            rows.push(currentRow)
          }
          currentField = ''
          currentRow = []
        } else if (char === '\r') {
          // Skip carriage return
          continue
        } else {
          currentField += char
        }
      }
      
      // Add the last field and row if exists
      if (currentField) {
        currentRow.push(currentField.trim())
      }
      if (currentRow.some(field => field)) {
        rows.push(currentRow)
      }

      if (rows.length === 0) {
        throw new Error('CSV file is empty')
      }

      // Get and normalize headers
      const headers = rows[0].map(h => h.trim().toLowerCase())
      
      // Check if we need to add required columns
      const hasQuestion = headers.some(h => h.includes('question'))
      const hasAnswer = headers.some(h => h.includes('answer'))
      const hasComment = headers.some(h => h.includes('comment'))
      
      if (!hasQuestion) {
        throw new Error('CSV must contain a question column')
      }

      // Create new CSV content with required columns
      let newHeaders = [...headers]
      if (!hasAnswer) {
        newHeaders.push('answer')
      }
      if (!hasComment) {
        newHeaders.push('comment')
      }

      // Create new CSV content, properly escaping fields with quotes if they contain commas or line breaks
      const escapeCsvField = (field) => {
        if (field.includes(',') || field.includes('\n') || field.includes('"')) {
          return `"${field.replace(/"/g, '""')}"` // Escape quotes by doubling them
        }
        return field
      }

      const newLines = [
        newHeaders.join(','),
        ...rows.slice(1).map(row => {
          const values = [...row]
          while (values.length < newHeaders.length) {
            values.push('')
          }
          return values.map(escapeCsvField).join(',')
        })
      ]
      
      // Create new file with modified content
      const newContent = newLines.join('\n')
      const newFile = new File([newContent], questionnaireFile.name, {
        type: 'text/csv'
      })

      formData.append('file', newFile)

      const response = await fetch('http://localhost:8000/process-questionnaire', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to process questionnaire')
      }

      const data = await response.json()
      
      if (data.results) {
        setProcessingResults(data.results)
        setProcessingResultsModal({
          opened: true,
          results: data.results
        })
        setProcessStatus({
          type: 'success',
          message: `Processed ${data.results.length} questions successfully`
        })

        // Download processed CSV file
        if (data.csv_content) {
          const blob = new Blob([data.csv_content], { type: 'text/csv' })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = data.filename || 'processed_questionnaire.csv'
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } else {
        throw new Error('No results returned from server')
      }
    } catch (error) {
      console.error('Error processing questionnaire:', error)
      setProcessStatus({
        type: 'error',
        message: error.message || 'Failed to process questionnaire. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Container size="xl" py={40}>
      <Stack spacing={40}>
        <Title order={1} size={32}>Questionnaire Management</Title>

        <Paper p="xl" radius="lg">
          <Stack spacing="xl">
            <Group position="apart">
              <Title order={2} size={24}>Process Questionnaire</Title>
              <Tooltip label="Upload a questionnaire CSV for automated processing and answer matching" position="left" multiline width={220}>
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <Stack spacing="md">
              <FileInput
                label="Select CSV File"
                description="Upload a questionnaire CSV file to process and match with existing answers"
                placeholder="Click to select file"
                accept=".csv"
                value={questionnaireFile}
                onChange={setQuestionnaireFile}
                icon={<IconUpload size={20} />}
              />
              {questionnaireFile && (
                <Group>
                  <Tooltip label="Process the questionnaire and find matching answers">
                    <Button
                      onClick={handleProcessQuestionnaire}
                      loading={isProcessing}
                      leftSection={<IconUpload size={20} />}
                    >
                      Process File
                    </Button>
                  </Tooltip>
                  <Tooltip label="Clear the selected file">
                    <Button
                      variant="light"
                      onClick={() => setQuestionnaireFile(null)}
                    >
                      Clear
                    </Button>
                  </Tooltip>
                </Group>
              )}
              {processStatus && (
                <Alert 
                  color={processStatus.type === 'success' ? 'green' : 'red'}
                  title={processStatus.type === 'success' ? 'Success' : 'Error'}
                  variant="light"
                >
                  {processStatus.message}
                </Alert>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Modal
          opened={processingResultsModal.opened}
          onClose={() => setProcessingResultsModal({ ...processingResultsModal, opened: false })}
          title="Processing Results"
          size="lg"
        >
          {processingResultsModal.results && (
            <Stack spacing="md">
              {processingResultsModal.results.length === 0 ? (
                <Text c="dimmed" ta="center">No results found</Text>
              ) : (
                processingResultsModal.results.map((result, index) => (
                  <Paper key={index} p="md" withBorder>
                    <Stack spacing="sm">
                      <Group position="apart">
                        <Stack spacing={4}>
                          <Text weight={600}>Question</Text>
                          <Text>{result.question}</Text>
                        </Stack>
                        {result.entity && (
                          <Badge size="lg" variant="light">
                            {result.entity}
                          </Badge>
                        )}
                      </Group>
                      <Stack spacing={4}>
                        <Text weight={600}>Answer</Text>
                        <Text>{result.answer || 'Not provided'}</Text>
                      </Stack>
                      {result.comment && (
                        <Stack spacing={4}>
                          <Text weight={600}>Comment</Text>
                          <Text>{result.comment}</Text>
                        </Stack>
                      )}
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          )}
        </Modal>
      </Stack>
    </Container>
  )
}

export default QuestionnaireManagement 