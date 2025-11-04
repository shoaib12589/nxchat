'use client';

import React, { useEffect, useState } from 'react';
import { StatsCard } from '@/components/shared/StatsCard';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageSquare, 
  Ticket, 
  TrendingUp,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Bot,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { DashboardStats, Chat, Ticket as TicketType } from '@/types';
import Link from 'next/link';

export default function CompanyDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates (poll every 30 seconds - silent refresh)
    const interval = setInterval(() => {
      fetchDashboardData(false); // Silent refresh without loading indicator
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await apiClient.getCompanyDashboard();
      
      if (response.success) {
        setStats(response.data);
        const chats = response.data.recentChats || [];
        const tickets = response.data.recentTickets || [];
        setRecentChats(chats);
        setRecentTickets(tickets);
        setError(null);
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch dashboard data');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'waiting':
        return <Badge variant="secondary">Waiting</Badge>;
      case 'closed':
      case 'completed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Completed</Badge>;
      case 'open':
        return <Badge variant="default">Open</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const chatColumns = [
    {
      key: 'customer',
      title: 'Customer',
      render: (value: any, chat: Chat) => {
        // Use customer from User model if available, otherwise use customer_name/customer_email from Chat
        const customerName = chat.customer?.name || (chat as any).customer_name || 'Unknown';
        const customerEmail = chat.customer?.email || (chat as any).customer_email || '-';
        
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="font-medium text-sm text-gray-900">
                {customerName}
              </div>
              <div className="text-xs text-gray-500">{customerEmail}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string, chat: Chat) => getStatusBadge(chat.status || value || 'waiting'),
    },
    {
      key: 'agent',
      title: 'Agent',
      render: (value: any, chat: Chat) => chat.agent ? chat.agent.name : 'Unassigned',
    },
    {
      key: 'started_at',
      title: 'Started',
      render: (value: any, chat: Chat) => {
        const dateStr = chat.started_at || chat.created_at;
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      },
    },
  ];

  const ticketColumns = [
    {
      key: 'subject',
      title: 'Subject',
      render: (value: string, ticket: TicketType) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Ticket className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">
              {ticket.customer?.name}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'priority',
      title: 'Priority',
      render: (value: string) => getPriorityBadge(value),
    },
    {
      key: 'agent',
      title: 'Agent',
      render: (value: any) => value ? value.name : 'Unassigned',
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Failed to load dashboard"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchDashboardData,
        }}
      />
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between bg-white rounded-lg p-6 border border-gray-200 shadow-sm"
      >
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
          <p className="text-muted-foreground mt-2">
            Overview of your company's support activity • Updates every 30 seconds
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => fetchDashboardData(true)}
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/company/analytics">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Agents"
          value={stats?.totalAgents || 0}
          icon={Users}
          delay={0}
        />
        <StatsCard
          title="Active Chats"
          value={stats?.activeChats || 0}
          icon={MessageSquare}
          trend={stats?.trends?.chats ? {
            value: Math.abs(stats.trends.chats),
            label: 'vs last month',
            isPositive: stats.trends.chats > 0,
          } : undefined}
          delay={0.1}
        />
        <StatsCard
          title="Total Tickets"
          value={stats?.totalTickets || 0}
          icon={Ticket}
          trend={stats?.trends?.tickets ? {
            value: Math.abs(stats.trends.tickets),
            label: 'vs last month',
            isPositive: stats.trends.tickets > 0,
          } : undefined}
          delay={0.2}
        />
        <StatsCard
          title="Total Messages"
          value={stats?.totalMessages || 0}
          icon={TrendingUp}
          delay={0.3}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Chats */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-base">Recent Chats</CardTitle>
              <CardDescription className="text-sm">
                Latest customer conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentChats.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No recent chats"
                  description="Customer chats will appear here"
                />
              ) : (
                <DataTable
                  data={recentChats}
                  columns={chatColumns}
                  searchable={false}
                  filterable={false}
                  pagination={undefined}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Tickets */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-2xl">Recent Tickets</CardTitle>
              <CardDescription>
                Latest support tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTickets.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No recent tickets"
                  description="Support tickets will appear here"
                />
              ) : (
                <DataTable
                  data={recentTickets}
                  columns={ticketColumns}
                  searchable={false}
                  filterable={false}
                  pagination={undefined}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Users className="w-5 h-5 text-gray-700" />
                <span>Manage Agents</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Add, edit, and manage your support agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/company/agents">
                <Button className="w-full" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Manage Agents
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <MessageSquare className="w-5 h-5 text-gray-700" />
                <span>Brand Settings</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Manage brands and configure widget settings per brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/company/brands">
                <Button className="w-full" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Manage Brands
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <TrendingUp className="w-5 h-5 text-gray-700" />
                <span>Analytics</span>
              </CardTitle>
              <CardDescription className="text-sm">
                View detailed performance metrics and reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/company/analytics">
                <Button className="w-full" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Avg Response Time"
          value={`${stats?.averageResponseTime || 120}s`}
          icon={Clock}
          description="Time to first response"
          delay={0.6}
        />
        <StatsCard
          title="Customer Satisfaction"
          value={`${stats?.customerSatisfaction || 4.2}/5`}
          icon={CheckCircle}
          description="Average rating"
          delay={0.7}
        />
        <StatsCard
          title="Active Agents"
          value={stats?.activeAgents || 0}
          icon={Users}
          description="Currently online"
          delay={0.8}
        />
      </div>

      {/* AI Messages Usage - Real-time Tracking */}
      {stats?.aiMessages && (
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Bot className="w-5 h-5 text-gray-700" />
              <span>AI Messages Usage</span>
              {stats.aiMessages.usagePercentage >= 80 && (
                <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" />
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              Real-time tracking of AI message usage vs plan limit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.aiMessages.used.toLocaleString()} / {stats.aiMessages.limit === -1 ? '∞' : stats.aiMessages.limit.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.aiMessages.limit === -1 
                      ? 'Unlimited plan' 
                      : `${stats.aiMessages.usagePercentage}% of limit used`
                    }
                  </p>
                </div>
                {stats.aiMessages.limit !== -1 && (
                  <div className={`text-right ${
                    stats.aiMessages.usagePercentage >= 90 
                      ? 'text-red-600' 
                      : stats.aiMessages.usagePercentage >= 80 
                        ? 'text-amber-600' 
                        : 'text-gray-600'
                  }`}>
                    <p className="text-3xl font-bold">
                      {stats.aiMessages.usagePercentage}%
                    </p>
                  </div>
                )}
              </div>
              {stats.aiMessages.limit !== -1 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        stats.aiMessages.usagePercentage >= 90
                          ? 'bg-red-500'
                          : stats.aiMessages.usagePercentage >= 80
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(stats.aiMessages.usagePercentage, 100)}%` }}
                    />
                  </div>
                  {stats.aiMessages.usagePercentage >= 80 && (
                    <div className={`flex items-center space-x-2 text-sm ${
                      stats.aiMessages.usagePercentage >= 90 ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        {stats.aiMessages.usagePercentage >= 90
                          ? 'Critical: Approaching limit'
                          : 'Warning: Near limit'
                        }
                      </span>
                    </div>
                  )}
                  {stats.aiMessages.limit > 0 && (
                    <p className="text-xs text-gray-500">
                      {stats.aiMessages.limit - stats.aiMessages.used > 0
                        ? `${(stats.aiMessages.limit - stats.aiMessages.used).toLocaleString()} messages remaining`
                        : 'Limit reached'
                      }
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
