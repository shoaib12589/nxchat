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
  MessageSquare,
  Ticket,
  Clock,
  CheckCircle,
  Calendar,
  Activity,
  ArrowLeft,
  Globe,
  MapPin
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
  Legend,
  ComposedChart,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface ChartDataPoint {
  name: string;
  chats?: number;
  messages?: number;
  time?: number;
}

interface AgentPerformanceData {
  name: string;
  chats: number;
  response: number;
}

interface StatusDistributionData {
  name: string;
  value: number;
}

interface CompanyAnalyticsData {
  period: string;
  totalChats: number;
  totalMessages: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  activeAgents: number;
  totalVisitors?: number;
  visitorToChatConversion?: number;
  chatCompletionRate?: number;
  avgSessionDuration?: number;
  avgMessagesPerChat?: number;
  avgResolutionTime?: number;
  charts?: {
    chatsOverTime: ChartDataPoint[];
    responseTimeOverTime: ChartDataPoint[];
    statusDistribution: StatusDistributionData[];
    agentPerformance: AgentPerformanceData[];
    countryDistribution: StatusDistributionData[];
    cityDistribution: StatusDistributionData[];
    trafficSourceDistribution?: StatusDistributionData[];
    trafficMediumDistribution?: StatusDistributionData[];
    referrerDistribution?: StatusDistributionData[];
    deviceTypeDistribution?: StatusDistributionData[];
    browserDistribution?: StatusDistributionData[];
    osDistribution?: StatusDistributionData[];
    hourlyActivity?: any[];
    dayOfWeekActivity?: any[];
    sessionDurationDistribution?: StatusDistributionData[];
    ticketStatusDistribution?: StatusDistributionData[];
    departmentPerformance?: AgentPerformanceData[];
  };
}

