import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Textarea, Button, Stack, Text, Group, FileInput, TextInput, Modal, Select, Alert, Badge, Tooltip, Box, Progress } from '@mantine/core'
import { IconUpload, IconSearch, IconInfoCircle } from '@tabler/icons-react'

/**
 * MainView component provides the primary interface for interacting with the system.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onViewDatabase - Callback function to view the database
 */
function MainView({ onViewDatabase }) {
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswerKey, setNewAnswerKey] = useState('')
  const [newEntity, setNewEntity] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState('')
  const [questionnaires, setQuestionnaires] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [questionnaireFile, setQuestionnaireFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState(null)
  const [processStatus, setProcessStatus] = useState(null)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, phase: 'Preparing' })

  const [duplicatesModal, setDuplicatesModal] = useState({
    opened: false,
    title: '',
    duplicates: [],
    similarQuestion: null
  })

  const [searchResultsModal, setSearchResultsModal] = useState({
    opened: false,
    results: null
  })

  const [processingResultsModal, setProcessingResultsModal] = useState({
    opened: false,
    results: null
  })

  useEffect(() => {
    const fetchQuestionnaires = async () => {
      try {
        const response = await fetch('http://localhost:8000/questions')
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaires')
        }
        const data = await response.json()
        if (data.questions && Array.isArray(data.questions)) {
          const entities = data.questions
            .map(q => q.entity)
            .filter(entity => entity && entity.trim() !== '')
          setQuestionnaires(data.questions)
        } else {
          console.error('Invalid data structure:', data)
        }
      } catch (error) {
        console.error('Error fetching questionnaires:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestionnaires()
  }, [])

  /**
   * Handle submission of a new question-answer pair
   * 
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('question', newQuestion)
      formData.append('answer_key', newAnswerKey)
      formData.append('entity', newEntity)

      const response = await fetch('http://localhost:8000/add', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setNewQuestion('')
        setNewAnswerKey('')
        setNewEntity('')
        setUploadStatus({
          type: 'success',
          message: 'Question-answer pair added successfully'
        })
      } else {
        setDuplicatesModal({
          opened: true,
          title: 'Similar Question Found',
          duplicates: [],
          similarQuestion: data.similar_question
        })
      }
    } catch (error) {
      console.error('Error adding questionnaire:', error)
      setUploadStatus({
        type: 'error',
        message: 'Failed to add question-answer pair. Please try again.'
      })
    }
  }

  /**
   * Handle file upload for CSV import
   * 
   * @param {File} file - CSV file to upload
   */
  const handleFileUpload = async (file) => {
    if (!file) return

    setIsUploading(true)
    setUploadStatus(null)
    setUploadProgress({ current: 0, total: 0, phase: 'Preparing' })

    try {
      const formData = new FormData()
      const content = await file.text()
      const cleanContent = content.replace(/^\ufeff/, '')
      const cleanFile = new File([cleanContent], file.name, { type: file.type })
      formData.append('file', cleanFile)

      const response = await fetch('http://localhost:8000/upload-csv', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to upload file')
      }

      const data = await response.json()
      
      const hasDuplicates = data.results.some(result => result.duplicates && result.duplicates.length > 0)
      
      if (hasDuplicates) {
        setDuplicatesModal({
          opened: true,
          title: 'Duplicate Questions Found',
          duplicates: data.results.flatMap(result => result.duplicates || []),
          similarQuestion: null
        })
      }

      const questionnairesResponse = await fetch('http://localhost:8000/questions')
      if (questionnairesResponse.ok) {
        const questionnairesData = await questionnairesResponse.json()
        setQuestionnaires(questionnairesData.questions)
      }

      setUploadStatus({
        type: 'success',
        message: data.message,
        results: data.results
      })
      setSelectedFile(null)
    } catch (error) {
      console.error('Error processing file:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to process file. Please try again.'
      })
    } finally {
      setIsUploading(false)
    }
  }

  /**
   * Handle search query submission
   * 
   * @param {Event} e - Form submission event
   */
  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setSearchResults(null)

    try {
      const params = new URLSearchParams()
      params.append('query', searchQuery)
      if (selectedEntity) {
        params.append('entity', selectedEntity)
      }
      
      const response = await fetch(`http://localhost:8000/search?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to search questions')
      }

      const data = await response.json()
      setSearchResults(data.results)
      setSearchResultsModal({
        opened: true,
        results: data.results
      })
    } catch (error) {
      console.error('Error searching questions:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to search questions. Please try again.'
      })
    } finally {
      setIsSearching(false)
    }
  }

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

      // Build URL with query parameters
      const url = new URL('http://localhost:8000/process-questionnaire')
      if (selectedEntity) {
        url.searchParams.append('entity', selectedEntity)
      }

      const response = await fetch(url.toString(), {
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
        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Knowledge Management System</Title>
            <Text c="dimmed" size="lg">Manage and search your question-answer database.</Text>
          </Stack>
        </Group>

        <Paper p={40} radius="lg" withBorder mb={40}>
          <Stack spacing="xl">
            <Group position="apart">
              <Title order={2} size={24}>Add New Question</Title>
              <Tooltip label="Add individual questions and answers to the knowledge base" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <form onSubmit={handleSubmit}>
              <Stack spacing="md">
                <Textarea
                  label={
                    <Text c="#FFFFFF" style={{ display: 'inline' }} fw={700}>
                      Question<Text component="span" c="red" ml={0}>*</Text>
                    </Text>
                  }
                  description={<Box component="span" c="dimmed" style={{ fontSize: '14px' }}>Enter the question you want to add to the knowledge base.</Box>}
                  placeholder="e.g., What are the operating hours?"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  minRows={3}
                  styles={{
                    input: {
                      color: '#000000',
                      fontSize: '16px',
                      lineHeight: 1.6
                    }
                  }}
                />
                <Textarea
                  label={
                    <Text c="#FFFFFF" style={{ display: 'inline' }} fw={700}>
                      Answer<Text component="span" c="red" ml={0}>*</Text>
                    </Text>
                  }
                  description={<Box component="span" c="dimmed" style={{ fontSize: '14px' }}>Provide a clear and concise answer to the question.</Box>}
                  placeholder="e.g., Our operating hours are Monday to Friday, 9 AM to 5 PM"
                  value={newAnswerKey}
                  onChange={(e) => setNewAnswerKey(e.target.value)}
                  minRows={3}
                  styles={{
                    input: {
                      color: '#000000',
                      fontSize: '16px',
                      lineHeight: 1.6
                    }
                  }}
                />
                <TextInput
                  label={
                    <Text c="#FFFFFF" style={{ display: 'inline' }} fw={700}>
                      Entity<Text component="span" c="red" ml={0}>*</Text>
                    </Text>
                  }
                  description={<Box component="span" c="dimmed" style={{ fontSize: '14px' }}>Specify the entity or category to which this Q&A belongs.</Box>}
                  placeholder="e.g., Mindbody, ClassPass"
                  value={newEntity}
                  onChange={(e) => setNewEntity(e.target.value)}
                  styles={{
                    input: {
                      color: '#000000'
                    }
                  }}
                />
                <Group position="right">
                  <Button type="submit" size="md">Add Question</Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Paper>

        <Paper p={40} radius="lg" withBorder mb={40}>
          <Stack spacing="xl">
            <Group position="apart">
              <Title order={2} size={24}>Upload Questions</Title>
              <Tooltip label="Bulk upload questions and answers using a CSV file" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <Stack spacing="md">
              <FileInput
                label={<Text c="#FFFFFF" fw={700}>Select CSV File</Text>}
                description={<Box component="span" c="dimmed" style={{ fontSize: '14px' }}>Upload a CSV file containing questions and answers (columns: question, answer_key, entity).</Box>}
                placeholder="Click to select file"
                accept=".csv"
                value={selectedFile}
                onChange={setSelectedFile}
                icon={<IconUpload size={20} />}
              />
              {selectedFile && (
                <Group>
                  <Tooltip label="Upload and process the selected CSV file">
                    <Button
                      onClick={() => handleFileUpload(selectedFile)}
                      loading={isUploading}
                      leftSection={<IconUpload size={20} />}
                    >
                      Upload File
                    </Button>
                  </Tooltip>
                  <Tooltip label="Clear the selected file">
                    <Button
                      variant="light"
                      onClick={() => setSelectedFile(null)}
                    >
                      Clear
                    </Button>
                  </Tooltip>
                </Group>
              )}
              {isUploading && (
                <Paper p="md" withBorder>
                  <Stack spacing="sm">
                    <Group position="apart">
                      <Text size="sm" fw={500}>Uploading {selectedFile?.name}</Text>
                      <Badge color="green">{uploadProgress.phase}</Badge>
                    </Group>
                    <Box py={6}>
                      <Group position="apart" align="center" mb={8}>
                        <Text size="sm" c="dimmed">
                          {uploadProgress.phase !== 'Complete' ? (
                            `Processing ${uploadProgress.current} of ${uploadProgress.total} entries`
                          ) : (
                            'Processing complete'
                          )}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}%
                        </Text>
                      </Group>
                      <Progress
                        value={uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}
                        size="xl"
                        radius="xl"
                        color={uploadProgress.phase === 'Complete' ? 'green' : 'blue'}
                        animated={uploadProgress.phase !== 'Complete'}
                        striped={true}
                      />
                    </Box>
                    <Text size="xs" c="dimmed">
                      {uploadProgress.phase === 'Preparing' && 'Preparing to process file...'}
                      {uploadProgress.phase === 'Reading File' && 'Processing file contents and checking for duplicates...'}
                      {uploadProgress.phase === 'Complete' && 'File processing complete'}
                    </Text>
                  </Stack>
                </Paper>
              )}
              {uploadStatus && !isUploading && (
                <Alert 
                  color={uploadStatus.type === 'success' ? 'green' : 'red'}
                  title={uploadStatus.type === 'success' ? 'Success' : 'Error'}
                  variant="light"
                  icon={uploadStatus.type === 'success' ? '✓' : '⚠️'}
                >
                  <Stack spacing="xs">
                    <Text>{uploadStatus.message}</Text>
                    {uploadStatus.type === 'success' && uploadStatus.results && (
                      <Text size="sm" c="dimmed">
                        Successfully processed {uploadStatus.results.length} entries
                      </Text>
                    )}
                  </Stack>
                </Alert>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Paper p={40} radius="lg" withBorder>
          <Stack spacing="xl">
            <Group position="apart">
              <Title order={2} size={24}>Search Questions</Title>
              <Tooltip label="Search through the knowledge base using keywords or phrases" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <form onSubmit={handleSearch}>
              <Stack spacing="md">
                <TextInput
                  placeholder="Enter keywords to search..."
                  description={<Box component="span" c="dimmed" style={{ fontSize: '14px' }}>Search for questions using keywords or phrases.</Box>}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<IconSearch size={20} />}
                  size="md"
                />
                <Select
                  label={<Text c="#FFFFFF" fw={700}>Filter by Entity</Text>}
                  description={<Box component="span" c="dimmed" style={{ fontSize: '14px' }}>Narrow down results to a specific entity.</Box>}
                  placeholder="All entities"
                  data={[
                    { value: '', label: 'All entities', color: '#333333' },
                    ...Array.from(new Set(questionnaires.map(q => q.entity)))
                      .filter(Boolean)
                      .map(entity => ({
                        value: entity,
                        label: entity
                      }))
                  ]}
                  value={selectedEntity}
                  onChange={setSelectedEntity}
                  styles={{
                    input: {
                      color: selectedEntity ? '#FFFFFF' : '#333333'
                    },
                    item: {
                      color: '#FFFFFF',
                      '&[data-selected]': {
                        color: '#333333'
                      }
                    }
                  }}
                />
                <Group position="right">
                  <Tooltip label="Search the knowledge base">
                    <Button 
                      type="submit" 
                      loading={isSearching}
                      leftSection={<IconSearch size={20} />}
                    >
                      Search
                    </Button>
                  </Tooltip>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Paper>

        <Modal
          opened={duplicatesModal.opened}
          onClose={() => setDuplicatesModal({ ...duplicatesModal, opened: false })}
          title={duplicatesModal.title}
          size="lg"
        >
          {duplicatesModal.similarQuestion ? (
            <Stack spacing="md">
              <Paper p="md" withBorder>
                <Stack spacing="sm">
                  <Text weight={600}>Similar Question Found:</Text>
                  <Text>{duplicatesModal.similarQuestion.question}</Text>
                  {duplicatesModal.similarQuestion.entity && (
                    <>
                      <Text weight={600}>Entity:</Text>
                      <Text>{duplicatesModal.similarQuestion.entity}</Text>
                    </>
                  )}
                  <Text weight={600}>Answer:</Text>
                  <Text>{duplicatesModal.similarQuestion.answer_key}</Text>
                </Stack>
              </Paper>
            </Stack>
          ) : (
            <Stack spacing="md">
              {duplicatesModal.duplicates.map((dup, idx) => (
                <Paper key={idx} p="md" withBorder>
                  <Stack spacing="sm">
                    <Text weight={600}>Duplicate Question:</Text>
                    <Text>{dup.question}</Text>
                    <Text weight={600}>Similar to:</Text>
                    <Text>{dup.similar_to.question}</Text>
                    <Text weight={600}>Answer:</Text>
                    <Text>{dup.similar_to.answer_key}</Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Modal>

        <Modal
          opened={searchResultsModal.opened}
          onClose={() => setSearchResultsModal({ ...searchResultsModal, opened: false })}
          title="Search Results"
          size="lg"
        >
          {searchResultsModal.results && (
            <Stack spacing="md">
              {searchResultsModal.results.length === 0 ? (
                <Text c="dimmed" ta="center">No results found</Text>
              ) : (
                searchResultsModal.results.map((result, index) => (
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
                        <Text>{result.answer_key}</Text>
                      </Stack>
                      {result.created_at && (
                        <Text size="sm" c="dimmed">
                          Added {new Date(result.created_at).toLocaleDateString()}
                        </Text>
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

export default MainView 