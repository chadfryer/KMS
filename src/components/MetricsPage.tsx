import React, { useEffect, useState } from 'react';
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface MetricsData {
  monthlyEntries?: {
    monthly_counts: Array<{
      month: string;
      count: number;
    }>;
  };
  entityDistribution?: {
    entity_distribution: Array<{
      entity: string;
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
      total_entities: number;
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

const MetricsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const endpoints = [
          'monthly-entries',
          'entity-distribution',
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
          entityDistribution: results[1],
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
    return <div className="flex justify-center items-center h-screen">Loading metrics...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-shadow">System Metrics Dashboard</h1>

      {/* System Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <h2 className="card-title">Total Metrics</h2>
          <div className="space-y-3">
            <div>
              <div className="metric-value">{metrics.systemSummary?.total_metrics.total_questions}</div>
              <div className="metric-label">Total Questions</div>
            </div>
            <div>
              <div className="metric-value">{metrics.systemSummary?.total_metrics.total_entities}</div>
              <div className="metric-label">Total Entities</div>
            </div>
            <div>
              <div className="metric-value">{metrics.systemSummary?.total_metrics.days_active}</div>
              <div className="metric-label">Days Active</div>
            </div>
          </div>
        </div>
        <div className="card">
          <h2 className="card-title">Recent Activity</h2>
          <div className="space-y-3">
            <div>
              <div className="metric-value">{metrics.systemSummary?.activity_metrics.last_24h_submissions}</div>
              <div className="metric-label">Last 24 Hours</div>
            </div>
            <div>
              <div className="metric-value">{metrics.systemSummary?.activity_metrics.last_7d_submissions}</div>
              <div className="metric-label">Last 7 Days</div>
            </div>
            <div>
              <div className="metric-value">{metrics.systemSummary?.activity_metrics.average_daily_submissions}</div>
              <div className="metric-label">Average Daily</div>
            </div>
          </div>
        </div>
        <div className="card">
          <h2 className="card-title">Timeline</h2>
          <div className="space-y-3">
            <div>
              <div className="metric-value">
                {new Date(metrics.systemSummary?.timeline_metrics.first_entry || '').toLocaleDateString()}
              </div>
              <div className="metric-label">First Entry</div>
            </div>
            <div>
              <div className="metric-value">
                {new Date(metrics.systemSummary?.timeline_metrics.latest_entry || '').toLocaleDateString()}
              </div>
              <div className="metric-label">Latest Entry</div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Submissions Trend */}
      <div className="card mb-8">
        <h2 className="card-title">Monthly Submissions Trend</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.monthlyEntries?.monthly_counts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#8884d8" name="Submissions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Entity Distribution and Complexity Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="card-title">Entity Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.entityDistribution?.entity_distribution}
                  dataKey="count"
                  nameKey="entity"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {metrics.entityDistribution?.entity_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Question Complexity</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Object.entries(metrics.complexityAnalysis?.complexity_distribution.counts || {}).map(([key, value]) => ({
                name: key,
                count: value
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Questions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confidence Distribution */}
      <div className="card mb-8">
        <h2 className="card-title">Answer Confidence Distribution</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.entries(metrics.confidenceDistribution?.confidence_distribution.counts || {}).map(([key, value]) => ({
              name: key,
              count: value
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#00C49F" name="Answers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="metric-value">{metrics.confidenceDistribution?.statistics.total_processed}</div>
            <div className="metric-label">Total Processed</div>
          </div>
          <div>
            <div className="metric-value">{metrics.confidenceDistribution?.statistics.average_confidence}%</div>
            <div className="metric-label">Average Confidence</div>
          </div>
          <div>
            <div className="metric-value">{metrics.confidenceDistribution?.statistics.highest_confidence}%</div>
            <div className="metric-label">Highest Confidence</div>
          </div>
          <div>
            <div className="metric-value">{metrics.confidenceDistribution?.statistics.lowest_confidence}%</div>
            <div className="metric-label">Lowest Confidence</div>
          </div>
        </div>
      </div>

      {/* Daily Trends */}
      <div className="card">
        <h2 className="card-title">Daily Submission Trends</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics.dailyTrends?.daily_counts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#00C49F" name="Daily Submissions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="metric-value">{metrics.dailyTrends?.statistics.average_daily}</div>
            <div className="metric-label">Average</div>
          </div>
          <div>
            <div className="metric-value">{metrics.dailyTrends?.statistics.maximum_daily}</div>
            <div className="metric-label">Maximum</div>
          </div>
          <div>
            <div className="metric-value">{metrics.dailyTrends?.statistics.minimum_daily}</div>
            <div className="metric-label">Minimum</div>
          </div>
          <div>
            <div className="metric-value">{metrics.dailyTrends?.statistics.total_submissions}</div>
            <div className="metric-label">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPage; 