'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Users, 
  Search, 
  RefreshCw,
  ChevronUp,
  MapPin,
  Calendar, 
  Clock, 
  MessageCircle, 
  Eye,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface Visitor {
    id: string;
    name: string;
  email?: string;
  phone?: string;
    avatar?: string;
  status: 'online' | 'away' | 'offline' | 'idle' | 'waiting_for_agent';
  currentPage: string;
  referrer: string;
  location: {
    country: string;
    city: string;
    region: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    os: string;
  };
  lastActivity: string;
  sessionDuration: string;
  messagesCount: number;
  visitsCount: number;
  assignedAgent?: {
    id: string;
    name: string;
    avatar?: string;
  };
  brand?: {
    id: number;
    name: string;
    primaryColor: string;
  };
  brandName?: string;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  ratingFeedback?: string;
}

interface VisitorFilters {
  status: string;
  search: string;
}

const HistoryPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<VisitorFilters>({
    status: 'all',
    search: ''
  });

  // Messages modal state
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchVisitors = useCallback(async () => {
    try {
      if (refreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiClient.getVisitorHistory(filters);
      
      if (response.success) {
        const transformedVisitors = response.data.map((visitor: any) => ({
          ...visitor,
          name: visitor.name || 'Anonymous Visitor',
          currentPage: visitor.current_page || visitor.currentPage || 'Unknown page',
          lastActivity: visitor.last_activity || visitor.lastActivity,
          sessionDuration: visitor.session_duration ? visitor.session_duration.toString() : visitor.sessionDuration || '0',
          messagesCount: visitor.messages_count || visitor.messagesCount || 0,
          visitsCount: visitor.visits_count || visitor.visitsCount || 1,
          location: visitor.location || { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
          device: visitor.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
          createdAt: visitor.created_at || visitor.createdAt,
          referrer: visitor.referrer || 'Direct',
          brandName: visitor.brandName || visitor.brand?.name || 'No Brand'
        }));
        
        setVisitors(transformedVisitors);
      } else {
        toast.error(response.message || 'Failed to fetch visitor history');
      }
    } catch (error: any) {
      console.error('Error fetching visitor history:', error);
      toast.error(error.message || 'Failed to fetch visitor history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, refreshing]);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const handleRefresh = () => {
    fetchVisitors();
  };

  const handleViewMessages = async (visitor: Visitor) => {
    try {
      setSelectedVisitor(visitor);
      setShowMessagesModal(true);
      setLoadingMessages(true);
      
      const response = await apiClient.getVisitorMessages(visitor.id, { limit: 100 });
      
      if (response.success && response.data.messages) {
        setMessages(response.data.messages.reverse()); // Reverse to show oldest first
      } else {
        toast.error('Failed to load messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatDuration = (visitor: Visitor) => {
    const duration = parseInt(visitor.sessionDuration);
    if (!duration || duration === 0) return '0m';
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  };

  const getPageTitle = (url: string) => {
    if (!url || url === 'Unknown page') return 'Unknown page';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1].replace(/[-_]/g, ' ').split('.').shift() || 'Page';
      }
      return 'Home';
    } catch {
      const segments = url.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1].replace(/[-_]/g, ' ').split('.').shift() || 'Page';
      }
      return 'Page';
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      left: { label: 'Left', className: 'bg-gray-100 text-gray-800' },
      complete: { label: 'Complete', className: 'bg-green-100 text-green-800' },
      'end_chat': { label: 'End Chat', className: 'bg-blue-100 text-blue-800' },
      offline: { label: 'Offline', className: 'bg-slate-100 text-slate-800' }
    };
    
    const statusConfig = config[status as keyof typeof config] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  // Visitor categorization
  const getHistoryVisitors = () => {
    return visitors.filter(visitor => {
      // Show only visitors who are offline or have completed
      return visitor.status === 'offline' || visitor.status === 'idle';
    });
  };

  const renderHistorySection = (title: string, icon: string, iconColor: string, visitors: Visitor[]) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div 
          className="bg-gray-50 px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-lg">{icon}</span>
              <h3 className="text-sm font-medium text-gray-900">{title}</h3>
              <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            <span className="text-sm text-gray-500">Visitors: {visitors.length}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200">
            {visitors.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p className="text-sm">No visitors in this category</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Online</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viewing</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visits</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visitors.map((visitor, index) => (
                      <tr
                        key={`${visitor.id}-${index}`}
                        className="hover:bg-gray-50"
                      >
                        {/* Visitor Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={visitor.avatar} />
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {visitor.name?.charAt(0) || 'V'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {visitor.name && visitor.name.trim() && visitor.name !== 'Anonymous Visitor' 
                                  ? visitor.name 
                                  : `#${visitor.id.slice(-8)}`}
                              </div>
                              {visitor.name && visitor.name.trim() && visitor.name !== 'Anonymous Visitor' && (
                                <div className="text-sm text-gray-500">#{visitor.id.slice(-8)}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Online Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              visitor.status === 'offline' ? 'bg-gray-400' : 'bg-green-500'
                            }`}></div>
                            <span className="text-sm text-gray-900">{formatDuration(visitor)}</span>
                          </div>
                        </td>

                        {/* Brand Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {visitor.brandName || visitor.brand?.name || 'No Brand'}
                          </span>
                        </td>

                        {/* Viewing Column */}
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {visitor.currentPage && visitor.currentPage !== 'Unknown page' ? (
                              <span className="truncate block" title={visitor.currentPage}>
                                {getPageTitle(visitor.currentPage)}
                              </span>
                            ) : (
                              <span className="text-gray-500">Unknown page</span>
                            )}
                          </div>
                        </td>

                        {/* Referrer Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {visitor.referrer === 'Direct' || !visitor.referrer ? '-' : visitor.referrer}
                            </span>
                          </div>
                        </td>

                        {/* Visits Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {visitor.visitsCount || 1}
                          </span>
                        </td>

                        {/* Messages Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {visitor.messagesCount > 0 ? visitor.messagesCount : '-'}
                          </span>
                        </td>

                        {/* Last Activity Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-500">
                            {new Date(visitor.lastActivity).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading visitor history..." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visitor History</h1>
          <p className="text-gray-600 mt-1">
            View historical visitors and their interaction history
          </p>
        </div>
        <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
              placeholder="Search visitors"
                value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-64"
              />
            </div>
          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        {getHistoryVisitors().length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No visitor history found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Visitors who complete chats or go offline will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Historical Visitors</span>
              </CardTitle>
              <CardDescription>
                Visitors with status: Left, Complete, End Chat, or Offline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visitor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viewing</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getHistoryVisitors().map((visitor, index) => (
                      <tr key={`${visitor.id}-${index}`} className="hover:bg-gray-50">
                        {/* Visitor Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={visitor.avatar} />
                              <AvatarFallback className="bg-blue-100 text-blue-700">
                                {visitor.name?.charAt(0) || 'V'}
                      </AvatarFallback>
                    </Avatar>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {visitor.name && visitor.name.trim() && visitor.name !== 'Anonymous Visitor' 
                                  ? visitor.name 
                                  : `#${visitor.id.slice(-8)}`}
                              </div>
                              {visitor.name && visitor.name.trim() && visitor.name !== 'Anonymous Visitor' && (
                                <div className="text-sm text-gray-500">#{visitor.id.slice(-8)}</div>
                              )}
                          </div>
                        </div>
                        </td>

                        {/* Status Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            // Map visitor status to history status badges
                            if (visitor.status === 'offline') {
                              // Check if visitor had an assigned agent (completed chat)
                              if (visitor.assignedAgent) {
                                return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
                              } else {
                                return <Badge className="bg-slate-100 text-slate-800">Offline</Badge>;
                              }
                            } else if (visitor.status === 'idle') {
                              return <Badge className="bg-blue-100 text-blue-800">End Chat</Badge>;
                            } else {
                              return <Badge className="bg-gray-100 text-gray-800">Left</Badge>;
                            }
                          })()}
                        </td>

                        {/* Brand Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {visitor.brandName || visitor.brand?.name || 'No Brand'}
                          </span>
                        </td>

                        {/* Viewing Column */}
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">
                            {visitor.currentPage && visitor.currentPage !== 'Unknown page' ? (
                              <span className="truncate block" title={visitor.currentPage}>
                                {getPageTitle(visitor.currentPage)}
                              </span>
                            ) : (
                              <span className="text-gray-500">Unknown page</span>
                            )}
                        </div>
                        </td>

                        {/* Referrer Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Search className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {visitor.referrer === 'Direct' || !visitor.referrer ? '-' : visitor.referrer}
                            </span>
                          </div>
                        </td>

                        {/* Duration Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{formatDuration(visitor)}</span>
                        </div>
                        </td>

                        {/* Messages Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {visitor.messagesCount > 0 ? visitor.messagesCount : '-'}
                          </span>
                        </td>

                        {/* Last Activity Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {new Date(visitor.lastActivity).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewMessages(visitor)}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Messages
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </CardContent>
            </Card>
                      )}
                    </div>

      {/* Messages Modal */}
      <Dialog open={showMessagesModal} onOpenChange={setShowMessagesModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5" />
                <span>Visitor Messages - {selectedVisitor?.name || 'Visitor #' + selectedVisitor?.id.slice(-8)}</span>
              </div>
            </DialogTitle>
          <DialogDescription>
            Complete conversation history with visitor
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Rating Display */}
          {selectedVisitor?.rating && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">⭐</span>
                <h4 className="font-semibold text-yellow-900">Visitor Rating</h4>
              </div>
              <div className="flex items-center space-x-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= selectedVisitor.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                    ★
                  </span>
                ))}
                <span className="text-sm text-yellow-800 ml-2">({selectedVisitor.rating}/5)</span>
              </div>
              {selectedVisitor.ratingFeedback && (
                <p className="text-sm text-yellow-800 italic mt-2">"{selectedVisitor.ratingFeedback}"</p>
              )}
            </div>
          )}
          
          {loadingMessages ? (
              <LoadingSpinner text="Loading messages..." />
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages found</h3>
                <p className="text-gray-600">This visitor hasn't sent any messages yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.sender === 'agent'
                          ? 'bg-blue-600 text-white'
                          : message.sender === 'system'
                          ? 'bg-gray-200 text-gray-700 text-center mx-auto'
                          : message.sender === 'ai'
                          ? 'bg-green-100 text-green-900 border border-green-200'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <div className="font-medium text-xs mb-1">
                        {message.sender === 'agent' ? 'You' : 
                         message.sender === 'ai' ? 'AI Assistant' :
                         message.sender === 'system' ? 'System' :
                         selectedVisitor?.name || 'Visitor'}
                        {message.senderName && message.senderName !== 'Visitor' && ` (${message.senderName})`}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content || message.message}</p>
                      <p className={`text-xs mt-2 ${
                        message.sender === 'agent' ? 'text-blue-100' : 
                        message.sender === 'system' ? 'text-gray-600' :
                        message.sender === 'ai' ? 'text-green-600' :
                        'text-gray-500'
                      }`}>
                        {new Date(message.timestamp || message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;
