import React, { useState, useEffect } from 'react'
import { Container, Title, Paper, Stack, Text, Group } from '@mantine/core'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function MetricsView() {
  const [monthlyData, setMonthlyData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        const response = await fetch('http://localhost:8000/metrics/monthly-entries')
        if (!response.ok) {
          throw new Error('Failed to fetch monthly metrics')
        }
        const data = await response.json()
        
        // Transform the data to include month names
        const transformedData = data.monthly_counts.map(entry => {
          const [year, month] = entry.month.split('-')
          const date = new Date(year, parseInt(month) - 1)
          return {
            month: date.toLocaleString('default', { month: 'short' }) + ' ' + year,
            count: entry.count
          }
        })
        
        setMonthlyData(transformedData)
      } catch (error) {
        console.error('Error fetching monthly metrics:', error)
        setError(error.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMonthlyData()
  }, [])

  return (
    <Container size="xl" py={40}>
      <Stack spacing={40}>
        <Group position="apart" align="center">
          <Stack spacing={4}>
            <Title order={1} size={32}>Metrics</Title>
            <Text c="dimmed" size="lg">Knowledge Base Growth and Statistics</Text>
          </Stack>
        </Group>

        <Paper p={40} radius="lg" withBorder>
          <Stack spacing="xl">
            <Title order={2} size={24}>Monthly Knowledge Base Entries</Title>
            {isLoading ? (
              <Text c="dimmed">Loading metrics...</Text>
            ) : error ? (
              <Text c="red">{error}</Text>
            ) : monthlyData.length === 0 ? (
              <Text c="dimmed">No data available</Text>
            ) : (
              <div style={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      fill="#228BE6"
                      name="Entries"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}

export default MetricsView 