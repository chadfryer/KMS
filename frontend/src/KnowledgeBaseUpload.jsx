import React, { useState } from 'react'
import { IconUpload, IconInfoCircle, IconX } from '@tabler/icons-react'

function KnowledgeBaseUpload() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswerKey, setNewAnswerKey] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newSubCategory, setNewSubCategory] = useState('')
  const [newComplianceAnswer, setNewComplianceAnswer] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [uploadStats, setUploadStats] = useState({
    totalQuestions: 0,
    duplicatesFound: 0,
    newQuestionsKept: 0,
    existingQuestionsKept: 0
  })
  const [newDomain, setNewDomain] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append('question', newQuestion)
      formData.append('answer_key', newAnswerKey)
      formData.append('category', newCategory)
      formData.append('sub_category', newSubCategory)
      formData.append('domain', newDomain)
      formData.append('compliance_answer', newComplianceAnswer)
      formData.append('notes', newNotes)

      const response = await fetch('http://localhost:8000/add', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setNewQuestion('')
        setNewAnswerKey('')
        setNewCategory('')
        setNewSubCategory('')
        setNewDomain('')
        setNewComplianceAnswer('')
        setNewNotes('')
        setUploadStatus({
          type: 'success',
          message: 'Question-answer pair added successfully'
        })
      } else {
        setSimilarQuestions([{
          new_question: newQuestion,
          new_answer: newAnswerKey,
          new_category: newCategory,
          new_sub_category: newSubCategory,
          new_domain: newDomain,
          new_compliance_answer: newComplianceAnswer,
          new_notes: newNotes,
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
      formData.append('category', keepNew ? currentQuestion.new_category : currentQuestion.similar_to.category)
      formData.append('sub_category', keepNew ? currentQuestion.new_sub_category : currentQuestion.similar_to.sub_category)
      formData.append('domain', keepNew ? currentQuestion.new_domain : currentQuestion.similar_to.domain)
      formData.append('compliance_answer', keepNew ? currentQuestion.new_compliance_answer : currentQuestion.similar_to.compliance_answer)
      formData.append('notes', keepNew ? currentQuestion.new_notes : currentQuestion.similar_to.notes)
      
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
          formData.append('category', currentQuestion.similar_to.category);
          formData.append('sub_category', currentQuestion.similar_to.sub_category);
          formData.append('domain', currentQuestion.similar_to.domain);
          formData.append('compliance_answer', currentQuestion.similar_to.compliance_answer);
          formData.append('notes', currentQuestion.similar_to.notes);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Knowledge Base Upload</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Upload CSV File</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept=".csv"
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {uploadStatus && (
            <div className={`p-4 rounded-md ${uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {uploadStatus.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="whitespace-pre-line">{uploadStatus.message}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Question</label>
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Answer Key</label>
              <textarea
                value={newAnswerKey}
                onChange={(e) => setNewAnswerKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sub Category</label>
                <input
                  type="text"
                  value={newSubCategory}
                  onChange={(e) => setNewSubCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Domain</label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Compliance Answer</label>
              <textarea
                value={newComplianceAnswer}
                onChange={(e) => setNewComplianceAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Question
            </button>
          </form>
        </div>
      </div>

      {showPopup && similarQuestions.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Similar Question Found</h2>
              <button
                onClick={handleClosePopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <IconX size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">New Question:</h3>
                <p className="p-3 bg-gray-50 rounded-md">{similarQuestions[currentIndex].new_question}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">Similar Existing Question:</h3>
                  <span className="text-sm text-gray-500">
                    (Similarity: {(similarQuestions[currentIndex].similarity * 100).toFixed(1)}%)
                  </span>
                </div>
                <p className="p-3 bg-gray-50 rounded-md">{similarQuestions[currentIndex].similar_to.question}</p>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => handleResolveSimilar(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Keep Existing
                </button>
                <button
                  onClick={() => handleResolveSimilar(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Keep New
                </button>
              </div>

              {similarQuestions.length > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Question {currentIndex + 1} of {similarQuestions.length}
                  </span>
                  <div className="h-2 bg-gray-200 rounded-full flex-grow mx-4">
                    <div
                      className="h-2 bg-blue-600 rounded-full"
                      style={{ width: `${((currentIndex + 1) / similarQuestions.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeBaseUpload