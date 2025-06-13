import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Button, Loader, ScrollArea, TextInput, Group, Pagination, ActionIcon, Select, Box, Badge, Modal, Tooltip, Table, Textarea } from '@mantine/core'
import { IconSearch, IconArrowUp, IconArrowDown, IconInfoCircle, IconEdit, IconTrash, IconLock, IconLockOpen, IconX } from '@tabler/icons-react'

function DatabaseView({ onBack }) {
  const [questions, setQuestions] = useState([])
  const [filteredQuestions, setFilteredQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [searchResultsModal, setSearchResultsModal] = useState({
    opened: false,
    results: null
  })
  const [selectedItem, setSelectedItem] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editedItem, setEditedItem] = useState({})
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [showUsernameModal, setShowUsernameModal] = useState(!localStorage.getItem('username'))

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

  const handleEdit = (item) => {
    setSelectedItem(item)
    setEditedItem(item)
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setSelectedItem(null)
    setShowEditModal(false)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    // Handle form submission
  }

  const handleDelete = (id) => {
    // Handle delete operation
  }

  const handleSetUsername = (name) => {
    setUsername(name)
    localStorage.setItem('username', name)
    setShowUsernameModal(false)
  }

  const handleCheckout = async (item) => {
    if (!username) {
      setShowUsernameModal(true)
      return
    }

    try {
      const formData = new FormData()
      formData.append('user', username)

      const response = await fetch(`http://localhost:8000/questionnaires/${item.id}/checkout`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const updatedItem = await response.json()
        setSearchResults(prev => 
          prev.map(q => q.id === item.id ? updatedItem : q)
        )
        setSelectedItem(updatedItem)
        setEditedItem(updatedItem)
        setShowEditModal(true)
      } else {
        const error = await response.json()
        alert(error.message)
      }
    } catch (error) {
      console.error('Error checking out questionnaire:', error)
      alert('Failed to checkout questionnaire')
    }
  }

  const handleCheckin = async (e) => {
    e.preventDefault()
    if (!selectedItem || !username) return

    try {
      const formData = new FormData()
      formData.append('user', username)
      formData.append('question', editedItem.question)
      formData.append('answer_key', editedItem.answer_key)
      formData.append('category', editedItem.category || '')
      formData.append('sub_category', editedItem.sub_category || '')
      formData.append('compliance_answer', editedItem.compliance_answer || '')
      formData.append('notes', editedItem.notes || '')

      const response = await fetch(`http://localhost:8000/questionnaires/${selectedItem.id}/checkin`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const updatedItem = await response.json()
        setSearchResults(prev => 
          prev.map(q => q.id === selectedItem.id ? updatedItem : q)
        )
        setShowEditModal(false)
        setSelectedItem(null)
        setEditedItem({})
      } else {
        const error = await response.json()
        alert(error.message)
      }
    } catch (error) {
      console.error('Error checking in questionnaire:', error)
      alert('Failed to check in questionnaire')
    }
  }

  const handleCancelCheckout = async () => {
    if (!selectedItem || !username) return

    try {
      const formData = new FormData()
      formData.append('user', username)

      const response = await fetch(`http://localhost:8000/questionnaires/${selectedItem.id}/cancel-checkout`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const updatedItem = await response.json()
        setSearchResults(prev => 
          prev.map(q => q.id === selectedItem.id ? updatedItem : q)
        )
        setShowEditModal(false)
        setSelectedItem(null)
        setEditedItem({})
      } else {
        const error = await response.json()
        alert(error.message)
      }
    } catch (error) {
      console.error('Error canceling checkout:', error)
      alert('Failed to cancel checkout')
    }
  }

  return (
    <Container size="xl" py={40}>
      <Stack>
        <Modal
          opened={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          title="Enter Your Username"
        >
          <Stack>
            <TextInput
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
            <Button onClick={() => handleSetUsername(username)}>Save</Button>
          </Stack>
        </Modal>

        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Knowledge Base</Title>
            <Text c="dimmed" size="lg">View and search through your knowledge base entries</Text>
          </Stack>
          <Group>
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              rightSection={
                <ActionIcon onClick={() => setShowUsernameModal(true)}>
                  <IconEdit size={16} />
                </ActionIcon>
              }
            />
          </Group>
        </Group>

        <Paper p="xl" radius="lg" withBorder>
          <Stack spacing="xl">
            <Group position="apart">
              <Title order={2} size={24}>Search Questions</Title>
              <Tooltip label="Search across all fields: question, answer, category, sub-category, compliance answer, and notes." position="left">
                <IconInfoCircle size={20} style={{ color: '#94A3B8' }} />
              </Tooltip>
            </Group>
            <form onSubmit={handleSearch}>
              <Stack spacing="md">
                <TextInput
                  placeholder="Enter keywords to search..."
                  description={<Box component="span" c="dimmed" style={{ fontSize: '14px' }}>Search across all fields: question, answer, category, sub-category, compliance answer, and notes.</Box>}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<IconSearch size={20} />}
                  size="md"
                />
                <Group position="right">
                  <Button 
                    variant="subtle" 
                    onClick={() => {
                      setSearchQuery('')
                      setFilteredQuestions(questions)
                    }}
                  >
                    Clear
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
          <Paper p="xl" radius="lg" withBorder>
            <Stack align="center">
              <Loader size="lg" />
              <Text size="sm" c="dimmed">Loading questions...</Text>
            </Stack>
          </Paper>
        ) : error ? (
          <Paper p="xl" radius="lg" withBorder>
            <Stack align="center">
              <Text c="red" size="lg">{error}</Text>
              <Button variant="light" color="red" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper p="xl" radius="lg" withBorder>
            <Stack>
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

              <Table>
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Category</th>
                    <th>Sub-category</th>
                    <th>Compliance Answer</th>
                    <th>Notes</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedQuestions.map((item) => (
                    <tr key={item.id}>
                      <td>{item.question}</td>
                      <td>{item.answer_key}</td>
                      <td>{item.category}</td>
                      <td>{item.sub_category}</td>
                      <td>{item.compliance_answer}</td>
                      <td>{item.notes}</td>
                      <td>{formatDate(item.last_updated)}</td>
                      <td>
                        {item.checked_out_by ? (
                          <Tooltip label={`Checked out by ${item.checked_out_by} at ${formatDate(item.checked_out_at)}`}>
                            <Badge color="yellow" leftSection={<IconLock size={14} />}>
                              Checked Out
                            </Badge>
                          </Tooltip>
                        ) : (
                          <Badge color="green" leftSection={<IconLockOpen size={14} />}>
                            Available
                          </Badge>
                        )}
                      </td>
                      <td>
                        <Group spacing="xs">
                          <ActionIcon 
                            onClick={() => handleCheckout(item)}
                            disabled={item.checked_out_by && item.checked_out_by !== username}
                          >
                            <IconEdit size={20} />
                          </ActionIcon>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

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
                      <Stack spacing={4}>
                        <Text weight={600}>Question</Text>
                        <Text>{result.question}</Text>
                      </Stack>
                      <Stack spacing={4}>
                        <Text weight={600}>Answer</Text>
                        <Text>{result.answer_key}</Text>
                      </Stack>
                      <Stack spacing={4}>
                        <Text weight={600}>Category</Text>
                        <Text>{result.category || '-'}</Text>
                      </Stack>
                      <Stack spacing={4}>
                        <Text weight={600}>Sub-category</Text>
                        <Text>{result.sub_category || '-'}</Text>
                      </Stack>
                      <Stack spacing={4}>
                        <Text weight={600}>Compliance Answer</Text>
                        <Text>{result.compliance_answer || '-'}</Text>
                      </Stack>
                      <Stack spacing={4}>
                        <Text weight={600}>Notes</Text>
                        <Text>{result.notes || '-'}</Text>
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

        {selectedItem && (
          <Modal
            opened={showEditModal}
            onClose={handleCancelCheckout}
            title="Edit Entry"
            size="lg"
          >
            <form onSubmit={handleCheckin}>
              <Stack>
                <Textarea
                  label="Question"
                  required
                  value={editedItem.question}
                  onChange={(e) => setEditedItem({ ...editedItem, question: e.target.value })}
                />
                <Textarea
                  label="Answer"
                  required
                  value={editedItem.answer_key}
                  onChange={(e) => setEditedItem({ ...editedItem, answer_key: e.target.value })}
                />
                <TextInput
                  label="Category"
                  required
                  value={editedItem.category}
                  onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })}
                />
                <TextInput
                  label="Sub-category"
                  value={editedItem.sub_category}
                  onChange={(e) => setEditedItem({ ...editedItem, sub_category: e.target.value })}
                />
                <Textarea
                  label="Compliance Answer"
                  value={editedItem.compliance_answer}
                  onChange={(e) => setEditedItem({ ...editedItem, compliance_answer: e.target.value })}
                />
                <Textarea
                  label="Notes"
                  value={editedItem.notes}
                  onChange={(e) => setEditedItem({ ...editedItem, notes: e.target.value })}
                />
                <Group position="apart">
                  <Button variant="light" color="red" onClick={handleCancelCheckout}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </Group>
              </Stack>
            </form>
          </Modal>
        )}
      </Stack>
    </Container>
  )
}

export default DatabaseView 