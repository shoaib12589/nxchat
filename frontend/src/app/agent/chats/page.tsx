'use client';

import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Users
} from 'lucide-react';
import apiClient from '@/lib/api';
import { Chat } from '@/types';
import Link from 'next/link';

export default function AgentChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getChats({ limit: 100 });
      
      if (response.success) {
        setChats(response.data.chats || []);
      } else {
        setError(response.message || 'Failed to fetch chats');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignChat = async (chatId: number) => {
    try {
      const response = await apiClient.assignChat(chatId);
      if (response.success) {
        fetchChats(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to assign chat:', error);
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
      case 'inactive':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Pause className="w-3 h-3" />
            <span>Inactive</span>
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Closed</span>
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Ended</span>
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
          ) : ['active', 'inactive'].includes(chat.status) ? (
            <Link href={`/agent/chats/${chat.id}`}>
              <Button variant="outline" size="sm">
                View Chat
              </Button>
            </Link>
          ) : (
            <Link href={`/agent/chats/${chat.id}`}>
              <Button variant="ghost" size="sm">
                View History
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading chats..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Failed to load chats"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchChats,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Chats</h1>
          <p className="text-muted-foreground">
            View and manage all customer conversations including active, inactive, and closed chats
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchChats} variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Chats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Customer Chats</span>
          </CardTitle>
          <CardDescription>
            All customer conversations including active, inactive, waiting, and closed chats
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chats.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No chats found"
              description="Customer chats will appear here when they start conversations"
            />
          ) : (
            <DataTable
              data={chats}
              columns={chatColumns}
              searchable={true}
              filterable={true}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
