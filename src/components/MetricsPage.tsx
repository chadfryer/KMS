/// <reference types="react" />
import React from 'react';
import type { FC } from 'react';
import { MantineProvider, Container, Title, Group, Paper, Stack, Text } from '@mantine/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { theme } from '../mantine.config';

// Import type declarations
import '../types/mantine';
import '../types/recharts';
import '../types/global';

// Add HTML element types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
    }
  }
}

interface MetricsData {
  monthlyEntries?: {
    monthly_counts: Array<{
      month: string;
      count: number;
    }>;
  };
  categoryDistribution?: {
    category_distribution: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    total_questions: number;
  };
  dailyTrends?: {
    daily_counts: Array<{
      date: string;
      count: number;
    }>;
    statistics: {
      average_daily: number;
      maximum_daily: number;
      minimum_daily: number;
      total_days: number;
      total_submissions: number;
    };
  };
  complexityAnalysis?: {
    complexity_distribution: {
      counts: {
        Simple: number;
        Moderate: number;
        Complex: number;
      };
      percentages: {
        Simple: number;
        Moderate: number;
        Complex: number;
      };
    };
    statistics: {
      average_length: number;
      max_length: number;
      min_length: number;
      total_questions: number;
    };
  };
  confidenceDistribution?: {
    confidence_distribution: {
      counts: {
        [key: string]: number;
      };
      percentages: {
        [key: string]: number;
      };
    };
    statistics: {
      total_processed: number;
      average_confidence: number;
      highest_confidence: number;
      lowest_confidence: number;
    };
  };
  systemSummary?: {
    total_metrics: {
      total_questions: number;
      days_active: number;
    };
    activity_metrics: {
      last_24h_submissions: number;
      last_7d_submissions: number;
      average_daily_submissions: number;
    };
    timeline_metrics: {
      first_entry: string;
      latest_entry: string;
    };
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const LoadingSpinner: FC = () => {
  return <div className="flex justify-center items-center h-screen">Loading metrics...</div>;
};

const ErrorMessage: FC<{ message: string }> = ({ message }) => {
  return <div className="text-red-500 text-center p-4">{message}</div>;
};

const MetricsPage: FC = () => {
  const [metrics, setMetrics] = React.useState<MetricsData>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const endpoints = [
          'monthly-entries',
          'category-distribution',
          'daily-trends',
          'complexity-analysis',
          'confidence-distribution',
          'system-summary'
        ];

        const results = await Promise.all(
          endpoints.map(endpoint =>
            fetch(`/metrics/${endpoint}`).then(res => res.json())
          )
        );

        setMetrics({
          monthlyEntries: results[0],
          categoryDistribution: results[1],
          dailyTrends: results[2],
          complexityAnalysis: results[3],
          confidenceDistribution: results[4],
          systemSummary: results[5]
        });
      } catch (err) {
        setError('Failed to fetch metrics data');
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <MantineProvider theme={theme}>
      <Container>
        <Stack>
          <Title>System Metrics Dashboard</Title>

          {/* System Summary */}
          <Group grow>
            <Paper>
              <Group position="apart">
                <Title order={2}>Total Metrics</Title>
              </Group>
              <Stack>
                <Group>
                  <Text size="xl">{metrics.systemSummary?.total_metrics.total_questions}</Text>
                  <Text>Total Questions</Text>
                </Group>
                <Group>
                  <Text size="xl">{metrics.systemSummary?.total_metrics.days_active}</Text>
                  <Text>Days Active</Text>
                </Group>
              </Stack>
            </Paper>
            <Paper>
              <Group position="apart">
                <Title order={2}>Recent Activity</Title>
              </Group>
              <Stack>
                <Group>
                  <Text size="xl">{metrics.systemSummary?.activity_metrics.last_24h_submissions}</Text>
                  <Text>Last 24 Hours</Text>
                </Group>
                <Group>
                  <Text size="xl">{metrics.systemSummary?.activity_metrics.last_7d_submissions}</Text>
                  <Text>Last 7 Days</Text>
                </Group>
                <Group>
                  <Text size="xl">{metrics.systemSummary?.activity_metrics.average_daily_submissions}</Text>
                  <Text>Average Daily</Text>
                </Group>
              </Stack>
            </Paper>
            <Paper>
              <Group position="apart">
                <Title order={2}>Timeline</Title>
              </Group>
              <Stack>
                <Group>
                  <Text size="xl">
                    {new Date(metrics.systemSummary?.timeline_metrics.first_entry || '').toLocaleDateString()}
                  </Text>
                  <Text>First Entry</Text>
                </Group>
                <Group>
                  <Text size="xl">
                    {new Date(metrics.systemSummary?.timeline_metrics.latest_entry || '').toLocaleDateString()}
                  </Text>
                  <Text>Latest Entry</Text>
                </Group>
              </Stack>
            </Paper>
          </Group>

          {/* Monthly Submissions Trend */}
          <Paper>
            <Group position="apart">
              <Title order={2}>Monthly Submissions Trend</Title>
            </Group>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.monthlyEntries?.monthly_counts || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip 
                    wrapperStyle={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 600, marginBottom: '0.5rem' }}
                    formatter={(value: number) => [`${value} submissions`, 'Count']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" name="Submissions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Paper>

          {/* Entity Distribution and Complexity Analysis */}
          <Group grow>
            <Paper>
              <Group position="apart">
                <Title order={2}>Category Distribution</Title>
              </Group>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.categoryDistribution?.category_distribution || []}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props: { payload: { category: string; percentage: number } }) => 
                        `${props.payload.category} (${props.payload.percentage.toFixed(2)}%)`
                      }
                    >
                      {(metrics.categoryDistribution?.category_distribution || []).map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Paper>

            <Paper>
              <Group position="apart">
                <Title order={2}>Question Complexity</Title>
              </Group>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(metrics.complexityAnalysis?.complexity_distribution.counts || {}).map(([key, value]) => ({
                    name: key,
                    count: value
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip 
                      wrapperStyle={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}
                      formatter={(value: any) => [`${value} questions`, 'Count']}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#8884d8" name="Questions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Paper>
          </Group>

          {/* Confidence Distribution */}
          <Paper>
            <Group position="apart">
              <Title order={2}>Answer Confidence Distribution</Title>
            </Group>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(metrics.confidenceDistribution?.confidence_distribution.counts || {}).map(([key, value]) => ({
                  name: key,
                  count: value
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip 
                    wrapperStyle={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}
                    formatter={(value: any) => [`${value} answers`, 'Count']}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="#00C49F" name="Answers" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Group>
                <Text size="xl">{metrics.confidenceDistribution?.statistics.total_processed}</Text>
                <Text>Total Processed</Text>
              </Group>
              <Group>
                <Text size="xl">{metrics.confidenceDistribution?.statistics.average_confidence}%</Text>
                <Text>Average Confidence</Text>
              </Group>
              <Group>
                <Text size="xl">{metrics.confidenceDistribution?.statistics.highest_confidence}%</Text>
                <Text>Highest Confidence</Text>
              </Group>
              <Group>
                <Text size="xl">{metrics.confidenceDistribution?.statistics.lowest_confidence}%</Text>
                <Text>Lowest Confidence</Text>
              </Group>
            </div>
          </Paper>

          {/* Daily Trends */}
          <Paper>
            <Group position="apart">
              <Title order={2}>Daily Submission Trends</Title>
            </Group>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.dailyTrends?.daily_counts || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip 
                    wrapperStyle={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}
                    formatter={(value: number) => [`${value} submissions`, 'Count']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#00C49F" name="Daily Submissions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Group>
                <Text size="xl">{metrics.dailyTrends?.statistics.average_daily}</Text>
                <Text>Average</Text>
              </Group>
              <Group>
                <Text size="xl">{metrics.dailyTrends?.statistics.maximum_daily}</Text>
                <Text>Maximum</Text>
              </Group>
              <Group>
                <Text size="xl">{metrics.dailyTrends?.statistics.minimum_daily}</Text>
                <Text>Minimum</Text>
              </Group>
              <Group>
                <Text size="xl">{metrics.dailyTrends?.statistics.total_submissions}</Text>
                <Text>Total</Text>
              </Group>
            </div>
          </Paper>
        </Stack>
      </Container>
    </MantineProvider>
  );
};

export default MetricsPage; 