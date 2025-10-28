'use client';

import React, { useEffect, useState } from 'react';
import { StatsCard } from '@/components/shared/StatsCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building2, 
  MessageSquare,
  DollarSign,
  Calendar,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import apiClient from '@/lib/api';
import { AnalyticsData } from '@/types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAnalytics(period);
      
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts (in real app, this would come from the API)
  const chartData = [
    { name: 'Jan', companies: 12, users: 45, chats: 120 },
    { name: 'Feb', companies: 18, users: 67, chats: 180 },
    { name: 'Mar', companies: 25, users: 89, chats: 250 },
    { name: 'Apr', companies: 32, users: 112, chats: 320 },
    { name: 'May', companies: 38, users: 134, chats: 380 },
    { name: 'Jun', companies: 45, users: 156, chats: 450 },
  ];

  const pieData = [
    { name: 'Active Companies', value: analytics?.newCompanies || 0 },
    { name: 'Pending Companies', value: 5 },
    { name: 'Suspended Companies', value: 2 },
  ];

  const responseTimeData = [
    { name: 'Mon', time: 120 },
    { name: 'Tue', time: 95 },
    { name: 'Wed', time: 110 },
    { name: 'Thu', time: 85 },
    { name: 'Fri', time: 100 },
    { name: 'Sat', time: 90 },
    { name: 'Sun', time: 105 },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading analytics..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Failed to load analytics"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchAnalytics,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Platform performance and usage statistics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 hours</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="year">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="New Companies"
          value={analytics?.newCompanies || 0}
          icon={Building2}
          trend={{
            value: 12,
            label: `vs last ${period}`,
            isPositive: true,
          }}
          delay={0}
        />
        <StatsCard
          title="New Users"
          value={analytics?.newUsers || 0}
          icon={Users}
          trend={{
            value: 8,
            label: `vs last ${period}`,
            isPositive: true,
          }}
          delay={0.1}
        />
        <StatsCard
          title="Total Chats"
          value={analytics?.totalChats || 0}
          icon={MessageSquare}
          trend={{
            value: 15,
            label: `vs last ${period}`,
            isPositive: true,
          }}
          delay={0.2}
        />
        <StatsCard
          title="Total Messages"
          value={analytics?.totalMessages || 0}
          icon={Activity}
          trend={{
            value: 22,
            label: `vs last ${period}`,
            isPositive: true,
          }}
          delay={0.3}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Growth Over Time</CardTitle>
            <CardDescription>
              Companies, users, and chats growth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="companies"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                />
                <Area
                  type="monotone"
                  dataKey="chats"
                  stackId="1"
                  stroke="#ffc658"
                  fill="#ffc658"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Company Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Company Distribution</CardTitle>
            <CardDescription>
              Companies by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time */}
        <Card>
          <CardHeader>
            <CardTitle>Average Response Time</CardTitle>
            <CardDescription>
              Daily average response time in seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Satisfaction */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Satisfaction</CardTitle>
            <CardDescription>
              Average satisfaction score: {analytics?.customerSatisfaction || 4.2}/5
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Excellent (5)</span>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">45%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Good (4)</span>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average (3)</span>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Poor (2)</span>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Very Poor (1)</span>
                <div className="w-32 bg-muted rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '2%' }}></div>
                </div>
                <span className="text-sm text-muted-foreground">2%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Average Response Time"
          value={`${analytics?.averageResponseTime || 120}s`}
          icon={Activity}
          description="Time to first response"
          delay={0.4}
        />
        <StatsCard
          title="Customer Satisfaction"
          value={`${analytics?.customerSatisfaction || 4.2}/5`}
          icon={TrendingUp}
          description="Average rating"
          delay={0.5}
        />
        <StatsCard
          title="Revenue"
          value={`$${analytics?.revenue || 0}`}
          icon={DollarSign}
          description="Monthly recurring revenue"
          delay={0.6}
        />
      </div>
    </div>
  );
}
