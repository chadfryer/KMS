import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, Loader, ScrollArea, TextInput, Group, Pagination, ActionIcon, Select, Box, Tooltip, Card, Badge, Collapse } from '@mantine/core'
import { IconSearch, IconArrowUp, IconArrowDown, IconInfoCircle, IconX, IconPlus, IconAdjustments } from '@tabler/icons-react'

function DatabaseView({ onBack }) {
  const [questions, setQuestions] = useState([])
  const [filteredQuestions, setFilteredQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState({ key: 'last_updated', direction: 'desc' })
  const [fieldSearches, setFieldSearches] = useState([])
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const searchFields = [
    { value: 'question', label: 'Question' },
    { value: 'answer_key', label: 'Answer' },
    { value: 'domain', label: 'Domain' },
    { value: 'category', label: 'Category' },
    { value: 'sub_category', label: 'Sub-category' },
    { value: 'compliance_answer', label: 'Compliance Answer' },
    { value: 'notes', label: 'Notes' }
  ]

  const pageSizeOptions = [
    { value: '5', label: '5 per page' },
    { value: '10', label: '10 per page' },
    { value: '25', label: '25 per page' },
    { value: '50', label: '50 per page' },
    { value: '100', label: '100 per page' }
  ]

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:8000/questions')
      if (!response.ok) throw new Error('Failed to fetch questions')
      const data = await response.json()
      setQuestions(data)
      setFilteredQuestions(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    
    if (!searchQuery.trim() && fieldSearches.length === 0) {
      setFilteredQuestions(questions)
      return
    }

    let filtered = [...questions]

    // Apply basic search
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(item => 
        (item.question?.toLowerCase().includes(searchLower) ?? false) ||
        (item.category?.toLowerCase().includes(searchLower) ?? false) ||
        (item.sub_category?.toLowerCase().includes(searchLower) ?? false) ||
        (item.answer_key?.toLowerCase().includes(searchLower) ?? false)
      )
    }

    // Apply field-specific searches
    fieldSearches.forEach(fieldSearch => {
      if (fieldSearch.value.trim()) {
        const searchLower = fieldSearch.value.toLowerCase()
        filtered = filtered.filter(item => 
          (item[fieldSearch.field]?.toLowerCase().includes(searchLower) ?? false)
        )
      }
    })

    setFilteredQuestions(filtered)
    setCurrentPage(1)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    const aValue = a[sortConfig.key] || ''
    const bValue = b[sortConfig.key] || ''
    const direction = sortConfig.direction === 'asc' ? 1 : -1
    return aValue.toString().localeCompare(bValue.toString()) * direction
  })

  const totalPages = Math.ceil(sortedQuestions.length / itemsPerPage)
  const paginatedQuestions = sortedQuestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (isLoading) {
    return (
      <Paper p="xl" radius="lg" withBorder>
        <Stack align="center">
          <Loader size="lg" />
          <Text size="sm" c="dimmed">Loading questions...</Text>
        </Stack>
      </Paper>
    )
  }

  if (error) {
    return (
      <Paper p="xl" radius="lg" withBorder>
        <Stack align="center">
          <Text c="red" size="lg">{error}</Text>
        </Stack>
      </Paper>
    )
  }

  return (
    <div style={{ 
      backgroundColor: '#1A1B1E', 
      minHeight: '100vh', 
      width: '100%', 
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '40px 20px'
    }}>
      <Container size="xl" p={0}>
        <Stack spacing="lg">
          <Group position="apart">
            <Title order={2} c="#FFFFFF">Knowledge Base</Title>
            <Group>
              <TextInput
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (!showAdvancedSearch) handleSearch()
                }}
                icon={<IconSearch size={16} />}
                style={{ width: '300px' }}
                styles={{
                  input: {
                    backgroundColor: '#25262B',
                    color: '#FFFFFF',
                    border: '1px solid #373A40'
                  }
                }}
              />
              <Tooltip label="Toggle advanced search">
                <ActionIcon 
                  variant={showAdvancedSearch ? "filled" : "subtle"}
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  c="#FFFFFF"
                >
                  <IconAdjustments size={20} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Collapse in={showAdvancedSearch}>
            <Paper p="md" radius="md" withBorder styles={{ root: { backgroundColor: '#25262B' } }}>
              <form onSubmit={handleSearch}>
                <Stack spacing="md">
                  <Text size="sm" fw={500} c="#FFFFFF">Advanced Search</Text>
                  
                  {fieldSearches.map((fieldSearch, index) => (
                    <Group key={index} align="flex-end" spacing="sm">
                      <Select
                        label="Search Field"
                        data={searchFields}
                        value={fieldSearch.field}
                        onChange={(value) => {
                          const newFieldSearches = [...fieldSearches]
                          newFieldSearches[index] = { ...newFieldSearches[index], field: value }
                          setFieldSearches(newFieldSearches)
                        }}
                        style={{ minWidth: '200px' }}
                        styles={{
                          label: { color: '#FFFFFF' },
                          input: {
                            backgroundColor: '#25262B',
                            color: '#FFFFFF',
                            border: '1px solid #373A40'
                          },
                          item: {
                            '&[data-selected]': {
                              backgroundColor: '#1A1B1E',
                              color: '#FFFFFF'
                            }
                          }
                        }}
                      />
                      <TextInput
                        label="Search Value"
                        placeholder={`Search in ${searchFields.find(f => f.value === fieldSearch.field)?.label}`}
                        value={fieldSearch.value}
                        onChange={(e) => {
                          const newFieldSearches = [...fieldSearches]
                          newFieldSearches[index] = { ...newFieldSearches[index], value: e.target.value }
                          setFieldSearches(newFieldSearches)
                        }}
                        style={{ flex: 1 }}
                        styles={{
                          label: { color: '#FFFFFF' },
                          input: {
                            backgroundColor: '#25262B',
                            color: '#FFFFFF',
                            border: '1px solid #373A40'
                          }
                        }}
                      />
                      <ActionIcon 
                        color="red" 
                        onClick={() => {
                          const newFieldSearches = [...fieldSearches]
                          newFieldSearches.splice(index, 1)
                          setFieldSearches(newFieldSearches)
                        }}
                        variant="subtle"
                        size="lg"
                      >
                        <IconX size={20} />
                      </ActionIcon>
                    </Group>
                  ))}

                  <Group position="right">
                    <Button 
                      variant="subtle"
                      leftSection={<IconPlus size={20} />}
                      onClick={() => setFieldSearches([...fieldSearches, { field: 'question', value: '' }])}
                      c="#FFFFFF"
                    >
                      Add Field Search
                    </Button>
                    <Button 
                      variant="subtle" 
                      onClick={() => {
                        setSearchQuery('')
                        setFieldSearches([])
                        setFilteredQuestions(questions)
                      }}
                      c="#FFFFFF"
                    >
                      Clear
                    </Button>
                    <Button 
                      type="submit"
                      leftSection={<IconSearch size={20} />}
                    >
                      Search
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Collapse>

          <Stack spacing="md">
            {paginatedQuestions.map((item) => (
              <Card key={item.id} shadow="sm" padding="lg" radius="md" withBorder styles={{
                root: {
                  backgroundColor: '#25262B'
                }
              }}>
                <Stack spacing="lg">
                  <Stack spacing="md">
                    <Group spacing="lg">
                      {item.domain && (
                        <Group spacing="xs" noWrap>
                          <Text fw={600} c="#666666" size="sm">Domain:</Text>
                          <Text c="#FFFFFF" size="sm">{item.domain}</Text>
                        </Group>
                      )}
                      {item.category && (
                        <Group spacing="xs" noWrap>
                          <Text fw={600} c="#666666" size="sm">Category:</Text>
                          <Text c="#FFFFFF" size="sm">{item.category}</Text>
                        </Group>
                      )}
                      {item.sub_category && (
                        <Group spacing="xs" noWrap>
                          <Text fw={600} c="#666666" size="sm">Sub-category:</Text>
                          <Text c="#FFFFFF" size="sm">{item.sub_category}</Text>
                        </Group>
                      )}
                    </Group>

                    <Stack spacing="xs">
                      <Text fw={600} c="#666666" size="sm">Question:</Text>
                      <Text size="lg" c="#FFFFFF" style={{ lineHeight: 1.6 }}>
                        {item.question || 'No question available'}
                      </Text>
                    </Stack>

                    <Stack spacing="xs">
                      <Text fw={600} c="#666666" size="sm">Answer:</Text>
                      <Text c="#FFFFFF" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {item.answer_key || 'No answer available'}
                      </Text>
                    </Stack>

                    {item.notes && (
                      <Stack spacing="xs">
                        <Text fw={600} c="#666666" size="sm">Notes:</Text>
                        <Text c="#FFFFFF" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {item.notes}
                        </Text>
                      </Stack>
                    )}

                    <Group position="right" spacing="xs">
                      <Text fw={600} c="#666666" size="sm">Last Updated:</Text>
                      <Text c="#FFFFFF" size="sm">{formatDate(item.last_updated)}</Text>
                    </Group>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>

          {totalPages > 0 && (
            <Group position="center" mt="md" align="center">
              <Group spacing="xs" align="center">
                <Text size="sm" c="#FFFFFF">Show</Text>
                <Select
                  value={itemsPerPage.toString()}
                  onChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                  data={pageSizeOptions}
                  style={{ width: 130 }}
                  styles={{
                    input: {
                      backgroundColor: '#25262B',
                      color: '#FFFFFF',
                      border: '1px solid #373A40'
                    },
                    item: {
                      '&[data-selected]': {
                        backgroundColor: '#1A1B1E',
                        color: '#FFFFFF'
                      }
                    }
                  }}
                />
              </Group>
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
                styles={{
                  control: {
                    backgroundColor: '#25262B',
                    color: '#FFFFFF',
                    border: '1px solid #373A40',
                    '&[data-active]': {
                      backgroundColor: '#228BE6'
                    }
                  }
                }}
              />
              <Text size="sm" c="#FFFFFF">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredQuestions.length)} - {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length} entries
              </Text>
            </Group>
          )}
        </Stack>
      </Container>
    </div>
  )
}

export default DatabaseView 