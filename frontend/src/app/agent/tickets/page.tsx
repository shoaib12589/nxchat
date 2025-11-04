'use client';

import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Ticket, 
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Search,
  Filter
} from 'lucide-react';
import apiClient from '@/lib/api';
import { Ticket as TicketType } from '@/types';
import Link from 'next/link';

interface ParsedTicketInfo {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchTickets();
  }, [pagination.page, pagination.limit, statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTickets({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
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

  // Parse visitor info from ticket description (for offline form tickets)
  const parseTicketInfo = (description: string): ParsedTicketInfo => {
    const info: ParsedTicketInfo = {};
    if (!description) return info;
    
    // Parse format: "Name: XXX\nEmail: XXX\nPhone: XXX\n\nMessage:\nXXX"
    const nameMatch = description.match(/Name:\s*(.+?)(?:\n|$)/i);
    const emailMatch = description.match(/Email:\s*(.+?)(?:\n|$)/i);
    const phoneMatch = description.match(/Phone:\s*(.+?)(?:\n|$)/i);
    const messageMatch = description.match(/Message:\s*([\s\S]*)$/i);
    
    if (nameMatch) info.name = nameMatch[1].trim();
    if (emailMatch) info.email = emailMatch[1].trim();
    if (phoneMatch) info.phone = phoneMatch[1].trim();
    if (messageMatch) info.message = messageMatch[1].trim();
    
    return info;
  };

  // Filter tickets by search query
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const parsedInfo = parseTicketInfo(ticket.description);
    const visitorName = parsedInfo.name || ticket.customer?.name || '';
    const visitorEmail = parsedInfo.email || ticket.customer?.email || '';
    const subject = ticket.subject || '';
    
    return (
      visitorName.toLowerCase().includes(query) ||
      visitorEmail.toLowerCase().includes(query) ||
      subject.toLowerCase().includes(query) ||
      ticket.id.toString().includes(query)
    );
  });

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
      key: 'id',
      title: 'Ticket ID',
      render: (value: number) => (
        <div className="font-mono text-sm font-medium">#{value}</div>
      ),
    },
    {
      key: 'subject',
      title: 'Visitor Name',
      render: (value: string, ticket: TicketType) => {
        const parsedInfo = parseTicketInfo(ticket.description);
        const visitorName = parsedInfo.name || ticket.customer?.name || 'Unknown';
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium">{visitorName}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">{value}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'email',
      title: 'Email',
      render: (value: any, ticket: TicketType) => {
        const parsedInfo = parseTicketInfo(ticket.description);
        return parsedInfo.email || ticket.customer?.email || '-';
      },
    },
    {
      key: 'phone',
      title: 'Phone Number',
      render: (value: any, ticket: TicketType) => {
        const parsedInfo = parseTicketInfo(ticket.description);
        return parsedInfo.phone || ticket.customer?.phone || '-';
      },
    },
    {
      key: 'message',
      title: 'Message',
      render: (value: any, ticket: TicketType) => {
        const parsedInfo = parseTicketInfo(ticket.description);
        const message = parsedInfo.message || ticket.description || '-';
        return (
          <div className="max-w-md">
            <p className="text-sm line-clamp-2">{message}</p>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'agent',
      title: 'Assigned Agent',
      render: (value: any) => value ? (value.name || `${value.first_name || ''} ${value.last_name || ''}`.trim()) : 'Unassigned',
    },
    {
      key: 'created_at',
      title: 'Created Date',
      render: (value: string) => new Date(value).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
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
                View Details
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
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by ticket ID, visitor name, email, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredTickets.length === 0 && !loading ? (
            <EmptyState
              icon={Ticket}
              title="No tickets found"
              description={searchQuery || statusFilter !== 'all' 
                ? "Try adjusting your filters or search query"
                : "Support tickets will appear here when customers submit them"}
              action={!searchQuery && statusFilter === 'all' ? {
                label: 'Create Ticket',
                onClick: () => {/* Handle create ticket */},
              } : undefined}
            />
          ) : (
            <DataTable
              data={filteredTickets}
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
