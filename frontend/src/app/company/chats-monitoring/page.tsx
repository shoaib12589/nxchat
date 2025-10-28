'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MessageSquare, 
  User, 
  Clock, 
  ChevronRight,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Star,
  Tag,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  FileText
} from 'lucide-react';
import Budas from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  message: string;
  message_type: string;
  created_at: string;
  sender?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

interface Chat {
  id: number;
  customer_id: number;
  agent_id: number | null;
  status: string;
  priority?: string;
  rating: number | null;
  rating_feedback: string | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
  started_at?: string | null;
  tags?: any;
  metadata?: any;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_location?: string;
  customer?: {
    id: number;
    name: string;
    email: string;
    avatar: string;
  };
  agent?: {
    id: number;
    name: string;
    email: string;
  };
  brand?: {
    id: number;
    name: string;
  };
  messages?: Message[];
  messageCount?: number;
}

export default function ChatsMonitoringPage() {
  const router = useRouter();
  const apiClient = Budas;
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [agents, setAgents] = useState<Array<{ id: number; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    pending: 0
  });

  const statusColors = {
    'active': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'open': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'closed': 'bg-slate-100 text-slate-800 border-slate-200',
    'pending': 'bg-amber-100 text-amber-800 border-amber-200',
    'waiting': 'bg-orange-100 text-orange-800 border-orange-200',
    'waiting_for_agent': 'bg-orange-100 text-orange-800 border-orange-200',
    'transferred': 'bg-purple-100 text-purple-800 border-purple-200'
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'open':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      case 'pending':
      case 'waiting':
      case 'waiting_for_agent':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchChats();
    fetchAgents();
    fetchBrands();
  }, []);

  useEffect(() => {
    console.log('Agents state:', agents);
    console.log('Brands state:', brands);
  }, [agents, brands]);

  useEffect(() => {
    fetchChats();
  }, [statusFilter, agentFilter, brandFilter]);

  useEffect(() => {
    applyFilters();
    updateStats();
  }, [chats, searchQuery]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      // Map frontend status values to API status values
      let apiStatus: string | undefined = statusFilter;
      if (statusFilter === 'open') {
        apiStatus = 'active';
      } else if (statusFilter === 'waiting_for_agent') {
        apiStatus = 'waiting';
      } else if (statusFilter === 'all') {
        apiStatus = undefined;
      }

      const params: any = {};
      if (apiStatus) {
        params.status = apiStatus;
      }
      if (agentFilter !== 'all') {
        params.agentId = parseInt(agentFilter);
      }
      // Fetch all chats - no limit or increase limit significantly
      params.limit = 1000;

      const response = await apiClient.getCompanyChats(params);
      
      if (response.success) {
        let fetchedChats = response.data || [];
        
        // Apply brand filter on frontend since brand info may be in metadata
        if (brandFilter !== 'all') {
          const brandId = parseInt(brandFilter);
          fetchedChats = fetchedChats.filter((chat: Chat) => {
            // Try to get brand_id from metadata or other sources
            return (chat as any).brand_id === brandId || 
                   (chat.metadata as any)?.brand_id === brandId;
          });
        }
        
        setChats(fetchedChats);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await apiClient.get('/company/agents');
      
      if (response.success) {
        setAgents(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await apiClient.get('/brands');
      
      if (response.success) {
        setBrands(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchChatDetails = async (chatId: number) => {
    try {
      setLoadingChat(true);
      const response = await apiClient.getChatById(chatId);
      
      if (response.success) {
        setSelectedChat(response.data);
      }
    } catch (error) {
      console.error('Error fetching chat details:', error);
    } finally {
      setLoadingChat(false);
    }
  };

  const applyFilters = () => {
    let filtered = chats;

    // Apply search filter only (status, agent, and brand filters are now done server-side)
    if (searchQuery) {
      filtered = filtered.filter(chat => {
        const searchLower = searchQuery.toLowerCase();
        return (
          chat.customer?.name?.toLowerCase().includes(searchLower) ||
          chat.customer?.email?.toLowerCase().includes(searchLower) ||
          chat.customer_name?.toLowerCase().includes(searchLower) ||
          chat.customer_email?.toLowerCase().includes(searchLower) ||
          chat.agent?.name?.toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredChats(filtered);
  };

  const updateStats = () => {
    const stats = {
      total: chats.length,
      active: chats.filter(c => c.status === 'active' || c.status === 'open').length,
      closed: chats.filter(c => c.status === 'closed').length,
      pending: chats.filter(c => c.status === 'pending' || c.status === 'waiting' || c.status === 'waiting_for_agent').length
    };
    setStats(stats);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="flex-1 flex overflow-hidden">
        {/* Chat List Sidebar */}
        <div className="w-96 border-r border-slate-200 bg-white flex flex-col shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Chat Monitoring</h1>
                <p className="text-sm text-blue-100 mt-0.5">Real-time chat overview</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchChats}
                className="gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="text-xs text-blue-100 mb-1">Total Chats</div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <div className="text-xs text-blue-100 mb-1">Active</div>
                <div className="text-2xl font-bold text-white">{stats.active}</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-slate-200"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <Filter className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>

              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <User className="h-3 w-3 mr-2" />
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-3 border border-slate-200 rounded-lg space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No chats found</h3>
                <p className="text-sm text-slate-500 max-w-xs">No chats match your current search or filters.</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => fetchChatDetails(chat.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedChat?.id === chat.id
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold`}>
                          {(chat.customer?.name || chat.customer_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {chat.customer?.name || chat.customer_name || 'Anonymous'}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {chat.customer?.email || chat.customer_email || 'No email'}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${statusColors[chat.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-800 border-slate-200'} border`}>
                        {getStatusIcon(chat.status)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      {chat.agent && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <User className="h-3 w-3 text-blue-500" />
                          <span className="font-medium">{chat.agent.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(chat.created_at)}</span>
                        </div>
                        {chat.messageCount && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{chat.messageCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Detail Panel */}
        <div className="flex-1 flex flex-col bg-white">
          <AnimatePresence mode="wait">
            {!selectedChat ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-center h-full text-center p-8"
              >
                <div className="max-w-md">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a chat to view</h3>
                  <p className="text-sm text-slate-500">Choose a chat from the list to see detailed conversation and information.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chat-detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Chat Header */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                        {(selectedChat.customer?.name || selectedChat.customer_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">
                          {selectedChat.customer?.name || selectedChat.customer_name || 'Anonymous'}
                        </h2>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          {selectedChat.customer?.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              <span>{selectedChat.customer.email}</span>
                            </div>
                          )}
                          {selectedChat.customer_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{selectedChat.customer_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={`${statusColors[selectedChat.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-800'} text-sm px-3 py-1.5 border`}>
                      {getStatusIcon(selectedChat.status)}
                      <span className="ml-1.5 capitalize">{selectedChat.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>

                  {/* Chat Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedChat.agent && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <User className="h-3 w-3" />
                          <span>Agent</span>
                        </div>
                        <div className="font-semibold text-slate-900">{selectedChat.agent.name}</div>
                      </div>
                    )}
                    
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span>Started</span>
                      </div>
                      <div className="font-semibold text-slate-900 text-xs">{formatDate(selectedChat.created_at)}</div>
                    </div>

                    {selectedChat.ended_at && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <XCircle className="h-3 w-3" />
                          <span>Ended</span>
                        </div>
                        <div className="font-semibold text-slate-900 text-xs">{formatDate(selectedChat.ended_at)}</div>
                      </div>
                    )}

                    {selectedChat.rating && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>Rating</span>
                        </div>
                        <div className="font-semibold text-slate-900">{selectedChat.rating}/5</div>
                      </div>
                    )}

                    {selectedChat.customer_location && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <MapPin className="h-3 w-3" />
                          <span>Location</span>
                        </div>
                        <div className="font-semibold text-slate-900 text-xs truncate">{selectedChat.customer_location}</div>
                      </div>
                    )}

                    {selectedChat.messageCount && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <FileText className="h-3 w-3" />
                          <span>Messages</span>
                        </div>
                        <div className="font-semibold text-slate-900">{selectedChat.messageCount}</div>
                      </div>
                    )}

                    {selectedChat.tags && Array.isArray(selectedChat.tags) && selectedChat.tags.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200 col-span-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <Tag className="h-3 w-3" />
                          <span>Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedChat.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedChat.rating_feedback && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-amber-900 mb-1">Customer Feedback</div>
                          <div className="text-sm text-amber-800">{selectedChat.rating_feedback}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 bg-slate-50">
                  <div className="p-6">
                    {loadingChat ? (
                      <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-16 w-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedChat.messages && selectedChat.messages.length > 0 ? (
                      <div className="space-y-4">
                        {selectedChat.messages.map((message, idx) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex gap-3 ${message.message_type === 'system' ? 'justify-center' : ''}`}
                          >
                            {message.message_type !== 'system' && (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow">
                                {(message.sender?.name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className={`flex-1 ${message.message_type === 'system' ? 'text-center' : ''}`}>
                              {message.message_type !== 'system' && (
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-sm font-semibold text-slate-900">
                                    {message.sender?.name || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {formatTime(message.created_at)}
                                  </span>
                                </div>
                              )}
                              <div className={`inline-block px-4 py-2.5 rounded-xl ${
                                message.message_type === 'system'
                                  ? 'bg-slate-200 text-slate-700 text-sm'
                                  : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                              }`}>
                                <div className="whitespace-pre-wrap">{message.message}</div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center">
                        <div className="max-w-sm">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <MessageSquare className="h-8 w-8 text-slate-400" />
                          </div>
                          <h4 className="font-semibold text-slate-900 mb-1">No messages yet</h4>
                          <p className="text-sm text-slate-500">This chat doesn't have any messages yet.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
