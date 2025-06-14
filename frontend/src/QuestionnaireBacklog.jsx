import React, { useState, useEffect } from 'react'
import { IconDownload, IconEdit, IconCheck, IconX } from '@tabler/icons-react'

const QuestionnaireBacklog = () => {
  const [backlog, setBacklog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)

  useEffect(() => {
    fetchBacklog()
  }, [])

  const fetchBacklog = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backlog')
      const data = await response.json()
      setBacklog(data)
    } catch (err) {
      setError('Failed to fetch backlog')
      console.error('Error fetching backlog:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (entryId, filename) => {
    try {
      const updatedEntries = backlog.map(entry => 
        entry.id === entryId ? { ...entry, downloading: true } : entry
      );
      setBacklog(updatedEntries);

      const response = await fetch(`/api/backlog/${entryId}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const finalEntries = backlog.map(entry => 
        entry.id === entryId ? { ...entry, downloaded: true, downloading: false } : entry
      );
      setBacklog(finalEntries);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError(err.message);
      const resetEntries = backlog.map(entry => 
        entry.id === entryId ? { ...entry, downloading: false } : entry
      );
      setBacklog(resetEntries);
    }
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedEntry(null);
  };

  const handleAcceptAnswer = async (entryId, questionId) => {
    try {
      const response = await fetch(`/api/backlog/${entryId}/questions/${questionId}/accept`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to accept answer');

      const updatedResponse = await fetch('/api/backlog');
      if (!updatedResponse.ok) throw new Error('Failed to refresh data');

      const updatedData = await updatedResponse.json();
      setBacklog(updatedData.entries || []);

      handleClosePopup();
    } catch (err) {
      console.error('Error accepting answer:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Questionnaire Backlog</h1>

      <div className="grid grid-cols-1 gap-6">
        {backlog.map((entry) => (
          <div key={entry.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{entry.filename}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Processed {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {entry.status !== 'failed' && entry.status !== 'processing' && (
                  <button
                    onClick={() => handleEdit(entry)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <IconEdit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                )}
                {entry.can_download && (
                  <button
                    onClick={() => handleDownload(entry.id, entry.filename)}
                    disabled={entry.status === 'processing' || entry.status === 'failed' || entry.downloading}
                    className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
                      ${entry.downloading || entry.status === 'processing' || entry.status === 'failed'
                        ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                  >
                    <IconDownload className="w-4 h-4 mr-2" />
                    {entry.downloading ? 'Downloading...' : 
                     entry.downloaded ? 'Download Again' : 'Download'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-gray-500 text-sm">Questions</span>
                <p className="text-lg font-semibold">{entry.questions_count}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Processed</span>
                <p className="text-lg font-semibold">{entry.processed_count}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Success Rate</span>
                <p className="text-lg font-semibold">{entry.success_rate}%</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">In Review</span>
                <p className={`text-lg font-semibold ${entry.unaccepted_answers_count > 0 ? 'text-red-600' : ''}`}>
                  {entry.unaccepted_answers_count}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-medium
                ${entry.status === 'failed' ? 'bg-red-100 text-red-800' :
                  entry.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  !entry.downloaded ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'}`}
              >
                {entry.status === 'failed' ? 'Failed' :
                 entry.status === 'processing' ? 'Processing' :
                 !entry.downloaded ? 'In Review' : 'Completed'}
              </span>
              {entry.entity && (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                  {entry.entity}
                </span>
              )}
            </div>

            {entry.error_message && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">Error: {entry.error_message}</p>
              </div>
            )}
          </div>
        ))}

        {backlog.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No questionnaires in backlog</p>
          </div>
        )}
      </div>

      {showPopup && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Edit Questionnaire</h2>
                <button
                  onClick={handleClosePopup}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <IconX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {selectedEntry.questions?.map((question) => (
                  <div key={question.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900">Question</h3>
                      <p className="mt-1">{question.text}</p>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-medium text-gray-900">Suggested Answer</h3>
                      <p className="mt-1">{question.suggested_answer}</p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleAcceptAnswer(selectedEntry.id, question.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        <IconCheck className="w-4 h-4 mr-2" />
                        Accept Answer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionnaireBacklog 