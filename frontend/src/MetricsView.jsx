import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Group, Alert, Grid, RingProgress, List, Loader } from '@mantine/core'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { IconAlertCircle } from '@tabler/icons-react'

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

  useEffect(() => {
    const fetchMetric = async (endpoint) => {
      try {
        const response = await fetch(`http://localhost:8000/metrics/${endpoint}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`)
        }
        const data = await response.json()
        return { data, error: null }
      } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error)
        return { data: null, error: error.message }
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

    // Fetch each metric independently
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

    // Fetch all metrics independently
    fetchMonthlyData()
    fetchCategoryDistribution()
    fetchComplexityAnalysis()
    fetchSystemSummary()
    fetchReviewStatus()
  }, [])

  const renderMetricSection = (title, content, loading, error) => {
    if (loading) {
      return (
        <Stack align="center" spacing="md" py="xl">
          <Loader size="md" />
          <Text c="dimmed">Loading {title.toLowerCase()}...</Text>
        </Stack>
      )
    }

    if (error) {
      return (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      )
    }

    return content
  }

  const renderMonthlyChart = () => {
    const { data, loading, error } = metrics.monthlyData
    
    const content = data?.length > 0 ? (
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
            <XAxis 
              dataKey="month"
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
              tick={{ fill: 'var(--mantine-color-dimmed)' }}
            />
            <YAxis tick={{ fill: 'var(--mantine-color-dimmed)' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#333333',
                border: '1px solid #444444',
                color: 'var(--mantine-color-dimmed)'
              }}
              labelStyle={{ color: 'var(--mantine-color-dimmed)' }}
            />
            <Bar 
              dataKey="count" 
              fill="#CC0000"
              name="Entries"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <Text c="dimmed">No monthly data available</Text>
    )

    return renderMetricSection("Monthly Chart", content, loading, error)
  }

  const renderCategoryDistribution = () => {
    const { data, loading, error } = metrics.categoryDistribution
    const COLORS = ['#CC0000', '#990000', '#660000', '#330000', '#FF0000', '#FF3333']

    const content = data?.length > 0 ? (
      <div style={{ height: 300 }}>
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
                    fill="var(--mantine-color-dimmed)"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                  >
                    {`${category} (${percentage}%)`}
                  </text>
                );
              }}
              labelStyle={{ fill: 'var(--mantine-color-dimmed)' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#333333',
                border: '1px solid #444444',
                color: 'var(--mantine-color-dimmed)'
              }}
              labelStyle={{ color: 'var(--mantine-color-dimmed)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <Text c="dimmed">No category distribution data available</Text>
    )

    return renderMetricSection("Category Distribution", content, loading, error)
  }

  const renderComplexityAnalysis = () => {
    const { data, loading, error } = metrics.complexityAnalysis
    const COLORS = ['#CC0000', '#990000', '#660000']

    const content = data ? (
      <Stack spacing="md">
        <div style={{ height: 200 }}>
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
                      fill="var(--mantine-color-dimmed)"
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
                  backgroundColor: '#333333',
                  border: '1px solid #444444',
                  color: '#CCCCCC'
                }}
                labelStyle={{ color: '#CCCCCC' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <List styles={{ itemWrapper: { color: 'var(--mantine-color-dimmed)' } }}>
          <List.Item>Average Length: {data.statistics.average_length}</List.Item>
          <List.Item>Max Length: {data.statistics.max_length}</List.Item>
          <List.Item>Min Length: {data.statistics.min_length}</List.Item>
        </List>
      </Stack>
    ) : (
      <Text c="dimmed">No complexity analysis data available</Text>
    )

    return renderMetricSection("Complexity Analysis", content, loading, error)
  }

  const renderSystemSummary = () => {
    const { data, loading, error } = metrics.systemSummary

    const content = data ? (
      <Stack spacing="md">
        <Group position="apart">
          <div>
            <Text size="xl" weight={700} c="dimmed">{data.total_metrics.total_questions}</Text>
            <Text size="sm" c="dimmed">Total Questions</Text>
          </div>
          <div>
            <Text size="xl" weight={700} c="dimmed">{data.activity_metrics.last_24h_submissions}</Text>
            <Text size="sm" c="dimmed">Last 24h</Text>
          </div>
        </Group>
        <List styles={{ itemWrapper: { color: 'var(--mantine-color-dimmed)' } }}>
          <List.Item>Average Daily: {data.activity_metrics.average_daily_submissions}</List.Item>
          <List.Item>Days Active: {data.total_metrics.days_active}</List.Item>
          <List.Item>Last 7 Days: {data.activity_metrics.last_7d_submissions}</List.Item>
        </List>
      </Stack>
    ) : (
      <Text c="dimmed">No system summary data available</Text>
    )

    return renderMetricSection("System Summary", content, loading, error)
  }

  const renderReviewStatus = () => {
    const { data, loading, error } = metrics.reviewStatus
    const COLORS = {
      'In Review': '#FFD700',
      'Completed': '#00CC00',
      'Failed': '#CC0000',
      'Processing': '#666666'
    }

    const content = data ? (
      <Stack spacing="md">
        <Group position="apart">
          <div>
            <Text size="xl" weight={700} c="dimmed">{data.total_questionnaires}</Text>
            <Text size="sm" c="dimmed">Total Questionnaires</Text>
          </div>
          <div>
            <Text size="xl" weight={700} c="dimmed" color="yellow">{data.in_review}</Text>
            <Text size="sm" c="dimmed">In Review</Text>
          </div>
          <div>
            <Text size="xl" weight={700} c="dimmed" color="green">{data.completed}</Text>
            <Text size="sm" c="dimmed">Completed</Text>
          </div>
        </Group>

        <div style={{ height: 300 }}>
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
                tick={{ fill: 'var(--mantine-color-dimmed)' }}
              />
              <YAxis 
                tick={{ fill: 'var(--mantine-color-dimmed)' }}
                label={{ 
                  value: 'Number of Questionnaires',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--mantine-color-dimmed)',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#333333',
                  border: '1px solid #444444',
                  color: 'var(--mantine-color-dimmed)'
                }}
                labelStyle={{ color: 'var(--mantine-color-dimmed)' }}
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
      </Stack>
    ) : (
      <Text c="dimmed">No review status data available</Text>
    )

    return renderMetricSection("Review Status", content, loading, error)
  }

  return (
    <Container size="xl" py={40}>
      <Stack spacing={40}>
        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Metrics Dashboard</Title>
            <Text c="dimmed" size="lg">Knowledge Base Growth and Statistics</Text>
          </Stack>
        </Group>

        <Grid>
          <Grid.Col span={12}>
            <Paper p={40} radius="lg" withBorder>
              <Stack spacing="xl">
                <Title order={2} size={24}>Monthly Knowledge Base Entries</Title>
                {renderMonthlyChart()}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={12}>
            <Paper p={40} radius="lg" withBorder>
              <Stack spacing="xl">
                <Title order={2} size={24}>Category Distribution</Title>
                {renderCategoryDistribution()}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={6}>
            <Paper p={40} radius="lg" withBorder>
              <Stack spacing="xl">
                <Title order={2} size={24}>Question Complexity</Title>
                {renderComplexityAnalysis()}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={12}>
            <Paper p={40} radius="lg" withBorder>
              <Stack spacing="xl">
                <Title order={2} size={24}>Review Status</Title>
                {renderReviewStatus()}
              </Stack>
            </Paper>
          </Grid.Col>

          <Grid.Col span={12}>
            <Paper p={40} radius="lg" withBorder>
              <Stack spacing="xl">
                <Title order={2} size={24}>System Summary</Title>
                {renderSystemSummary()}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}

export default MetricsView 