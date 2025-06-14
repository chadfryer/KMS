import React from 'react'
import { IconDatabase, IconUpload, IconClipboardList, IconChartBar, IconInbox } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'

/**
 * MainView component provides the primary interface for interacting with the system.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onViewDatabase - Callback function to view the database
 */
function MainView({ onViewDatabase }) {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Knowledge Management System</h1>
            <p className="text-gray-600 text-lg">Manage and search your question-answer database.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            onClick={() => navigate('/knowledge-base')}
          >
            <div className="flex items-center gap-4 mb-4">
              <IconDatabase size={24} className="text-gray-400" />
              <h2 className="text-2xl font-semibold">Knowledge Base</h2>
            </div>
            <p className="text-gray-600">
              View and manage your complete knowledge base. Browse through all questions and answers, 
              filter by entity, and easily find specific information. The knowledge base provides a 
              comprehensive view of all stored information with powerful search and filtering capabilities.
            </p>
          </div>

          <div 
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            onClick={() => navigate('/knowledge-base-upload')}
          >
            <div className="flex items-center gap-4 mb-4">
              <IconUpload size={24} className="text-gray-400" />
              <h2 className="text-2xl font-semibold">Upload Knowledge</h2>
            </div>
            <p className="text-gray-600">
              Bulk upload questions and answers using CSV files. This feature allows you to efficiently 
              import large sets of data into the knowledge base. The system automatically checks for 
              duplicates and validates the data format to ensure data quality and consistency.
            </p>
          </div>

          <div 
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            onClick={() => navigate('/questionnaire-management')}
          >
            <div className="flex items-center gap-4 mb-4">
              <IconClipboardList size={24} className="text-gray-400" />
              <h2 className="text-2xl font-semibold">Process Questionnaire</h2>
            </div>
            <p className="text-gray-600">
              Process and analyze questionnaires with AI assistance. Upload questionnaires and receive 
              intelligent suggestions for answers based on the existing knowledge base. This tool helps 
              streamline the questionnaire completion process and ensures consistency across responses.
            </p>
          </div>

          <div 
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
            onClick={() => navigate('/metrics')}
          >
            <div className="flex items-center gap-4 mb-4">
              <IconChartBar size={24} className="text-gray-400" />
              <h2 className="text-2xl font-semibold">Metrics</h2>
            </div>
            <p className="text-gray-600">
              View detailed analytics and metrics about your knowledge base. Track growth over time, 
              analyze question complexity, monitor entity distribution, and gain insights into system 
              usage. The metrics dashboard provides valuable data to help optimize your knowledge management.
            </p>
          </div>

          <div 
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer col-span-full"
            onClick={() => navigate('/backlog')}
          >
            <div className="flex items-center gap-4 mb-4">
              <IconInbox size={24} className="text-gray-400" />
              <h2 className="text-2xl font-semibold">Questionnaire Backlog</h2>
            </div>
            <p className="text-gray-600">
              Manage and track questionnaires that are in progress or pending review. The backlog provides 
              a clear overview of all questionnaires being processed, their current status, and any actions 
              required. This helps maintain an organized workflow and ensures no questionnaire is overlooked.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainView 