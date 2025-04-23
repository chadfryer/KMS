/**
 * Main application component for the Questionnaire Management System.
 * 
 * This application provides a user interface for:
 * - Adding new question-answer pairs
 * - Uploading and processing CSV files
 * - Searching the knowledge base
 * - Viewing the database contents
 */

import React, { useState, useEffect } from 'react'
import { MantineProvider, Container, Title, Paper, Textarea, Button, Stack, Text, Group, FileInput, TextInput, Loader, Modal, Select } from '@mantine/core'
import { IconUpload, IconSearch, IconDatabase, IconArrowLeft } from '@tabler/icons-react'
import DatabaseView from './DatabaseView'

// Theme configuration for the application
const theme = {
  colors: {
    juniper: ['#67D7A4', '#67D7A4', '#67D7A4', '#67D7A4', '#67D7A4', '#67D7A4', '#67D7A4', '#67D7A4', '#67D7A4', '#67D7A4'],
    spearmint: ['#AAFFD8', '#AAFFD8', '#AAFFD8', '#AAFFD8', '#AAFFD8', '#AAFFD8', '#AAFFD8', '#AAFFD8', '#AAFFD8', '#AAFFD8'],
    basil: ['#008363', '#008363', '#008363', '#008363', '#008363', '#008363', '#008363', '#008363', '#008363', '#008363'],
    fir: ['#045944', '#045944', '#045944', '#045944', '#045944', '#045944', '#045944', '#045944', '#045944', '#045944'],
    charcoal: ['#2D2D2D', '#2D2D2D', '#2D2D2D', '#2D2D2D', '#2D2D2D', '#2D2D2D', '#2D2D2D', '#2D2D2D', '#2D2D2D', '#2D2D2D']
  },
  primaryColor: 'juniper',
  fontFamily: 'Averta Standard, sans-serif',
  components: {
    Button: {
      defaultProps: {
        color: 'juniper',
        radius: 'md'
      }
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
        shadow: 'sm',
        withBorder: true
      }
    },
    Title: {
      styles: (theme) => ({
        root: {
          fontWeight: 600
        }
      })
    }
  }
}

/**
 * MainView component provides the primary interface for interacting with the system.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onViewDatabase - Callback function to view the database
 */
function MainView({ onViewDatabase }) {
  // State management for form inputs and file uploads
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswerKey, setNewAnswerKey] = useState('')
  const [newEntity, setNewEntity] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [questionnaireFile, setQuestionnaireFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState('')
  const [questionnaires, setQuestionnaires] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [processStatus, setProcessStatus] = useState(null)  // New state for process questionnaire status

  // Modal state management
  const [duplicatesModal, setDuplicatesModal] = useState({
    opened: false,
    title: '',
    duplicates: [],
    similarQuestion: null
  })
  const [processingResultsModal, setProcessingResultsModal] = useState({
    opened: false,
    results: null
  })
  const [searchResultsModal, setSearchResultsModal] = useState({
    opened: false,
    results: null
  })

  // Fetch questionnaires on component mount
  useEffect(() => {
    const fetchQuestionnaires = async () => {
      try {
        const response = await fetch('http://localhost:8000/questions')
        if (!response.ok) {
          throw new Error('Failed to fetch questionnaires')
        }
        const data = await response.json()
        console.log('Raw questionnaires data:', data)
        console.log('Questions array:', data.questions)
        if (data.questions && Array.isArray(data.questions)) {
          const entities = data.questions
            .map(q => q.entity)
            .filter(entity => entity && entity.trim() !== '')
          console.log('Extracted entities:', entities)
          console.log('Unique entities:', [...new Set(entities)])
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

      // Fetch updated questionnaires after successful upload
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

  /**
   * Handle questionnaire processing
   */
  const handleProcessQuestionnaire = async () => {
    if (!questionnaireFile) return

    setIsProcessing(true)
    setProcessingResults(null)
    setProcessStatus(null)  // Reset process status instead of upload status

    try {
      // Read the file content
      const fileContent = await questionnaireFile.text()
      const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line)
      
      if (lines.length === 0) {
        throw new Error('CSV file is empty')
      }

      // Get and normalize headers
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
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

      // Create new CSV content
      const newLines = [
        newHeaders.join(','),
        ...lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          while (values.length < newHeaders.length) {
            values.push('')
          }
          return values.join(',')
        })
      ]
      
      // Create new file with modified content
      const newContent = newLines.join('\n')
      const newFile = new File([newContent], questionnaireFile.name, {
        type: 'text/csv'
      })

      const formData = new FormData()
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
        setProcessStatus({  // Use process status instead of upload status
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
      setProcessStatus({  // Use process status instead of upload status
        type: 'error',
        message: error.message || 'Failed to process questionnaire. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Container size="md" py={40}>
      <Stack spacing={40}>
        <div style={{ 
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{ 
            position: 'absolute',
            right: '-200px',
            top: 0
          }}>
            <Button
              onClick={onViewDatabase}
              variant="filled"
              leftSection={<IconDatabase size={20} />}
              style={{
                backgroundColor: '#008363',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: '0 4px 6px rgba(0, 131, 99, 0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  backgroundColor: '#045944',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 8px rgba(0, 131, 99, 0.15)'
                }
              }}
            >
              Knowledge Base
            </Button>
          </div>
          <Title 
            order={1}
            size="42px"
            c="spearmint"
            mb="xs"
            style={{ textAlign: 'center', width: '100%' }}
          >
            Knowledge Management
          </Title>
          <Text c="juniper" size="lg" style={{ textAlign: 'center', width: '100%' }}>
            Bringing the knowledge since 2025
          </Text>
        </div>

        <Title 
          order={2}
          size="28px"
          c="#67D7A4"
          style={{ 
            textAlign: 'center',
            marginBottom: '20px',
            borderBottom: '2px solid #67D7A4',
            paddingBottom: '10px'
          }}
        >
          Sacrifice Data to the Knowledge Gods
        </Title>

        <Stack spacing="xl">
          <Stack spacing={100}>
            <Paper 
              p={40} 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#67D7A4',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                borderRadius: '12px'
              }}
            >
              <Title 
                order={3}
                size="24px"
                c="#045944"
                mb="lg"
              >
                Add New Question / Answer Key Pair
              </Title>
              <form onSubmit={handleSubmit}>
                <Stack spacing="lg">
                  <Textarea
                    label="Question"
                    description="Enter the question you want to add"
                    placeholder="e.g., Do you even encrypt, bro?"
                    required
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    minRows={3}
                    styles={{
                      label: { 
                        color: '#045944',
                        fontWeight: 600,
                        marginBottom: 4
                      },
                      description: {
                        color: '#008363'
                      },
                      input: { 
                        backgroundColor: '#FFFFFF',
                        color: '#045944',
                        borderColor: '#67D7A4',
                        '&:focus': {
                          borderColor: '#045944'
                        },
                        '&::placeholder': {
                          color: 'rgba(4, 89, 68, 0.5)'
                        }
                      }
                    }}
                  />
                  <Textarea
                    label="Answer"
                    description="Provide the correct answer"
                    placeholder="e.g., Do you, bro!"
                    required
                    value={newAnswerKey}
                    onChange={(e) => setNewAnswerKey(e.target.value)}
                    minRows={3}
                    styles={{
                      label: { 
                        color: '#045944',
                        fontWeight: 600,
                        marginBottom: 4
                      },
                      description: {
                        color: '#008363'
                      },
                      input: { 
                        backgroundColor: '#FFFFFF',
                        color: '#045944',
                        borderColor: '#67D7A4',
                        '&:focus': {
                          borderColor: '#045944'
                        },
                        '&::placeholder': {
                          color: 'rgba(4, 89, 68, 0.5)'
                        }
                      }
                    }}
                  />
                  <TextInput
                    label="Entity"
                    description="The system or entity this question relates to"
                    placeholder="e.g., Mindbody, ClassPass, etc."
                    required
                    value={newEntity}
                    onChange={(e) => setNewEntity(e.target.value)}
                    styles={{
                      label: { 
                        color: '#045944',
                        fontWeight: 600,
                        marginBottom: 4
                      },
                      description: {
                        color: '#008363'
                      },
                      input: { 
                        backgroundColor: '#FFFFFF',
                        color: '#045944',
                        borderColor: '#67D7A4',
                        '&:focus': {
                          borderColor: '#045944'
                        }
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    style={{
                      backgroundColor: '#008363',
                      boxShadow: '0 4px 6px rgba(0, 131, 99, 0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        backgroundColor: '#045944',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 8px rgba(0, 131, 99, 0.15)'
                      }
                    }}
                  >
                    Submit
                  </Button>
                </Stack>
              </form>
            </Paper>

            <Paper 
              p={40} 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#67D7A4',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                marginTop: '40px'
              }}
            >
              <Title 
                order={3}
                size="24px"
                c="#045944"
                mb="lg"
              >
                Upload Updated Questionnaires
              </Title>
              <Stack spacing="lg">
                <FileInput
                  label="Select CSV File"
                  description="Upload a CSV file exported from Excel with 'question' and 'answer_key' columns"
                  placeholder="Click to select file"
                  accept=".csv"
                  value={selectedFile}
                  onChange={setSelectedFile}
                  multiple={false}
                  icon={<IconUpload size={20} />}
                  styles={{
                    label: { 
                      color: '#045944',
                      fontWeight: 600,
                      marginBottom: 4
                    },
                    description: {
                      color: '#008363'
                    },
                    input: { 
                      backgroundColor: '#FFFFFF',
                      color: '#045944',
                      borderColor: '#67D7A4',
                      '&:focus': {
                        borderColor: '#045944'
                      }
                    }
                  }}
                />
                {selectedFile && (
        <Stack spacing="md">
                    <Group>
                      <Button
                        onClick={() => handleFileUpload(selectedFile)}
                        loading={isUploading}
                        leftSection={<IconUpload size={20} />}
                        style={{
                          backgroundColor: '#008363',
                          boxShadow: '0 4px 6px rgba(0, 131, 99, 0.1)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            backgroundColor: '#045944',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 8px rgba(0, 131, 99, 0.15)'
                          }
                        }}
                      >
                        Upload File
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedFile(null)}
                        style={{
                          borderColor: '#67D7A4',
                          color: '#045944'
                        }}
                      >
                        Clear Selection
                      </Button>
                    </Group>
                    <Paper p="md" style={{ backgroundColor: '#F8F9FA' }}>
                      <Stack spacing="xs">
                        <Text size="sm" weight={600} c="#045944">Selected File:</Text>
                        <Text size="sm" c="#008363">
                          {selectedFile.name}
                        </Text>
                      </Stack>
                    </Paper>
                  </Stack>
                )}
                {uploadStatus && (
                  <Stack spacing="xs">
                    <Text
                      color={uploadStatus.type === 'success' ? 'green' : 'red'}
                      size="sm"
                    >
                      {uploadStatus.message}
                    </Text>
                    {uploadStatus.results && (
                      <Stack spacing="xs">
                        {uploadStatus.results.map((result, index) => (
                          <Text
                            key={index}
                            color={result.status === 'success' ? 'green' : 'red'}
                            size="sm"
                          >
                            {result.file}: {result.message}
                          </Text>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                )}
                <Stack spacing={4}>
                  <Text size="sm" color="dimmed">
                    Tips for Excel CSV files:
                  </Text>
                  <Text size="sm" color="dimmed" component="div">
                    <ul style={{ margin: '8px 0', paddingLeft: 16 }}>
                      <li>Save your Excel file as "CSV UTF-8" or "CSV (Comma delimited)"</li>
                      <li>Make sure your columns are named "question" and "answer_key"</li>
                      <li>Remove any special characters or formatting from Excel</li>
                    </ul>
                  </Text>
                </Stack>
              </Stack>
            </Paper>
          </Stack>

          <Title 
            order={2}
            size="28px"
            c="#67D7A4"
            style={{ 
              textAlign: 'center',
              margin: '40px 0 20px',
              borderBottom: '2px solid #67D7A4',
              paddingBottom: '10px'
            }}
          >
            Consume the Knowledge of the Gods
          </Title>

          <Stack spacing={100}>
            <Paper 
              p={40} 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#67D7A4',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                borderRadius: '12px'
              }}
            >
              <Title 
                order={3}
                size="24px"
                c="#045944"
                mb="sm"
              >
                Search Questions
              </Title>
              <Text size="sm" c="#008363" mb="lg">
                Search the knowledge base for questions and answers
              </Text>
              
              <form onSubmit={handleSearch}>
                <Stack spacing="md">
                  <TextInput
                    label="Search Query"
                    description="Enter keywords to search questions, answers, or comments"
                    placeholder="e.g., encryption, password, security"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<IconSearch size={16} />}
                    styles={{
                      label: { 
                        color: '#045944',
                        fontWeight: 600,
                        marginBottom: 4
                      },
                      description: {
                        color: '#008363'
                      },
                      input: { 
                        backgroundColor: '#FFFFFF',
                        color: '#045944',
                        borderColor: '#67D7A4',
                        '&:focus': {
                          borderColor: '#045944'
                        }
                      }
                    }}
                  />
                  <Select
                    label="Filter by Entity"
                    description="Select an entity to filter search results"
                    placeholder="All entities"
                    data={[
                      { value: '', label: 'All entities' },
                      ...questionnaires
                        .filter(q => q.entity && q.entity.trim() !== '')
                        .map(q => q.entity)
                        .filter((entity, index, self) => self.indexOf(entity) === index)
                        .map(entity => ({
                          value: entity,
                          label: entity
                        }))
                    ]}
                    value={selectedEntity}
                    onChange={setSelectedEntity}
                    styles={{
                      label: { 
                        color: '#045944',
                        fontWeight: 600,
                        marginBottom: 4
                      },
                      description: {
                        color: '#008363'
                      },
                      input: { 
                        backgroundColor: '#FFFFFF',
                        color: '#045944',
                        borderColor: '#67D7A4',
                        '&:focus': {
                          borderColor: '#045944'
                        }
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    loading={isSearching}
                    style={{
                      backgroundColor: '#008363',
                      boxShadow: '0 4px 6px rgba(0, 131, 99, 0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        backgroundColor: '#045944',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 8px rgba(0, 131, 99, 0.15)'
                      }
                    }}
                  >
                    Search
                  </Button>
                </Stack>
              </form>
            </Paper>

            <Paper 
              p={40} 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderColor: '#67D7A4',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                marginTop: '40px'
              }}
            >
              <Title 
                order={3}
                size="24px"
                c="#045944"
                mb="lg"
              >
                Process Questionnaire
              </Title>
              <Stack spacing="lg">
                <Text size="sm" color="dimmed">
                  Upload a CSV file with questions only. The system will find matching answers from the knowledge base.
                </Text>
                <FileInput
                  label="Select Questionnaire CSV"
                  description="Upload a CSV file with questions (no answers needed)"
                  placeholder="Click to select file"
                  accept=".csv"
                  value={questionnaireFile}
                  onChange={setQuestionnaireFile}
                  icon={<IconUpload size={20} />}
                  styles={{
                    label: { 
                      color: '#045944',
                      fontWeight: 600,
                      marginBottom: 4
                    },
                    description: {
                      color: '#008363'
                    },
                    input: { 
                      backgroundColor: '#FFFFFF',
                      color: '#045944',
                      borderColor: '#67D7A4',
                      '&:focus': {
                        borderColor: '#045944'
                      }
                    }
                  }}
                />
                <Select
                  label="Filter by Entity"
                  description="Select an entity to filter potential matches"
                  placeholder="All entities"
                  data={[
                    { value: '', label: 'All entities' },
                    ...questionnaires
                      .filter(q => q.entity && q.entity.trim() !== '')
                      .map(q => q.entity)
                      .filter((entity, index, self) => self.indexOf(entity) === index)
                      .map(entity => ({
                        value: entity,
                        label: entity
                      }))
                  ]}
                  value={selectedEntity}
                  onChange={setSelectedEntity}
                  styles={{
                    label: { 
                      color: '#045944',
                      fontWeight: 600,
                      marginBottom: 4
                    },
                    description: {
                      color: '#008363'
                    },
                    input: { 
                      backgroundColor: '#FFFFFF',
                      color: '#045944',
                      borderColor: '#67D7A4',
                      '&:focus': {
                        borderColor: '#045944'
                      }
                    }
                  }}
                />
                {questionnaireFile && (
                  <Group>
                    <Button
                      onClick={handleProcessQuestionnaire}
                      loading={isProcessing}
                      leftSection={<IconUpload size={20} />}
                      style={{
                        backgroundColor: '#008363',
                        boxShadow: '0 4px 6px rgba(0, 131, 99, 0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          backgroundColor: '#045944',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 8px rgba(0, 131, 99, 0.15)'
                        }
                      }}
                    >
                      Process Questionnaire
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setQuestionnaireFile(null)}
                      style={{
                        borderColor: '#67D7A4',
                        color: '#045944'
                      }}
                    >
                      Clear Selection
                    </Button>
                  </Group>
                )}
                {processStatus && (  // Show process status instead of upload status
                  <Text
                    color={processStatus.type === 'success' ? 'green' : 'red'}
                    size="sm"
                  >
                    {processStatus.message}
                  </Text>
                )}
              </Stack>
            </Paper>
          </Stack>
        </Stack>

        {/* Duplicates Modal */}
        <Modal
          opened={duplicatesModal.opened}
          onClose={() => setDuplicatesModal({ ...duplicatesModal, opened: false })}
          title={duplicatesModal.title}
          size="lg"
          styles={{
            title: {
              color: '#045944',
              fontWeight: 600,
              fontSize: '1.2rem'
            },
            header: {
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #67D7A4'
            },
            body: {
              backgroundColor: '#FFFFFF'
            }
          }}
        >
          {duplicatesModal.similarQuestion ? (
            <Stack spacing="md">
              <Text weight={600} c="#045944">Similar Question Found:</Text>
              <Text c="#008363">{duplicatesModal.similarQuestion.question}</Text>
              {duplicatesModal.similarQuestion.entity && (
                <>
                  <Text weight={600} c="#045944">Entity:</Text>
                  <Text c="#008363">{duplicatesModal.similarQuestion.entity}</Text>
                </>
              )}
              <Text weight={600} c="#045944">Answer:</Text>
              <Text c="#008363">{duplicatesModal.similarQuestion.answer_key}</Text>
              {duplicatesModal.similarQuestion.comment && (
                <>
                  <Text weight={600} c="#045944">Comment:</Text>
                  <Text c="#008363">{duplicatesModal.similarQuestion.comment}</Text>
                </>
              )}
            </Stack>
          ) : (
            <Stack spacing="md">
              {duplicatesModal.duplicates.map((dup, idx) => (
                <Paper key={idx} p="md" style={{ 
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid #ff0000'
                }}>
                  <Stack spacing="xs">
                    <Text weight={600} c="#045944">Duplicate Question:</Text>
                    <Text c="#008363">{dup.question}</Text>
                    <Text weight={600} c="#045944">Similar to:</Text>
                    <Text c="#008363">{dup.similar_to.question}</Text>
                    {dup.similar_to.entity && (
                      <>
                        <Text weight={600} c="#045944">Entity:</Text>
                        <Text c="#008363">{dup.similar_to.entity}</Text>
                      </>
                    )}
                    <Text weight={600} c="#045944">Existing Answer:</Text>
                    <Text c="#008363">{dup.similar_to.answer_key}</Text>
                    {dup.similar_to.comment && (
                      <>
                        <Text weight={600} c="#045944">Comment:</Text>
                        <Text c="#008363">{dup.similar_to.comment}</Text>
                      </>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Modal>

        {/* Processing Results Modal */}
        <Modal
          opened={processingResultsModal.opened}
          onClose={() => setProcessingResultsModal({ ...processingResultsModal, opened: false })}
          title="Processing Results"
          size="lg"
          styles={{
            title: {
              color: '#045944',
              fontWeight: 600,
              fontSize: '1.2rem'
            },
            header: {
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #67D7A4'
            },
            body: {
              backgroundColor: '#FFFFFF'
            }
          }}
        >
          {processingResultsModal.results && (
            <Stack spacing="md">
              {processingResultsModal.results.map((result, index) => (
                <Paper key={index} p="md" style={{ 
                  backgroundColor: 'rgba(103, 215, 164, 0.1)',
                  border: '1px solid #67D7A4'
                }}>
                  <Stack spacing="xs">
                    <Text weight={600} c="#045944">Question:</Text>
                    <Text c="#008363">{result.input_question}</Text>
                    {result.best_match ? (
                      <>
                        {result.best_match.entity && (
                          <>
                            <Text weight={600} c="#045944">Entity:</Text>
                            <Text c="#008363">{result.best_match.entity}</Text>
                          </>
                        )}
                        <Text weight={600} c="#045944">Matched Answer:</Text>
                        <Text c="#008363">{result.best_match.answer_key}</Text>
                        <Text size="sm" c="dimmed">Similarity: {(result.best_match.similarity * 100).toFixed(1)}%</Text>
                        {result.best_match.comment && (
                          <>
                            <Text weight={600} c="#045944">Comment:</Text>
                            <Text c="#008363">{result.best_match.comment}</Text>
                          </>
                        )}
                      </>
                    ) : (
                      <Text c="red">No matching answer found in knowledge base</Text>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Modal>

        {/* Search Results Modal */}
        <Modal
          opened={searchResultsModal.opened}
          onClose={() => setSearchResultsModal({ ...searchResultsModal, opened: false })}
          title="Search Results"
          size="lg"
          styles={{
            title: {
              color: '#045944',
              fontWeight: 600,
              fontSize: '1.2rem'
            },
            header: {
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid #67D7A4'
            },
            body: {
              backgroundColor: '#FFFFFF'
            }
          }}
        >
          {searchResultsModal.results && (
            <Stack spacing="md">
              {searchResultsModal.results.length === 0 ? (
                <Text c="dimmed" style={{ textAlign: 'center' }}>
                  No results found for "{searchQuery}"
                </Text>
              ) : (
                searchResultsModal.results.map((result, index) => (
                  <Paper key={index} p="md" style={{ 
                    backgroundColor: 'rgba(103, 215, 164, 0.1)',
                    border: '2px solid #67D7A4',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 131, 99, 0.1)',
                    marginBottom: '16px'
                  }}>
                    <Stack spacing="xs">
                      <Text weight={600} c="#045944" size="lg">Question:</Text>
                      <Text c="#008363" size="md" style={{ paddingLeft: '8px' }}>{result.question}</Text>
                      <Text weight={600} c="#045944" size="lg">Answer:</Text>
                      <Text c="#008363" size="md" style={{ paddingLeft: '8px' }}>{result.answer_key}</Text>
                      <Text weight={600} c="#045944" size="lg">Entity:</Text>
                      <Text c="#008363" size="md" style={{ paddingLeft: '8px' }}>{result.entity || '-'}</Text>
                      {result.comment && (
                        <>
                          <Text weight={600} c="#045944" size="lg">Comment:</Text>
                          <Text c="#008363" size="md" style={{ paddingLeft: '8px' }}>{result.comment}</Text>
                        </>
                      )}
                      {result.created_at && (
                        <Text size="sm" c="dimmed" style={{ 
                          marginTop: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid #67D7A4'
                        }}>
                          Added: {new Date(result.created_at).toLocaleDateString()}
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

/**
 * Main App component that manages the application state and view switching.
 */
function App() {
  const [currentView, setCurrentView] = useState('main')

  return (
    <MantineProvider theme={theme}>
      <div style={{ 
        backgroundColor: '#2D2D2D', 
        minHeight: '100vh',
        backgroundImage: 'linear-gradient(180deg, rgba(4, 89, 68, 0.1) 0%, rgba(45, 45, 45, 1) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        {currentView === 'main' ? (
          <MainView onViewDatabase={() => setCurrentView('database')} />
        ) : (
          <DatabaseView onBack={() => setCurrentView('main')} />
        )}
      </div>
    </MantineProvider>
  )
}

export default App
