'use client';

import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Ticket, 
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import apiClient from '@/lib/api';
import { Ticket as TicketType } from '@/types';
import Link from 'next/link';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    fetchTickets();
  }, [pagination.page, pagination.limit]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTickets({
        page: pagination.page,
        limit: pagination.limit,
      });
      
      if (response.success) {
        setTickets(response.data.tickets || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
        }));
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async (ticketId: number) => {
    try {
      const response = await apiClient.assignTicket(ticketId);
      if (response.success) {
        fetchTickets(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
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
      case 'closed':
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Closed</span>
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
      key: 'agent',
      title: 'Agent',
      render: (value: any) => value ? `${value.first_name} ${value.last_name}` : 'Unassigned',
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
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading tickets..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Ticket}
        title="Failed to load tickets"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchTickets,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            Manage support tickets and customer issues
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({pagination.total})</CardTitle>
          <CardDescription>
            All support tickets and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No tickets found"
              description="Support tickets will appear here when customers submit them"
              action={{
                label: 'Create Ticket',
                onClick: () => {/* Handle create ticket */},
              }}
            />
          ) : (
            <DataTable
              data={tickets}
              columns={ticketColumns}
              searchable={false}
              filterable={false}
              pagination={{
                ...pagination,
                onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
                onLimitChange: (limit) => setPagination(prev => ({ ...prev, limit, page: 1 })),
              }}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
