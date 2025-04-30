import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, Loader, ScrollArea, TextInput, Group, Pagination, ActionIcon, Select, Box, Badge, Modal, Tooltip } from '@mantine/core'
import { IconSearch, IconArrowUp, IconArrowDown, IconInfoCircle } from '@tabler/icons-react'

function DatabaseView({ onBack }) {
  const [questions, setQuestions] = useState([])
  const [filteredQuestions, setFilteredQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntity, setSelectedEntity] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [searchResultsModal, setSearchResultsModal] = useState({
    opened: false,
    results: null
  })

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
      setError(error.message || 'Failed to search questions. Please try again.')
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
          <Stack spacing={4}>
            <Title order={1} size={32}>Knowledge Base</Title>
            <Text c="dimmed" size="lg">View and search through your knowledge base entries</Text>
          </Stack>
        </Group>

        <Paper p={40} radius="lg" withBorder mb={40}>
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
                    ...Array.from(new Set(questions.map(q => q.entity)))
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

        {isLoading ? (
          <Paper p={40} radius="lg" withBorder>
            <Stack align="center" spacing={40}>
              <Loader size="lg" />
              <Text size="sm" c="dimmed">Loading questions...</Text>
            </Stack>
          </Paper>
        ) : error ? (
          <Paper p={40} radius="lg" withBorder>
            <Stack align="center" spacing={40}>
              <Text c="red" size="lg">{error}</Text>
              <Button variant="light" color="red" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper p={40} radius="lg" withBorder>
            <Stack spacing={40}>
              <Group position="apart" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Title order={2} size={24}>Knowledge Base</Title>
                <Group spacing="xs" style={{ marginLeft: 'auto' }}>
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
              <Text size="sm" c="dimmed">
                Showing {paginatedQuestions.length} of {sortedQuestions.length} questions
              </Text>

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

export default DatabaseView 