export default function CompanyAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CompanyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCompanyAnalytics(period);
      
      if (response.success) {
        setAnalytics(response.data);
        setError(null);
      } else {
        setError(response.message || 'Failed to fetch analytics');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  // Use real data from API, fallback to empty arrays if not available
  const chatsOverTimeData = analytics?.charts?.chatsOverTime || [];
  const responseTimeData = analytics?.charts?.responseTimeOverTime || [];
  const statusDistributionData = analytics?.charts?.statusDistribution || [];
  const agentPerformanceData = analytics?.charts?.agentPerformance || [];
  const countryDistributionData = analytics?.charts?.countryDistribution || [];
  const cityDistributionData = analytics?.charts?.cityDistribution || [];
  const trafficSourceData = analytics?.charts?.trafficSourceDistribution || [];
  const trafficMediumData = analytics?.charts?.trafficMediumDistribution || [];
  const referrerData = analytics?.charts?.referrerDistribution || [];
  const deviceTypeData = analytics?.charts?.deviceTypeDistribution || [];
  const browserData = analytics?.charts?.browserDistribution || [];
  const osData = analytics?.charts?.osDistribution || [];
  const hourlyActivityData = analytics?.charts?.hourlyActivity || [];
  const dayOfWeekData = analytics?.charts?.dayOfWeekActivity || [];
  const sessionDurationData = analytics?.charts?.sessionDurationDistribution || [];
  const ticketStatusData = analytics?.charts?.ticketStatusDistribution || [];
  const departmentData = analytics?.charts?.departmentPerformance || [];

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
          <div className="flex items-center gap-4 mb-2">
            <Link href="/company">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Detailed performance metrics and reports
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
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Visitors"
          value={analytics?.totalVisitors || 0}
          icon={Users}
          delay={0}
        />
        <StatsCard
          title="Total Chats"
          value={analytics?.totalChats || 0}
          icon={MessageSquare}
          delay={0.1}
        />
        <StatsCard
          title="Total Messages"
          value={analytics?.totalMessages || 0}
          icon={Activity}
          delay={0.2}
        />
        <StatsCard
          title="Visitor to Chat"
          value={`${analytics?.visitorToChatConversion || 0}%`}
          icon={TrendingUp}
          description="Conversion rate"
          delay={0.3}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Avg Response Time"
          value={`${analytics?.averageResponseTime || 120}s`}
          icon={Clock}
          description="Time to first response"
          delay={0.4}
        />
        <StatsCard
          title="Avg Resolution Time"
          value={`${analytics?.avgResolutionTime || 0}min`}
          icon={CheckCircle}
          description="Chat completion time"
          delay={0.5}
        />
        <StatsCard
          title="Customer Satisfaction"
          value={`${analytics?.customerSatisfaction || 4.2}/5`}
          icon={CheckCircle}
          description="Average rating"
          delay={0.6}
        />
        <StatsCard
          title="Chat Completion"
          value={`${analytics?.chatCompletionRate || 0}%`}
          icon={Ticket}
          description="Resolved chats"
          delay={0.7}
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Avg Session Duration"
          value={`${Math.floor((analytics?.avgSessionDuration || 0) / 60)}min ${(analytics?.avgSessionDuration || 0) % 60}s`}
          icon={Clock}
          delay={0.8}
        />
        <StatsCard
          title="Messages per Chat"
          value={analytics?.avgMessagesPerChat || 0}
          icon={MessageSquare}
          delay={0.9}
        />
        <StatsCard
          title="Active Agents"
          value={analytics?.activeAgents || 0}
          icon={Users}
          delay={1}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic & Sources</TabsTrigger>
          <TabsTrigger value="devices">Devices & Browsers</TabsTrigger>
          <TabsTrigger value="patterns">Activity Patterns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chats Over Time */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Chats & Messages Over Time</CardTitle>
            <CardDescription className="text-sm">
              Activity trends for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chatsOverTimeData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                No data available for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chatsOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="chats" 
                  stackId="1" 
                  stroke="#0088FE" 
                  fill="#0088FE" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="messages" 
                  stackId="2" 
                  stroke="#00C49F" 
                  fill="#00C49F" 
                  fillOpacity={0.6}
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Response Time Trend */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Response Time Trend</CardTitle>
            <CardDescription className="text-sm">
              Average response time over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responseTimeData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                No data available for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                  formatter={(value: any) => `${value}s`}
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                  dot={{ fill: '#0088FE', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Chat Status Distribution</CardTitle>
            <CardDescription className="text-sm">
              Overview of chat statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistributionData.length === 0 || statusDistributionData.reduce((sum, item) => sum + item.value, 0) === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                No data available for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                <Pie
                  data={statusDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Agent Performance</CardTitle>
            <CardDescription className="text-sm">
              Chats handled and response times
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agentPerformanceData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                No agent performance data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agentPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                  formatter={(value: any, name: string) => 
                    name === 'response' ? `${value}s` : value
                  }
                />
                <Bar yAxisId="left" dataKey="chats" fill="#0088FE" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="response" fill="#00C49F" radius={[4, 4, 0, 0]} />
                <Legend 
                  formatter={(value) => value === 'response' ? 'Avg Response (s)' : 'Chats Handled'}
                />
              </BarChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
          </div>

          {/* Location Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Country Distribution */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Globe className="w-5 h-5 text-gray-700" />
              <span>Top Countries</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Visitor distribution by country
            </CardDescription>
          </CardHeader>
          <CardContent>
            {countryDistributionData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                No location data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countryDistributionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#6b7280" 
                    fontSize={12}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* City Distribution */}
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-700" />
              <span>Top Cities</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Visitor distribution by city
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cityDistributionData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                No location data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cityDistributionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#6b7280" 
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" fill="#00C49F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        {/* Traffic & Sources Tab */}
        <TabsContent value="traffic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Traffic Sources */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Traffic Sources</CardTitle>
                <CardDescription className="text-sm">Where visitors come from</CardDescription>
              </CardHeader>
              <CardContent>
                {trafficSourceData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                    No traffic source data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={trafficSourceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={100} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Traffic Medium */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Traffic Medium</CardTitle>
                <CardDescription className="text-sm">Organic, social, referral, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                {trafficMediumData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                    No traffic medium data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={trafficMediumData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {trafficMediumData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Referrers */}
            <Card className="bg-white border border-gray-200 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Top Referrers</CardTitle>
                <CardDescription className="text-sm">Most popular referring domains</CardDescription>
              </CardHeader>
              <CardContent>
                {referrerData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                    No referrer data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={referrerData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Bar dataKey="value" fill="#00C49F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Devices & Browsers Tab */}
        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Device Types */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceTypeData.length === 0 ? (
                  <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
                    No device data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={deviceTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deviceTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Browsers */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Browsers</CardTitle>
              </CardHeader>
              <CardContent>
                {browserData.length === 0 ? (
                  <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
                    No browser data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={browserData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Bar dataKey="value" fill="#FF8042" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Operating Systems */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Operating Systems</CardTitle>
              </CardHeader>
              <CardContent>
                {osData.length === 0 ? (
                  <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
                    No OS data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={osData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Bar dataKey="value" fill="#FFBB28" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hourly Activity */}
            <Card className="bg-white border border-gray-200 shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Hourly Activity Pattern</CardTitle>
                <CardDescription className="text-sm">Activity breakdown by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                {hourlyActivityData.length === 0 ? (
                  <div className="flex items-center justify-center h-[350px] text-gray-500 text-sm">
                    No hourly data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={hourlyActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="visitors" fill="#8884D8" name="Visitors" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="chats" fill="#0088FE" name="Chats" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="messages" stroke="#00C49F" strokeWidth={2} name="Messages" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Day of Week Activity */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Day of Week Activity</CardTitle>
                <CardDescription className="text-sm">Activity breakdown by day</CardDescription>
              </CardHeader>
              <CardContent>
                {dayOfWeekData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                    No day data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={dayOfWeekData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="visitors" fill="#8884D8" name="Visitors" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="chats" fill="#0088FE" name="Chats" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="messages" stroke="#00C49F" strokeWidth={2} name="Messages" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Session Duration */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Session Duration</CardTitle>
                <CardDescription className="text-sm">How long visitors stay</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionDurationData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
                    No session data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sessionDurationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Bar dataKey="value" fill="#FF8042" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ticket Status */}
            {ticketStatusData.length > 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Ticket Status</CardTitle>
                  <CardDescription className="text-sm">Ticket status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={ticketStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ticketStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Department Performance */}
            {departmentData.length > 0 && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Department Performance</CardTitle>
                  <CardDescription className="text-sm">Chats handled by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={12} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }} />
                      <Bar dataKey="chats" fill="#0088FE" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-700" />
              <span>Active Agents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics?.activeAgents || 0}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Currently online and available
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <span>Performance Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="text-sm font-semibold text-gray-900">
                  {analytics?.averageResponseTime || 120}s
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Satisfaction Rate</span>
                <span className="text-sm font-semibold text-gray-900">
                  {analytics?.customerSatisfaction || 4.2}/5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Chats</span>
                <span className="text-sm font-semibold text-gray-900">
                  {analytics?.totalChats || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Messages</span>
                <span className="text-sm font-semibold text-gray-900">
                  {analytics?.totalMessages || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

