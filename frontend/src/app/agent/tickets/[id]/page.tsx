'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Ticket,
  Mail,
  Phone,
  User,
  Clock,
  MessageSquare,
  Send,
  Edit,
  CheckCircle,
  AlertCircle,
  Calendar,
  UserCheck
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import apiClient from '@/lib/api';
import { Ticket as TicketType } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface ParsedTicketInfo {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

interface TicketNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  type: 'reply' | 'note';
}

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { user } = useAuthStore();
  
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [notes, setNotes] = useState<TicketNote[]>([]);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      loadNotes();
    }
  }, [ticket]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getTicket(parseInt(ticketId));
      
      if (response.success) {
        setTicket(response.data);
      } else {
        setError('Failed to load ticket');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = () => {
    if (!ticket) return;
    
    // Load notes from ticket metadata if available
    const ticketMetadata = ticket.metadata || {};
    const storedNotes = ticketMetadata.notes || [];
    setNotes(storedNotes.map((note: any, idx: number) => ({
      id: note.id || `note-${idx}`,
      content: note.content,
      author: note.author || user?.name || 'Agent',
      createdAt: note.createdAt || new Date().toISOString(),
      type: note.type || 'note'
    })));
  };

  const parseTicketInfo = (description: string): ParsedTicketInfo => {
    const info: ParsedTicketInfo = {};
    if (!description) return info;
    
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

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await apiClient.updateTicket(parseInt(ticketId), {
        status: newStatus
      });
      
      if (response.success) {
        setTicket({ ...ticket!, status: newStatus as any });
        setStatus(newStatus);
        setShowStatusDialog(false);
        toast.success('Ticket status updated');
        fetchTicket(); // Refresh to get updated data
      }
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !ticket) return;

    try {
      setSending(true);
      
      // For now, append reply to ticket description or metadata
      // In a full implementation, you'd have a separate TicketReply model
      const newNote: TicketNote = {
        id: Date.now().toString(),
        content: replyContent,
        author: user?.name || 'Agent',
        createdAt: new Date().toISOString(),
        type: 'reply'
      };

      // Update ticket with note in metadata
      const currentMetadata = ticket.metadata || {};
      const updatedNotes = [...notes, newNote];
      
      const response = await apiClient.updateTicket(parseInt(ticketId), {
        metadata: {
          ...currentMetadata,
          notes: updatedNotes
        }
      });

      if (response.success) {
        setNotes(updatedNotes);
        setReplyContent('');
        toast.success('Reply added successfully');
        fetchTicket(); // Refresh to get updated ticket with metadata
      }
    } catch (error: any) {
      toast.error('Failed to add reply');
    } finally {
      setSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!replyContent.trim() || !ticket) return;

    try {
      setSending(true);
      
      const newNote: TicketNote = {
        id: Date.now().toString(),
        content: replyContent,
        author: user?.name || 'Agent',
        createdAt: new Date().toISOString(),
        type: 'note'
      };

      const currentMetadata = ticket.metadata || {};
      const updatedNotes = [...notes, newNote];
      
      const response = await apiClient.updateTicket(parseInt(ticketId), {
        metadata: {
          ...currentMetadata,
          notes: updatedNotes
        }
      });

      if (response.success) {
        setNotes(updatedNotes);
        setReplyContent('');
        toast.success('Internal note added');
        fetchTicket(); // Refresh to get updated ticket with metadata
      }
    } catch (error: any) {
      toast.error('Failed to add note');
    } finally {
      setSending(false);
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

  if (loading) {
    return <LoadingSpinner text="Loading ticket details..." />;
  }

  if (error || !ticket) {
    return (
      <EmptyState
        icon={Ticket}
        title="Ticket not found"
        description={error || 'The ticket you are looking for does not exist'}
        action={{
          label: 'Back to Tickets',
          onClick: () => router.push('/agent/tickets'),
        }}
      />
    );
  }

  const parsedInfo = parseTicketInfo(ticket.description);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/agent/tickets')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Ticket #{ticket.id}
            </h1>
            <p className="text-muted-foreground">
              {ticket.subject}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(status)}
          <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Change Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Visitor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Visitor Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{parsedInfo.name || ticket.customer?.name || 'Unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{parsedInfo.email || ticket.customer?.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{parsedInfo.phone || ticket.customer?.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium">
                      {new Date(ticket.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message/Issue Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Message / Issue Description</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{parsedInfo.message || ticket.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Timeline */}
          {notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversation Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border-l-2 border-primary pl-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{note.author}</span>
                          {note.type === 'note' && (
                            <Badge variant="outline" className="text-xs">Internal Note</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(note.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reply Section */}
          <Card>
            <CardHeader>
              <CardTitle>Reply / Add Note</CardTitle>
              <CardDescription>
                Respond to the visitor or add an internal note
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your reply or internal note here..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={6}
              />
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleAddNote}
                  disabled={!replyContent.trim() || sending}
                >
                  Add Internal Note
                </Button>
                <Button
                  onClick={handleReply}
                  disabled={!replyContent.trim() || sending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {getStatusBadge(status)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority</p>
                <Badge variant={ticket.priority === 'urgent' || ticket.priority === 'high' ? 'destructive' : 'secondary'}>
                  {ticket.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Assigned Agent</p>
                <p className="font-medium">
                  {ticket.agent?.name || ticket.agent ? 
                    `${ticket.agent.first_name || ''} ${ticket.agent.last_name || ''}`.trim() 
                    : 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="font-medium">{ticket.category || 'Support Request'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p className="font-medium">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="font-medium">
                  {new Date(ticket.updated_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Ticket Status</DialogTitle>
            <DialogDescription>
              Update the status of this ticket
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleStatusUpdate(status)}>
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

