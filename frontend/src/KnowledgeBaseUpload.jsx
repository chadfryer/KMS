import React, { useState } from 'react'
import { Container, Title, Paper, Stack, Text, Button, FileInput, Group, Alert, Box, Badge, Progress, Tooltip, Textarea, TextInput } from '@mantine/core'
import { IconUpload, IconInfoCircle, IconX } from '@tabler/icons-react'

function KnowledgeBaseUpload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswerKey, setNewAnswerKey] = useState('')
  const [newEntity, setNewEntity] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [uploadStats, setUploadStats] = useState({
    totalQuestions: 0,
    duplicatesFound: 0,
    newQuestionsKept: 0,
    existingQuestionsKept: 0
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
        setSimilarQuestions([{
          new_question: newQuestion,
          new_answer: newAnswerKey,
          new_entity: newEntity,
          similar_to: data.similar_question,
          similarity: data.similarity
        }])
        setCurrentIndex(0)
        setShowPopup(true)
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
    
    // Reset stats for new upload
    setUploadStats({
      totalQuestions: 0,
      duplicatesFound: 0,
      newQuestionsKept: 0,
      existingQuestionsKept: 0
    })

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
      
      if (data.results && data.results[0].similar_questions?.length > 0) {
        // Update stats with initial upload data
        setUploadStats(prev => ({
          ...prev,
          totalQuestions: data.total_questions || 0,
          duplicatesFound: data.results[0].similar_questions.length
        }))
        setSimilarQuestions(data.results[0].similar_questions)
        setCurrentIndex(0)
        setShowPopup(true)
      } else {
        setUploadStatus({
          type: 'success',
          message: `Upload completed successfully!\n
• Total questions processed: ${data.total_questions || 0}
• Similar questions found: 0
• Unique questions added: ${data.total_questions || 0}`
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

  const handleResolveSimilar = async (keepNew) => {
    const currentQuestion = similarQuestions[currentIndex]
    
    try {
      const formData = new FormData()
      formData.append('question', keepNew ? currentQuestion.new_question : currentQuestion.similar_to.question)
      formData.append('answer_key', keepNew ? currentQuestion.new_answer : currentQuestion.similar_to.answer_key)
      formData.append('entity', keepNew ? currentQuestion.new_entity : currentQuestion.similar_to.entity)
      
      if (!keepNew) {
        formData.append('replace_id', currentQuestion.similar_to.id)
      }

      const response = await fetch('http://localhost:8000/resolve-similar', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to resolve similar question')
      }

      // Update stats based on choice
      setUploadStats(prev => ({
        ...prev,
        newQuestionsKept: prev.newQuestionsKept + (keepNew ? 1 : 0),
        existingQuestionsKept: prev.existingQuestionsKept + (keepNew ? 0 : 1)
      }))

      // Move to next question or close popup
      if (currentIndex < similarQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setShowPopup(false)
        setSimilarQuestions([])
        setCurrentIndex(0)
        const totalProcessed = uploadStats.totalQuestions;
        const duplicatesFound = uploadStats.duplicatesFound;
        const newKept = uploadStats.newQuestionsKept + (keepNew ? 1 : 0);
        const existingKept = uploadStats.existingQuestionsKept + (keepNew ? 0 : 1);
        const uniqueAdded = newKept; // Only count new questions that were kept
        
        setUploadStatus({
          type: 'success',
          message: `Upload completed successfully!\n
• Total questions processed: ${totalProcessed}
• Similar questions found: ${duplicatesFound}
• New questions kept: ${newKept}
• Existing questions kept: ${existingKept}
• Unique questions added: ${uniqueAdded}`
        });
        
        // Reset stats for next upload
        setUploadStats({
          totalQuestions: 0,
          duplicatesFound: 0,
          newQuestionsKept: 0,
          existingQuestionsKept: 0
        })
      }
    } catch (error) {
      console.error('Error resolving similar question:', error)
      setUploadStatus({
        type: 'error',
        message: 'Failed to resolve similar question. Please try again.'
      })
    }
  }

  const handleClosePopup = async () => {
    // If there are unresolved questions, resolve them by keeping existing ones
    if (similarQuestions.length > 0) {
      try {
        // Process all remaining questions from current index
        for (let i = currentIndex; i < similarQuestions.length; i++) {
          const currentQuestion = similarQuestions[i];
          const formData = new FormData();
          formData.append('question', currentQuestion.similar_to.question);
          formData.append('answer_key', currentQuestion.similar_to.answer_key);
          formData.append('entity', currentQuestion.similar_to.entity);
          formData.append('replace_id', currentQuestion.similar_to.id);

          const response = await fetch('http://localhost:8000/resolve-similar', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('Failed to resolve similar question');
          }

          // Update stats to reflect keeping existing
          setUploadStats(prev => ({
            ...prev,
            existingQuestionsKept: prev.existingQuestionsKept + 1
          }));
        }

        // Show final status message
        const totalProcessed = uploadStats.totalQuestions;
        const duplicatesFound = uploadStats.duplicatesFound;
        const newKept = uploadStats.newQuestionsKept;
        const existingKept = uploadStats.existingQuestionsKept + (similarQuestions.length - currentIndex);
        const uniqueAdded = newKept; // Only count new questions that were kept

        setUploadStatus({
          type: 'success',
          message: `Upload completed successfully!\n
• Total questions processed: ${totalProcessed}
• Similar questions found: ${duplicatesFound}
• New questions kept: ${newKept}
• Existing questions kept: ${existingKept}
• Unique questions added: ${uniqueAdded}
• ${similarQuestions.length - currentIndex} unresolved questions defaulted to keeping existing entries`
        });

      } catch (error) {
        console.error('Error resolving remaining questions:', error);
        setUploadStatus({
          type: 'warning',
          message: 'Some questions may not have been properly resolved. Please try uploading again.'
        });
      }
    }

    // Reset all states
    setShowPopup(false);
    setSimilarQuestions([]);
    setCurrentIndex(0);
    setUploadStats({
      totalQuestions: 0,
      duplicatesFound: 0,
      newQuestionsKept: 0,
      existingQuestionsKept: 0
    });
  }

  return (
    <Container size="xl" py={40}>
      <Stack>
        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Upload Knowledge</Title>
            <Text c="dimmed" size="lg">Upload and manage your knowledge base entries.</Text>
          </Stack>
        </Group>

        <Paper p="xl" radius="lg" withBorder>
          <Stack>
            <Group position="apart">
              <Title order={2} size={24}>Upload Questions</Title>
              <Tooltip label="Bulk upload questions and answers using a CSV file" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <Stack>
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
            </Stack>
          </Stack>
        </Paper>

        <Paper p="xl" radius="lg" withBorder>
          <Stack>
            <Group position="apart">
              <Title order={2} size={24}>Add New Question</Title>
              <Tooltip label="Add individual questions and answers to the knowledge base" position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <form onSubmit={handleSubmit}>
              <Stack>
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

        {uploadStatus && (
          <Alert 
            color={uploadStatus.type === 'success' ? 'green' : 'red'} 
            title={uploadStatus.type === 'success' ? 'Success' : 'Error'}
            withCloseButton
            onClose={() => setUploadStatus(null)}
            styles={(theme) => ({
              root: {
                backgroundColor: uploadStatus.type === 'success' ? '#22c55e' : theme.colors.red[6]
              },
              title: {
                color: uploadStatus.type === 'success' ? '#ffffff' : undefined
              },
              message: {
                color: uploadStatus.type === 'success' ? '#ffffff' : undefined,
                whiteSpace: 'pre-line'
              },
              closeButton: {
                color: uploadStatus.type === 'success' ? '#ffffff' : undefined,
                '&:hover': {
                  backgroundColor: uploadStatus.type === 'success' ? 'rgba(255, 255, 255, 0.1)' : undefined
                }
              }
            })}
          >
            {uploadStatus.message}
          </Alert>
        )}

        {showPopup && similarQuestions.length > 0 && (
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
              <Text size="lg" fw={700} c="#000000">Similar Questions Found</Text>
              <Button 
                variant="subtle" 
                color="dark" 
                onClick={handleClosePopup}
                leftSection={<IconX size={16} />}
              >
                Close
              </Button>
            </div>

            <Stack>
              <Text size="sm" c="dimmed">
                Question {currentIndex + 1} of {similarQuestions.length}
              </Text>
              
              <Paper p="md" withBorder>
                <Stack spacing="sm">
                  <Group position="apart">
                    <Text size="lg" fw={700}>New Question</Text>
                    <Badge color="blue">New Entry</Badge>
                  </Group>
                  <Text>{similarQuestions[currentIndex].new_question}</Text>
                  <Text size="lg" fw={700}>Answer</Text>
                  <Text>{similarQuestions[currentIndex].new_answer}</Text>
                  {similarQuestions[currentIndex].new_entity && (
                    <>
                      <Text size="lg" fw={700}>Entity</Text>
                      <Text>{similarQuestions[currentIndex].new_entity}</Text>
                    </>
                  )}
                </Stack>
              </Paper>

              <Paper p="md" withBorder>
                <Stack spacing="sm">
                  <Group position="apart">
                    <Text size="lg" fw={700}>Similar Existing Question</Text>
                    <Badge 
                      color={(() => {
                        const similarity = similarQuestions[currentIndex].similarity * 100;
                        if (similarity >= 90) return 'green';
                        if (similarity >= 80) return 'teal';
                        if (similarity >= 70) return 'lime';
                        if (similarity >= 60) return 'yellow';
                        if (similarity >= 50) return 'orange';
                        if (similarity >= 40) return 'red';
                        return 'red';
                      })()}
                      variant={(() => {
                        const similarity = similarQuestions[currentIndex].similarity * 100;
                        if (similarity >= 80) return 'filled';
                        if (similarity >= 50) return 'light';
                        return 'outline';
                      })()}
                    >
                      {Math.round(similarQuestions[currentIndex].similarity * 100)}% Similar
                    </Badge>
                  </Group>
                  <Text>{similarQuestions[currentIndex].similar_to.question}</Text>
                  <Text size="lg" fw={700}>Answer</Text>
                  <Text>{similarQuestions[currentIndex].similar_to.answer_key}</Text>
                  {similarQuestions[currentIndex].similar_to.entity && (
                    <>
                      <Text size="lg" fw={700}>Entity</Text>
                      <Text>{similarQuestions[currentIndex].similar_to.entity}</Text>
                    </>
                  )}
                </Stack>
              </Paper>

              <Group position="apart" mt="xl">
                <Button variant="light" onClick={() => handleResolveSimilar(false)}>
                  Keep Existing
                </Button>
                <Button onClick={() => handleResolveSimilar(true)}>
                  Keep New
                </Button>
              </Group>
            </Stack>
          </div>
        )}
      </Stack>
    </Container>
  )
}

export default KnowledgeBaseUpload