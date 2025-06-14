import React, { useState, useEffect } from 'react'
import { IconUpload, IconInfoCircle, IconX } from '@tabler/icons-react'

const QuestionnaireManagement = () => {
  const [questionnaires, setQuestionnaires] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newQuestionnaire, setNewQuestionnaire] = useState({
    title: '',
    description: '',
    type: 'general',
    questions: []
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetchQuestionnaires()
  }, [])

  const fetchQuestionnaires = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/questionnaires')
      const data = await response.json()
      setQuestionnaires(data)
    } catch (err) {
      setError('Failed to fetch questionnaires')
      console.error('Error fetching questionnaires:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!newQuestionnaire.title.trim()) {
      setError('Please provide a title')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newQuestionnaire)
      })

      if (!response.ok) {
        throw new Error('Failed to create questionnaire')
      }

      await fetchQuestionnaires()
      setNewQuestionnaire({
        title: '',
        description: '',
        type: 'general',
        questions: []
      })
    } catch (err) {
      setError('Failed to create questionnaire')
      console.error('Error creating questionnaire:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setSelectedFile(file)
    const formData = new FormData()
    formData.append('file', file)

    try {
      setUploadProgress(0)
      const response = await fetch('/api/questionnaires/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      await fetchQuestionnaires()
      setSelectedFile(null)
      setUploadProgress(0)
    } catch (err) {
      setError('Failed to upload file')
      console.error('Upload error:', err)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    setSelectedFile(selectedFile)
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()

    if (!selectedFile || !newQuestionnaire.title.trim()) {
      setError('Please provide both a file and a title')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', newQuestionnaire.title.trim())
    formData.append('description', newQuestionnaire.description.trim())
    formData.append('type', newQuestionnaire.type)

    try {
      const response = await fetch('/api/questionnaires', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      })

      if (!response.ok) {
        throw new Error('Failed to upload questionnaire')
      }

      setSuccess(true)
      setSelectedFile(null)
      setNewQuestionnaire({
        title: '',
        description: '',
        type: 'general',
        questions: []
      })
      setUploadProgress(0)
    } catch (err) {
      setError('Failed to upload questionnaire. Please try again.')
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  if (loading && !questionnaires.length) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Questionnaire Management</h1>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded">
          Questionnaire uploaded successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-6">Create New Questionnaire</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="title">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={newQuestionnaire.title}
                onChange={(e) => setNewQuestionnaire({...newQuestionnaire, title: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={newQuestionnaire.description}
                onChange={(e) => setNewQuestionnaire({...newQuestionnaire, description: e.target.value})}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="type">
                Type
              </label>
              <select
                id="type"
                value={newQuestionnaire.type}
                onChange={(e) => setNewQuestionnaire({...newQuestionnaire, type: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="customer">Customer</option>
                <option value="employee">Employee</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                  ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {loading ? 'Creating...' : 'Create Questionnaire'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-6">Import Questionnaire</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="file">
                Upload File
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <IconUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={handleFileSelect}
                        accept=".csv,.xlsx,.xls"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    CSV, Excel files up to 10MB
                  </p>
                </div>
              </div>
              {selectedFile && (
                <div className="mt-2 flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <IconX className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 text-right">{uploadProgress}%</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-6">Existing Questionnaires</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {questionnaires.map((questionnaire) => (
            <div key={questionnaire.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">{questionnaire.title}</h3>
                <span className="px-2 py-1 text-sm rounded bg-blue-100 text-blue-800">
                  {questionnaire.type}
                </span>
              </div>
              
              {questionnaire.description && (
                <p className="text-gray-600 mb-4">{questionnaire.description}</p>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Questions: {questionnaire.questions?.length || 0}</span>
                <span>Created: {new Date(questionnaire.created).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default QuestionnaireManagement 