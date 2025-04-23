import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, Table, Loader, ScrollArea, TextInput, Group, Pagination, ActionIcon, Select } from '@mantine/core'
import { IconSearch, IconArrowLeft, IconArrowUp, IconArrowDown } from '@tabler/icons-react'

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
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)

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
      setFilteredQuestions(data.results)
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
    <Container size="md" py={40}>
      <Stack spacing={40}>
        <div style={{ 
          position: 'relative', 
          textAlign: 'center', 
          width: '100%',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Button
            onClick={onBack}
            variant="filled"
            leftSection={<IconArrowLeft size={20} />}
            style={{
              position: 'absolute',
              right: '-200px',
              top: 0,
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
            Back to Main
          </Button>
          <div style={{ width: '100%', textAlign: 'center' }}>
            <Title 
              order={1}
              size="42px"
              c="spearmint"
              mb="xs"
            >
              Knowledge Base
            </Title>
            <Text c="juniper" size="lg">
              {questions.length} question-answer pairs in the database
            </Text>
          </div>
        </div>

        <Paper 
          p="md" 
          style={{ 
            backgroundColor: '#FFFFFF',
            border: '2px solid #67D7A4',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            marginTop: '20px'
          }}
        >
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
                  ...questions
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

        <Paper p="md" style={{ backgroundColor: '#F8F9FA' }}>
          <Stack spacing="md">
            {paginatedQuestions.map((q) => (
              <div key={q.id} style={{ 
                padding: '20px', 
                borderBottom: '1px solid #67D7A4',
                ...(paginatedQuestions.indexOf(q) === paginatedQuestions.length - 1 && { borderBottom: 'none' })
              }}>
                <Stack spacing="xs">
                  <Text weight={600} c="#045944">Question:</Text>
                  <Text c="#008363">{q.question}</Text>
                  <Text weight={600} c="#045944">Answer:</Text>
                  <Text c="#008363">{q.answer_key}</Text>
                  <Text weight={600} c="#045944">Entity:</Text>
                  <Text c="#008363">{q.entity || '-'}</Text>
                  {q.comment && (
                    <>
                      <Text weight={600} c="#045944">Comment:</Text>
                      <Text c="#008363">{q.comment}</Text>
                    </>
                  )}
                  <Text size="sm" c="dimmed">
                    Added: {formatDate(q.created_at)}
                  </Text>
                </Stack>
              </div>
            ))}
          </Stack>
          
          {/* Add pagination controls */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              marginTop: '20px',
              padding: '20px 0',
              borderTop: '1px solid #67D7A4'
            }}>
              <Pagination
                value={currentPage}
                onChange={setCurrentPage}
                total={totalPages}
                color="juniper"
                radius="md"
                withEdges
                styles={{
                  control: {
                    '&[data-active]': {
                      backgroundColor: '#008363',
                      borderColor: '#008363',
                      '&:not(:disabled):hover': {
                        backgroundColor: '#045944',
                      },
                    },
                    '&:not(:disabled):hover': {
                      backgroundColor: 'rgba(103, 215, 164, 0.1)',
                    },
                  }
                }}
              />
            </div>
          )}
          
          {/* Add total results count */}
          <Text 
            size="sm" 
            c="dimmed" 
            style={{ 
              textAlign: 'center',
              marginTop: '10px'
            }}
          >
            Showing {paginatedQuestions.length} of {sortedQuestions.length} results
          </Text>
        </Paper>
      </Stack>
    </Container>
  )
}

export default DatabaseView 