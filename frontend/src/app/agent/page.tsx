'use client';

import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Ticket, 
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { Chat, Ticket as TicketType } from '@/types';
import Link from 'next/link';

export default function AgentDashboard() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chats');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chatsResponse, ticketsResponse] = await Promise.all([
        apiClient.getChats({ status: 'active', limit: 10 }),
        apiClient.getTickets({ status: 'open', limit: 10 })
      ]);

      if (chatsResponse.success) {
        setChats(chatsResponse.data.chats || []);
      }

      if (ticketsResponse.success) {
        setTickets(ticketsResponse.data.tickets || []);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignChat = async (chatId: number) => {
    try {
      const response = await apiClient.assignChat(chatId);
      if (response.success) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to assign chat:', error);
    }
  };

  const handleAssignTicket = async (ticketId: number) => {
    try {
      const response = await apiClient.assignTicket(ticketId);
      if (response.success) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center space-x-1">
            <Play className="w-3 h-3" />
            <span>Active</span>
          </Badge>
        );
      case 'waiting':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Pause className="w-3 h-3" />
            <span>Waiting</span>
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Closed</span>
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="default" className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>Open</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Resolved</span>
          </Badge>
        );
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
              {chat.customer?.first_name} {chat.customer?.last_name}
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
      key: 'created_at',
      title: 'Started',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, chat: Chat) => (
        <div className="flex items-center space-x-2">
          {chat.status === 'waiting' ? (
            <Button
              size="sm"
              onClick={() => handleAssignChat(chat.id)}
            >
              Take Chat
            </Button>
          ) : (
            <Link href={`/agent/chats/${chat.id}`}>
              <Button variant="outline" size="sm">
                View Chat
              </Button>
            </Link>
          )}
        </div>
      ),
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
              {ticket.customer?.first_name} {ticket.customer?.last_name}
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
      key: 'created_at',
      title: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, ticket: TicketType) => (
        <div className="flex items-center space-x-2">
          {!ticket.agent_id ? (
            <Button
              size="sm"
              onClick={() => handleAssignTicket(ticket.id)}
            >
              Take Ticket
            </Button>
          ) : (
            <Link href={`/agent/tickets/${ticket.id}`}>
              <Button variant="outline" size="sm">
                View Ticket
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Failed to load dashboard"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchData,
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
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Agent Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your chats and tickets
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/agent/tickets">
            <Button variant="outline" className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border-white/20 hover:bg-white/90">
              <Ticket className="w-4 h-4 mr-2" />
              All Tickets
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </motion.div>
              <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">{chats.length}</div>
                <div className="text-sm text-muted-foreground">Active Chats</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.08 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Ticket className="w-6 h-6 text-green-600" />
                </motion.div>
              <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">{tickets.length}</div>
                <div className="text-sm text-muted-foreground">Open Tickets</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Clock className="w-6 h-6 text-yellow-600" />
                </motion.div>
              <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">2m</div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.13 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <motion.div 
                  className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </motion.div>
              <div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">4.8</div>
                <div className="text-sm text-muted-foreground">Satisfaction</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      {/* Chats and Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Chats */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>Active Chats</span>
            </CardTitle>
            <CardDescription>
              Customer conversations that need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chats.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No active chats"
                description="Customer chats will appear here when they start conversations"
              />
            ) : (
              <DataTable
                data={chats}
                columns={chatColumns}
                searchable={false}
                filterable={false}
                pagination={undefined}
              />
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* Open Tickets */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Ticket className="w-5 h-5 text-green-600" />
              <span>Open Tickets</span>
            </CardTitle>
            <CardDescription>
              Support tickets that need to be resolved
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No open tickets"
                description="Support tickets will appear here when customers submit them"
              />
            ) : (
              <DataTable
                data={tickets}
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
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </motion.div>
              <span>All Chats</span>
            </CardTitle>
            <CardDescription>
              View all customer conversations
            </CardDescription>
          </CardHeader>
            <CardContent className="relative z-10">
            <Link href="/agent/chats">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <MessageSquare className="w-4 h-4 mr-2" />
                View All Chats
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
                  <Ticket className="w-5 h-5 text-green-600" />
                </motion.div>
              <span>All Tickets</span>
            </CardTitle>
            <CardDescription>
              Manage all support tickets
            </CardDescription>
          </CardHeader>
            <CardContent className="relative z-10">
            <Link href="/agent/tickets">
                <Button className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <Ticket className="w-4 h-4 mr-2" />
                View All Tickets
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
                  <Users className="w-5 h-5 text-purple-600" />
                </motion.div>
              <span>Settings</span>
            </CardTitle>
            <CardDescription>
              Configure your agent preferences
            </CardDescription>
          </CardHeader>
            <CardContent className="relative z-10">
            <Link href="/agent/settings">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <Users className="w-4 h-4 mr-2" />
                Agent Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  );
}
