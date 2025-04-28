import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, Loader, ScrollArea, TextInput, Group, Pagination, ActionIcon, Select, Box, Badge } from '@mantine/core'
import { IconSearch, IconArrowUp, IconArrowDown } from '@tabler/icons-react'

function DatabaseView({ onBack }) {
  const [questions, setQuestions] = useState([])
  const [filteredQuestions, setFilteredQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('http://localhost:8000/questions')
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch questions')
        }
        
        if (Array.isArray(data)) {
          setQuestions(data)
          setFilteredQuestions(data)
        } else if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions)
          setFilteredQuestions(data.questions)
        } else {
          setQuestions([])
          setFilteredQuestions([])
        }
        setError(null)
      } catch (err) {
        console.error('Error fetching questions:', err)
        setError(err.message || 'Failed to load questions. Please try again.')
        setQuestions([])
        setFilteredQuestions([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim() && !selectedEntity) return

    setIsSearching(true)
    setError(null)

    try {
      let filtered = [...questions]

      // Filter by search query
      if (searchQuery.trim()) {
        filtered = filtered.filter(q => 
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.answer_key.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Filter by entity
      if (selectedEntity) {
        filtered = filtered.filter(q => q.entity === selectedEntity)
      }

      setFilteredQuestions(filtered)
      setCurrentPage(1) // Reset to first page when filtering
    } catch (error) {
      console.error('Error filtering questions:', error)
      setError(error.message || 'Failed to filter questions. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedQuestions = React.useMemo(() => {
    const sortableItems = [...filteredQuestions]
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [filteredQuestions, sortConfig])

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

  const totalPages = Math.ceil(sortedQuestions.length / itemsPerPage)
  const paginatedQuestions = sortedQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <Container size="xl" py={40}>
      <Stack spacing={40}>
        <Group position="apart" align="center">
          <Title order={1} size={32}>Knowledge Base</Title>
          <Badge size="lg" variant="light" color="red" styles={{ root: { backgroundColor: '#CC0000', color: '#FFFFFF' } }}>
            {questions.length} Questions
          </Badge>
        </Group>

        <Paper p="xl" radius="lg" withBorder>
          <Stack spacing="lg">
            <form onSubmit={handleSearch}>
              <Stack spacing="md">
                <TextInput
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<IconSearch size={18} />}
                  size="md"
                />
                
                <Select
                  placeholder="Filter by entity"
                  value={selectedEntity}
                  onChange={setSelectedEntity}
                  data={[
                    { value: '', label: 'All entities' },
                    ...Array.from(new Set(questions.map(q => q.entity)))
                      .filter(Boolean)
                      .map(entity => ({
                        value: entity,
                        label: entity
                      }))
                  ]}
                  clearable
                  size="md"
                  styles={{
                    input: {
                      color: '#333333'
                    },
                    item: {
                      color: '#333333'
                    }
                  }}
                />

                <Group position="right">
                  <Button 
                    variant="subtle" 
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedEntity('')
                      setFilteredQuestions(questions)
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button 
                    type="submit" 
                    loading={isSearching}
                  >
                    Search
                  </Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Paper>

        {isLoading ? (
          <Paper p="xl" radius="lg" withBorder>
            <Stack align="center" spacing="md" py={40}>
              <Loader size="lg" />
              <Text size="sm" c="dimmed">Loading questions...</Text>
            </Stack>
          </Paper>
        ) : error ? (
          <Paper p="xl" radius="lg" withBorder>
            <Stack align="center" spacing="md" py={40}>
              <Text c="red" size="lg">{error}</Text>
              <Button variant="light" color="red" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper p="xl" radius="lg" withBorder>
            <Stack spacing="xl">
              <Group position="apart">
                <Text size="sm" c="dimmed">
                  Showing {paginatedQuestions.length} of {sortedQuestions.length} questions
                </Text>
                <Group>
                  <Button 
                    variant="subtle"
                    size="md"
                    styles={{
                      label: {
                        fontWeight: 600
                      }
                    }}
                    onClick={() => {
                      const filtered = questions.filter(q => q.entity === 'Mindbody')
                      setFilteredQuestions(filtered)
                      setCurrentPage(1)
                    }}
                  >
                    Show Mindbody
                  </Button>
                  <Button 
                    variant="subtle"
                    size="md"
                    styles={{
                      label: {
                        fontWeight: 600
                      }
                    }}
                    onClick={() => {
                      const filtered = questions.filter(q => q.entity === 'ClassPass')
                      setFilteredQuestions(filtered)
                      setCurrentPage(1)
                    }}
                  >
                    Show ClassPass
                  </Button>
                  <Button 
                    variant="subtle"
                    size="md"
                    styles={{
                      label: {
                        fontWeight: 600
                      }
                    }}
                    onClick={() => {
                      setFilteredQuestions(questions)
                      setCurrentPage(1)
                    }}
                  >
                    Show All
                  </Button>
                </Group>
              </Group>

              {paginatedQuestions.map((question, index) => (
                <Paper
                  key={question.id || index}
                  p="lg"
                  radius="md"
                  withBorder
                  style={{
                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa'
                  }}
                >
                  <Stack spacing="md">
                    <Group position="apart" align="flex-start">
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" weight={500} c="dimmed" mb={4}>
                          Question
                        </Text>
                        <Text size="md" c="#333333">{question.question}</Text>
                      </Box>
                      <Box style={{ flex: 1 }}>
                        <Text size="sm" weight={500} c="dimmed" mb={4}>
                          Answer
                        </Text>
                        <Text size="md" c="#333333">{question.answer_key}</Text>
                      </Box>
                    </Group>
                    
                    <Group position="apart" align="center">
                      <Stack spacing={4}>
                        {question.entity && (
                          <>
                            <Text size="sm" weight={500} c="dimmed" mb={4}>
                              Entity
                            </Text>
                            <Badge size="lg" variant="dot">
                              {question.entity}
                            </Badge>
                          </>
                        )}
                        {question.created_at && (
                          <Text size="sm" c="dimmed">
                            Added {formatDate(question.created_at)}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  </Stack>
                </Paper>
              ))}

              {totalPages > 1 && (
                <Group position="apart" pt="lg">
                  <Text size="sm" c="dimmed">
                    Showing {paginatedQuestions.length} of {sortedQuestions.length} questions
                  </Text>
                  <Pagination
                    value={currentPage}
                    onChange={setCurrentPage}
                    total={totalPages}
                    size="md"
                    radius="md"
                    withEdges
                  />
                </Group>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  )
}

export default DatabaseView 