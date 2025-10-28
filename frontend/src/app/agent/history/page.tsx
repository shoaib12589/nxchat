'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  Star, 
  User, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Eye,
  MoreHorizontal,
  Mail,
  FileText,
  X,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

interface ChatHistory {
  id: number;
  status: 'closed' | 'completed' | 'visitor_left';
  startedAt: string;
  endedAt: string;
  duration: number | null;
  rating: number | null;
  ratingFeedback: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  agent: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
  department: {
    id: number;
    name: string;
  } | null;
  lastMessage: {
    id: number;
    message: string;
    createdAt: string;
    senderType: string;
  } | null;
  messageCount: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Filters {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
  sortBy: string;
  sortOrder: string;
}

const HistoryPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    startDate: '',
    endDate: '',
    sortBy: 'ended_at',
    sortOrder: 'DESC'
  });

  // Modal states
  const [selectedChat, setSelectedChat] = useState<ChatHistory | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    totalChats: 0,
    avgRating: 0,
    avgDuration: 0,
    completedChats: 0
  });

  // Fetch chat history
  const fetchChatHistory = useCallback(async (page = 1, showRefreshSpinner = false) => {
    try {
      if (showRefreshSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const params = {
        page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await apiClient.getChatHistory(params);
      
      console.log('Chat history response:', response);
      
      if (response.success) {
        console.log('Setting chats:', response.data.chats);
        setChats(response.data.chats || []);
        setPagination(response.data.pagination || pagination);
        
        // Calculate statistics
        if (response.data.chats) {
          const total = response.data.pagination.total;
          const completed = response.data.chats.filter(c => c.status === 'completed').length;
          const ratings = response.data.chats.filter(c => c.rating !== null).map(c => c.rating!);
          const durations = response.data.chats.filter(c => c.duration !== null).map(c => c.duration!);
          
          setStats({
            totalChats: total,
            avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
            avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
            completedChats: completed
          });
        }
      } else {
        toast.error(response.message || 'Failed to fetch chat history');
      }
    } catch (error: any) {
      console.error('Error fetching chat history:', error);
      toast.error(error.message || 'Failed to fetch chat history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    fetchChatHistory(newPage);
  };

  const handleRefresh = () => {
    fetchChatHistory(pagination.page, true);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800 hover:bg-green-200' },
      visitor_left: { label: 'Visitor Left', className: 'bg-amber-100 text-amber-800 hover:bg-amber-200' }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.closed;
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>;
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">No rating</span>;
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const handleExportChat = (chat: ChatHistory) => {
    try {
      const csvContent = [
        ['Field', 'Value'],
        ['Chat ID', chat.id.toString()],
        ['Customer', chat.customer?.name || 'N/A'],
        ['Customer Email', chat.customer?.email || 'N/A'],
        ['Agent', chat.agent?.name || 'N/A'],
        ['Status', chat.status],
        ['Duration', formatDuration(chat.duration)],
        ['Rating', chat.rating?.toString() || 'N/A'],
        ['Start Date', formatDate(chat.startedAt)],
        ['End Date', formatDate(chat.endedAt)],
        ['Last Message', chat.lastMessage?.message || 'N/A']
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-${chat.id}-export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Chat exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export chat');
    }
  };

  const handleViewMessages = async (chat: ChatHistory) => {
    try {
      setSelectedChat(chat);
      setLoadingMessages(true);
      setShowMessagesModal(true);

      const response = await apiClient.getChat(chat.id);
      if (response.success && response.data.messages) {
        setChatMessages(response.data.messages);
      } else {
        toast.error('Failed to load chat messages');
        setChatMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load chat messages');
      setChatMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleContactCustomer = (chat: ChatHistory) => {
    if (chat.customer?.email) {
      const subject = `Follow-up on Chat #${chat.id}`;
      const body = `Hello ${chat.customer.name},\n\nI hope you're doing well. I wanted to follow up on our previous conversation (Chat #${chat.id}).\n\nBest regards,\n${user?.name}`;
      const mailtoUrl = `mailto:${chat.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl);
      toast.success('Email client opened');
    } else {
      toast.error('Customer email not available');
    }
  };

  const handleViewDetails = (chat: ChatHistory) => {
    setSelectedChat(chat);
    setShowDetailsModal(true);
  };

  if (loading && chats.length === 0) {
    return <LoadingSpinner text="Loading chat history..." />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat History</h1>
          <p className="text-gray-600 mt-1">
            Review completed chats and visitor interactions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Chats</CardTitle>
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalChats}</div>
            <p className="text-xs text-gray-500 mt-1">All completed chats</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.completedChats}</div>
            <p className="text-xs text-gray-500 mt-1">Successfully closed</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</div>
            <p className="text-xs text-gray-500 mt-1">Out of 5.0 stars</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</div>
            <p className="text-xs text-gray-500 mt-1">Per chat session</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Filters & Search</CardTitle>
              <CardDescription>Find and filter your chat history</CardDescription>
            </div>
            {filters.search || filters.status !== 'all' || filters.startDate || filters.endDate ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setFilters({
                    search: '',
                    status: 'all',
                    startDate: '',
                    endDate: '',
                    sortBy: 'ended_at',
                    sortOrder: 'DESC'
                  });
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by customer name or email"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="visitor_left">Visitor Left</SelectItem>
              </SelectContent>
            </Select>

            {/* Start Date */}
            <Input
              type="date"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />

            {/* End Date */}
            <Input
              type="date"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Sort By */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ended_at">End Date</SelectItem>
                  <SelectItem value="started_at">Start Date</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DESC">Newest First</SelectItem>
                <SelectItem value="ASC">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
        <p className="text-sm text-gray-600 font-medium">
          Showing <span className="text-gray-900">{chats.length}</span> of <span className="text-gray-900">{pagination.total}</span> chats
        </p>
        <div className="text-sm text-gray-600 font-medium">
          Page {pagination.page} of {pagination.totalPages || 1}
        </div>
      </div>

      {/* Chat History List */}
      <div className="space-y-4">
        {chats.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No chat history found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {filters.search || filters.status !== 'all' || filters.startDate || filters.endDate
                  ? 'Try adjusting your filters to see more results.'
                  : 'Completed chats will appear here once agents finish conversations.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          chats.map((chat) => (
            <Card key={chat.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Customer Avatar */}
                    <Avatar className="w-14 h-14 border-2 border-gray-200">
                      <AvatarImage src={chat.customer?.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                        {chat.customer?.name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {chat.customer?.name || 'Anonymous Customer'}
                        </h3>
                        {getStatusBadge(chat.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {/* Details Row 1 */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{chat.customer?.email || 'No email'}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>{formatDuration(chat.duration)}</span>
                          </div>
                        </div>

                        {/* Details Row 2 */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span>{formatDate(chat.endedAt)}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-gray-600">
                            <MessageCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-start space-x-2 text-gray-600">
                          {renderStars(chat.rating)}
                        </div>
                      </div>

                      {/* Last Message */}
                      {chat.lastMessage && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-2 mb-1">
                            <MessageCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Last Message</span>
                            <span className="text-xs text-gray-500">
                              ({formatDate(chat.lastMessage.createdAt)})
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {chat.lastMessage.message}
                          </p>
                        </div>
                      )}

                      {/* Rating Feedback */}
                      {chat.ratingFeedback && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2 mb-1">
                            <Star className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Customer Feedback</span>
                          </div>
                          <p className="text-sm text-blue-800">{chat.ratingFeedback}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(chat)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExportChat(chat)}>
                          <Download className="w-4 h-4 mr-2" />
                          Export Chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewMessages(chat)}>
                          <MessageCircle className="w-4 h-4 mr-2" />
                          View Messages
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleContactCustomer(chat)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Contact Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="w-10 h-10 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Chat Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Chat Details - #{selectedChat?.id}</span>
            </DialogTitle>
            <DialogDescription>Complete information about this chat session</DialogDescription>
          </DialogHeader>
          {selectedChat && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedChat.customer?.avatar} />
                        <AvatarFallback>{selectedChat.customer?.name?.charAt(0) || 'C'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedChat.customer?.name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{selectedChat.customer?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Agent</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedChat.agent?.avatar} />
                        <AvatarFallback>{selectedChat.agent?.name?.charAt(0) || 'A'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedChat.agent?.name || 'Unassigned'}</p>
                        <p className="text-sm text-gray-500">{selectedChat.agent?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedChat.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="mt-1">{formatDuration(selectedChat.duration)}</p>
                  </div>
                </div>

                {selectedChat.rating !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rating & Feedback</label>
                    <div className="mt-2 flex items-start space-x-2">
                      <div>{renderStars(selectedChat.rating)}</div>
                      {selectedChat.ratingFeedback && (
                        <p className="text-sm text-gray-600 italic mt-1">{selectedChat.ratingFeedback}</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Start Date</label>
                    <p className="mt-1">{formatDate(selectedChat.startedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">End Date</label>
                    <p className="mt-1">{formatDate(selectedChat.endedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <p className="mt-1">{selectedChat.department?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Messages</label>
                    <p className="mt-1">{selectedChat.messageCount} messages</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat Messages Modal */}
      <Dialog open={showMessagesModal} onOpenChange={setShowMessagesModal}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Chat Messages - #{selectedChat?.id}</span>
            </DialogTitle>
            <DialogDescription>Full conversation history</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3 bg-gray-50 rounded-lg">
            {loadingMessages ? (
              <LoadingSpinner text="Loading messages..." />
            ) : chatMessages.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No messages found"
                description="This chat has no messages"
              />
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'agent'
                        ? 'bg-blue-600 text-white'
                        : message.sender_type === 'system'
                        ? 'bg-gray-200 text-gray-700 text-center mx-auto'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_type === 'agent' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatDate(message.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryPage;