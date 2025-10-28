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
  AlertCircle
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
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCompanyDashboard();
      
      if (response.success) {
        setStats(response.data);
        setRecentChats(response.data.recentChats || []);
        setRecentTickets(response.data.recentTickets || []);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'waiting':
        return <Badge variant="secondary">Waiting</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
      case 'open':
        return <Badge variant="default">Open</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'resolved':
        return <Badge variant="outline">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      render: (value: any, chat: Chat) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">
              {chat.customer?.name}
            </div>
            <div className="text-sm text-muted-foreground">{chat.customer?.email}</div>
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
      title: 'Started',
      render: (value: string) => new Date(value).toLocaleDateString(),
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
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[#EEF4ED] -z-10" />
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between backdrop-blur-xl bg-white/50 dark:bg-gray-900/50 rounded-2xl p-6 border border-white/20 shadow-lg"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of your company's support activity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/company/analytics">
            <Button variant="outline" className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border-white/20 hover:bg-white/90">
              <Eye className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Agents"
          value={stats?.totalAgents || 0}
          icon={Users}
          trend={{
            value: 5,
            label: 'this month',
            isPositive: true,
          }}
          delay={0}
        />
        <StatsCard
          title="Active Chats"
          value={stats?.activeChats || 0}
          icon={MessageSquare}
          trend={{
            value: -2,
            label: 'vs yesterday',
            isPositive: false,
          }}
          delay={0.1}
        />
        <StatsCard
          title="Total Tickets"
          value={stats?.totalTickets || 0}
          icon={Ticket}
          trend={{
            value: 12,
            label: 'this week',
            isPositive: true,
          }}
          delay={0.2}
        />
        <StatsCard
          title="Total Messages"
          value={stats?.totalMessages || 0}
          icon={TrendingUp}
          trend={{
            value: 8,
            label: 'this month',
            isPositive: true,
          }}
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
          <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl">Recent Chats</CardTitle>
              <CardDescription>
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
          <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
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
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Users className="w-5 h-5 text-blue-600" />
                </motion.div>
                <span>Manage Agents</span>
              </CardTitle>
              <CardDescription>
                Add, edit, and manage your support agents
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Link href="/company/agents">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
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
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </motion.div>
                <span>Widget Settings</span>
              </CardTitle>
              <CardDescription>
                Customize your chat widget appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Link href="/company/widget">
                <Button className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Eye className="w-4 h-4 mr-2" />
                  Configure Widget
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
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </motion.div>
                <span>Analytics</span>
              </CardTitle>
              <CardDescription>
                View detailed performance metrics and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Link href="/company/analytics">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Eye className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  );
}
