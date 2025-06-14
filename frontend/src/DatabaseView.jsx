import React, { useState, useEffect } from 'react'
import { IconDatabase, IconSearch, IconUpload } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

const DatabaseView = () => {
  const [databases, setDatabases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDatabases()
  }, [])

  const fetchDatabases = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/databases')
      if (!response.ok) {
        throw new Error('Failed to fetch databases')
      }
      const data = await response.json()
      setDatabases(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching databases:', err)
      setDatabases([])
      // Only set error if it's not a 404 (empty database)
      if (err.message !== 'Failed to fetch databases') {
        setError('An unexpected error occurred while fetching the database')
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredDatabases = databases.filter(db => {
    return db.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           db.description?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-gray-600 mt-2">View and manage your question-answer database</p>
        </div>
        <button
          onClick={() => navigate('/knowledge-base-upload')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <IconUpload size={20} />
          Add New Entries
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        </div>
      </div>

      {databases.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <IconDatabase size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No entries in the knowledge base yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first question-answer pair or uploading a CSV file.</p>
          <button
            onClick={() => navigate('/knowledge-base-upload')}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <IconUpload size={20} />
            Add New Entries
          </button>
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No entries found matching your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatabases.map((db) => (
            <div key={db.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === db.id ? null : db.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <IconDatabase className="text-gray-400" size={24} />
                    <h2 className="text-xl font-semibold">{db.name}</h2>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    db.status === 'active' ? 'bg-green-100 text-green-800' :
                    db.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {db.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Size:</span>
                    <span className="font-medium">{db.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="font-medium">{new Date(db.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </div>

                {expandedId === db.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Description</h3>
                        <p className="mt-1 text-gray-700">{db.description || 'No description available'}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Connection Details</h3>
                        <div className="mt-1 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Host:</span>
                            <span className="font-medium">{db.host}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Port:</span>
                            <span className="font-medium">{db.port}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Type:</span>
                            <span className="font-medium">{db.type}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DatabaseView 