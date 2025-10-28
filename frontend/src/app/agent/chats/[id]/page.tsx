'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChatBubble } from '@/components/shared/ChatBubble';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
 import { Badge } from '@/components/ui/badge';
import {
   MessageSquare, 
   Send, 
   Paperclip, 
   Phone, 
   Video,
   MoreHorizontal,
   Star,
   Clock,
   CheckCircle,
   AlertCircle,
   UserPlus
} from 'lucide-react';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/stores/authStore';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { Chat, Message, User } from '@/types';
import { toast } from 'sonner';
import { useSocket } from '@/contexts/SocketContext';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  const { socket, isConnected } = useSocket();
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user: currentUser } = useAuthStore();
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<User[]>([]);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (chatId) {
      fetchChat();
    }
  }, [chatId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join chat room when socket is connected
    socket.emit('join_chat', { chatId: parseInt(chatId) });

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      console.log('New message received:', data);
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
    };

    // Listen for visitor messages (for agent dashboard)
    const handleVisitorMessage = (data: any) => {
      console.log('Visitor message received:', data);
      if (data.visitorId && data.message) {
        // Add visitor message to the chat
        const visitorMessage: Message = {
          id: parseInt(data.messageId) || Date.now(),
          chat_id: parseInt(chatId),
          sender_id: parseInt(data.visitorId) || 0,
          content: data.message,
          message_type: 'text',
          is_read: false,
          created_at: data.timestamp || new Date().toISOString(),
          updated_at: data.timestamp || new Date().toISOString(),
          sender: {
            id: parseInt(data.visitorId) || 0,
            name: 'Visitor',
            email: '',
            role: 'customer',
            status: 'active',
            email_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User
        };
        setMessages(prev => [...prev, visitorMessage]);
      }
    };

    // Listen for AI responses
    const handleAIResponse = (data: any) => {
      console.log('AI response received:', data);
      if (data.visitorId && data.response) {
        const aiMessage: Message = {
          id: parseInt(data.messageId) || Date.now(),
          chat_id: parseInt(chatId),
          sender_id: 0,
          content: data.response,
          message_type: 'text',
          is_read: false,
          created_at: data.timestamp || new Date().toISOString(),
          updated_at: data.timestamp || new Date().toISOString(),
          sender: {
            id: 0,
            name: 'AI Assistant',
            email: '',
            role: 'customer',
            status: 'active',
            email_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('visitor:message', handleVisitorMessage);
    socket.on('ai:response', handleAIResponse);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('visitor:message', handleVisitorMessage);
      socket.off('ai:response', handleAIResponse);
    };
  }, [socket, isConnected, chatId]);

  const fetchChat = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getChat(parseInt(chatId));
      
      if (response.success) {
        setChat(response.data);
        setMessages(response.data.messages || []);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAgents = async () => {
    try {
      const response = await apiClient.getAgents();
      if (response.success) {
        // Filter out current agent
        const agents = response.data.filter((agent: User) => agent.id !== currentUser?.id);
        setAvailableAgents(agents);
      }
    } catch (error: any) {
      console.error('Failed to fetch agents:', error);
      toast.error('Failed to load agents');
    }
  };

  const handleTransferChat = async (newAgentId: number) => {
    if (!chat) return;

    try {
      setTransferring(true);
      
      // Call transfer API
      const response = await apiClient.transferChat(chat.id, newAgentId);
      
      if (response.success) {
        toast.success('Chat transferred successfully');
        setShowTransferDialog(false);
        // Refresh chat data
        await fetchChat();
      } else {
        toast.error(response.message || 'Failed to transfer chat');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer chat');
    } finally {
      setTransferring(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !chat) return;

    try {
      setSending(true);
      
      // Send message via socket.io for real-time delivery
      if (socket && isConnected) {
        socket.emit('send_message', {
          message: newMessage,
          messageType: 'text'
        });
        
        // Add message to local state immediately for better UX
        const agentMessage: Message = {
          id: Date.now(),
          chat_id: chat.id,
          sender_id: currentUser?.id || 0,
          content: newMessage,
          message_type: 'text',
          is_read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sender: currentUser || {
            id: 0,
            name: 'Agent',
            email: '',
            role: 'agent',
            status: 'active',
            email_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User
        };
        setMessages(prev => [...prev, agentMessage]);
        setNewMessage('');
        
        // Restore focus to textarea to ensure placeholder text behaves correctly
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }, 10);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Active</span>
          </Badge>
        );
      case 'waiting':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Waiting</span>
          </Badge>
        );
      case 'closed':
        return (
          <Badge variant="outline" className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
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

  if (loading) {
    return <LoadingSpinner text="Loading chat..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Failed to load chat"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchChat,
        }}
      />
    );
  }

  if (!chat) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Chat not found"
        description="The requested chat could not be found"
      />
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Header */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <UserAvatar user={chat.customer!} size="lg" showRole={false} />
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold">
                    {chat.customer?.name}
                  </h2>
                  {getStatusBadge(chat.status)}
                  {getPriorityBadge(chat.priority)}
                </div>
                <p className="text-sm text-muted-foreground">{chat.customer?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Started {new Date(chat.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowTransferDialog(true);
                  fetchAvailableAgents();
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Transfer
              </Button>
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Video className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Conversation</CardTitle>
          <CardDescription>
            {messages.length} messages
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <ChatBubble
                      message={message}
                      isOwn={message.sender?.role === 'agent'}
                      showAvatar={true}
                      showTimestamp={true}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="min-h-[60px] resize-none"
                  disabled={sending}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Button variant="outline" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Chat Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Chat</DialogTitle>
            <DialogDescription>
              Select an agent to transfer this chat to. The current agent will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {availableAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No other agents available
                </div>
              ) : (
                availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleTransferChat(agent.id)}
                    disabled={transferring}
                    className="w-full p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#13315C] to-[#0B2545] flex items-center justify-center text-white font-semibold">
                        {agent.name?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">{agent.email}</div>
                        {agent.department && (
                          <div className="text-xs text-muted-foreground">
                            {agent.department.name}
                          </div>
                        )}
                      </div>
                      {transferring && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
