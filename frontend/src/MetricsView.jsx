import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { IconAlertCircle } from '@tabler/icons-react'

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

function MetricsView() {
  const [metrics, setMetrics] = useState({
    monthlyData: { data: [], loading: true, error: null },
    categoryDistribution: { data: [], loading: true, error: null },
    dailyTrends: { data: null, loading: true, error: null },
    complexityAnalysis: { data: null, loading: true, error: null },
    systemSummary: { data: null, loading: true, error: null },
    confidenceDistribution: { data: null, loading: true, error: null },
    reviewStatus: { data: null, loading: true, error: null },
  })

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetric = async (endpoint) => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/metrics/${endpoint}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
        }
        const data = await response.json()
        return { data, error: null }
      } catch (err) {
        console.error(`Error fetching ${endpoint}:`, err)
        return { data: null, error: err.message }
      } finally {
        setLoading(false);
      }
    }

    const updateMetric = (metricName, data, error = null) => {
      setMetrics(prev => ({
        ...prev,
        [metricName]: {
          data,
          loading: false,
          error
        }
      }))
    }

    const fetchMonthlyData = async () => {
      const { data, error } = await fetchMetric('monthly-entries')
      if (data && data.monthly_counts) {
        const transformedData = data.monthly_counts.map(entry => {
          try {
            const [year, month] = entry.month.split('-')
            const date = new Date(year, parseInt(month) - 1)
            return {
              month: date.toLocaleString('default', { month: 'short' }) + ' ' + year,
              count: entry.count
            }
          } catch (err) {
            console.error('Error transforming monthly data:', err)
            return null
          }
        }).filter(Boolean)
        updateMetric('monthlyData', transformedData)
      } else {
        updateMetric('monthlyData', [], error)
      }
    }

    const fetchCategoryDistribution = async () => {
      const { data, error } = await fetchMetric('category-distribution')
      updateMetric('categoryDistribution', data?.category_distribution || [], error)
    }

    const fetchComplexityAnalysis = async () => {
      const { data, error } = await fetchMetric('complexity-analysis')
      updateMetric('complexityAnalysis', data, error)
    }

    const fetchSystemSummary = async () => {
      const { data, error } = await fetchMetric('system-summary')
      updateMetric('systemSummary', data, error)
    }

    const fetchReviewStatus = async () => {
      const { data, error } = await fetchMetric('review-status')
      updateMetric('reviewStatus', data, error)
    }

    fetchMonthlyData()
    fetchCategoryDistribution()
    fetchComplexityAnalysis()
    fetchSystemSummary()
    fetchReviewStatus()
  }, [])

  const renderMetricSection = (title, content, loading, error) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center space-y-4 py-8">
          <LoadingSpinner />
          <p className="text-gray-600">Loading {title.toLowerCase()}...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center">
          <IconAlertCircle className="mr-2" size={16} />
          <div>
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )
    }

    return content
  }

  const renderMonthlyChart = () => {
    const { data, loading, error } = metrics.monthlyData
    
    const content = data?.length > 0 ? (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
            <XAxis 
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
              tick={{ fill: '#666666' }}
            />
            <YAxis tick={{ fill: '#666666' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
              }}
            />
            <Bar 
              dataKey="count" 
              fill="#3B82F6"
              name="Entries"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="text-gray-600">No monthly data available</p>
    )

    return renderMetricSection("Monthly Chart", content, loading, error)
  }

  const renderCategoryDistribution = () => {
    const { data, loading, error } = metrics.categoryDistribution
    const COLORS = ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554']

    const content = data?.length > 0 ? (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, category, percentage }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius * 1.2;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#666666"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                  >
                    {`${category} (${percentage}%)`}
                  </text>
                );
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p className="text-gray-600">No category distribution data available</p>
    )

    return renderMetricSection("Category Distribution", content, loading, error)
  }

  const renderComplexityAnalysis = () => {
    const { data, loading, error } = metrics.complexityAnalysis
    const COLORS = ['#3B82F6', '#2563EB', '#1D4ED8']

    const content = data ? (
      <div className="space-y-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={Object.entries(data.complexity_distribution.counts).map(([key, value]) => ({
                  name: key,
                  value: value
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius * 1.2;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="#666666"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {`${name}: ${value}`}
                    </text>
                  );
                }}
              >
                {Object.entries(data.complexity_distribution.counts).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2 text-gray-600">
          <li>Average Length: {data.statistics.average_length}</li>
          <li>Max Length: {data.statistics.max_length}</li>
          <li>Min Length: {data.statistics.min_length}</li>
        </ul>
      </div>
    ) : (
      <p className="text-gray-600">No complexity analysis data available</p>
    )

    return renderMetricSection("Complexity Analysis", content, loading, error)
  }

  const renderSystemSummary = () => {
    const { data, loading, error } = metrics.systemSummary

    const content = data ? (
      <div className="space-y-4">
        <div className="flex justify-between">
          <div>
            <p className="text-xl font-bold text-gray-600">{data.total_metrics.total_questions}</p>
            <p className="text-sm text-gray-600">Total Questions</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-600">{data.activity_metrics.last_24h_submissions}</p>
            <p className="text-sm text-gray-600">Last 24h</p>
          </div>
        </div>
        <ul className="space-y-2 text-gray-600">
          <li>Average Daily: {data.activity_metrics.average_daily_submissions}</li>
          <li>Days Active: {data.total_metrics.days_active}</li>
          <li>Last 7 Days: {data.activity_metrics.last_7d_submissions}</li>
        </ul>
      </div>
    ) : (
      <p className="text-gray-600">No system summary data available</p>
    )

    return renderMetricSection("System Summary", content, loading, error)
  }

  const renderReviewStatus = () => {
    const { data, loading, error } = metrics.reviewStatus
    const COLORS = {
      'In Review': '#FBBF24',
      'Completed': '#34D399',
      'Failed': '#EF4444',
      'Processing': '#6B7280'
    }

    const content = data ? (
      <div className="space-y-4">
        <div className="flex justify-between">
          <div>
            <p className="text-xl font-bold text-gray-600">{data.total_questionnaires}</p>
            <p className="text-sm text-gray-600">Total Questionnaires</p>
          </div>
          <div>
            <p className="text-xl font-bold text-yellow-500">{data.in_review}</p>
            <p className="text-sm text-gray-600">In Review</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-500">{data.completed}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'In Review', value: data.in_review, percentage: data.percentages.in_review },
                { name: 'Completed', value: data.completed, percentage: data.percentages.completed },
                { name: 'Failed', value: data.failed, percentage: data.percentages.failed },
                { name: 'Processing', value: data.processing, percentage: data.percentages.processing }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
              <XAxis 
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fill: '#666666' }}
              />
              <YAxis 
                tick={{ fill: '#666666' }}
                label={{ 
                  value: 'Number of Questionnaires',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#666666',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, props.payload.name]}
              />
              <Bar 
                dataKey="value"
                radius={[4, 4, 0, 0]}
              >
                {data && Object.entries(COLORS).map(([name, color]) => (
                  <Cell key={name} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    ) : (
      <p className="text-gray-600">No review status data available</p>
    )

    return renderMetricSection("Review Status", content, loading, error)
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Metrics Dashboard</h1>
            <p className="text-gray-600 text-lg">Knowledge Base Growth and Statistics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white p-10 rounded-lg border border-gray-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Monthly Knowledge Base Entries</h2>
              {renderMonthlyChart()}
            </div>
          </div>

          <div className="bg-white p-10 rounded-lg border border-gray-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Category Distribution</h2>
              {renderCategoryDistribution()}
            </div>
          </div>

          <div className="bg-white p-10 rounded-lg border border-gray-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Question Complexity</h2>
              {renderComplexityAnalysis()}
            </div>
          </div>

          <div className="bg-white p-10 rounded-lg border border-gray-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Review Status</h2>
              {renderReviewStatus()}
            </div>
          </div>

          <div className="bg-white p-10 rounded-lg border border-gray-200">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">System Summary</h2>
              {renderSystemSummary()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MetricsView 