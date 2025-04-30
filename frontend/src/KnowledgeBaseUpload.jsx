import React, { useState } from 'react'
import { Container, Title, Paper, Stack, Text, Button, FileInput, Group, Alert, Box, Badge, Progress, Tooltip, Textarea, TextInput } from '@mantine/core'
import { IconUpload, IconInfoCircle } from '@tabler/icons-react'

function KnowledgeBaseUpload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswerKey, setNewAnswerKey] = useState('')
  const [newEntity, setNewEntity] = useState('')
  const [duplicatesModal, setDuplicatesModal] = useState({
    opened: false,
    title: '',
    duplicates: [],
    similarQuestion: null
  })

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

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('http://localhost:8000/upload-csv', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to upload file')
      }

      const data = await response.json()
      console.log('Upload completed:', data)
      
      if (data.results) {
        setUploadStatus({
          type: 'success',
          message: data.message,
          results: data.results
        })
        setSelectedFile(null)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to upload file. Please try again.'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Container size="xl" py={40}>
      <Stack spacing={40}>
        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Upload Knowledge</Title>
            <Text c="dimmed" size="lg">Upload and manage your knowledge base entries.</Text>
          </Stack>
        </Group>

        <Paper p={40} radius="lg" withBorder mb={40}>
          <Stack spacing="xl">
            <Group position="apart">
              <Title order={2} size={24}>Upload Questions</Title>
              <Tooltip label="Bulk upload questions and answers using a CSV file" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <Stack spacing={16}>
              <FileInput
                label={<Text c="#FFFFFF" fw={700}>Select CSV File</Text>}
                description={<Text c="dimmed" size="sm" component="span">Upload a CSV file containing questions and answers (columns: question, answer_key, entity).</Text>}
                placeholder="Click to select file"
                accept=".csv"
                value={selectedFile}
                onChange={setSelectedFile}
                icon={<IconUpload size={20} />}
              />
              {selectedFile && (
                <Group>
                  <Button
                    onClick={handleFileUpload}
                    loading={isUploading}
                    leftSection={<IconUpload size={20} />}
                  >
                    Upload File
                  </Button>
                  <Button
                    variant="light"
                    onClick={() => setSelectedFile(null)}
                  >
                    Clear
                  </Button>
                </Group>
              )}
              {isUploading && (
                <Paper p="md" withBorder>
                  <Stack spacing={8}>
                    <Group position="apart">
                      <Text size="sm" fw={500}>Uploading {selectedFile?.name}</Text>
                      <Badge color="blue">Processing</Badge>
                    </Group>
                    <Box py={6}>
                      <Progress
                        value={100}
                        size="xl"
                        radius="xl"
                        color="blue"
                        animated
                        striped
                      />
                    </Box>
                    <Text size="xs" c="dimmed">
                      Processing file, please wait...
                    </Text>
                  </Stack>
                </Paper>
              )}
              {uploadStatus && !isUploading && (
                <Alert 
                  color={uploadStatus.type === 'success' ? 'green' : 'red'}
                  styles={(theme) => ({
                    root: {
                      backgroundColor: uploadStatus.type === 'success' ? theme.colors.green[5] : undefined,
                    },
                    message: {
                      color: uploadStatus.type === 'success' ? 'white' : undefined,
                      fontWeight: 700
                    }
                  })}
                >
                  <Stack spacing={8}>
                    <Text>{uploadStatus.message}</Text>
                  </Stack>
                </Alert>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Paper p={40} radius="lg" withBorder>
          <Stack spacing="xl">
            <Group position="apart">
              <Title order={2} size={24}>Add New Question</Title>
              <Tooltip label="Add individual questions and answers to the knowledge base" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <form onSubmit={handleSubmit}>
              <Stack spacing={16}>
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
                <Group position="right" mt={16}>
                  <Button type="submit" size="md">Add Question</Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}

export default KnowledgeBaseUpload 