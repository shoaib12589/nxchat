'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  MessageCircle, 
  Phone, 
  Video, 
  MoreVertical,
  Clock,
  Globe,
  MapPin,
  Eye,
  EyeOff,
  RefreshCw,
  UserPlus,
  UserMinus,
  ChevronUp,
  X,
  HelpCircle,
  Minimize2,
  User as UserIcon,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useSocket } from '@/contexts/SocketContext';
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
  ipAddress?: string;
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
  isTyping: boolean;
  widgetStatus?: 'minimized' | 'maximized';
  lastWidgetUpdate?: string;
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
  company?: {
    id: string;
    name: string;
  };
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  rating?: number;
  ratingFeedback?: string;
  // Enhanced tracking fields
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  keyword?: string;
  searchEngine?: string;
  landingPage?: string;
}

interface VisitorFilters {
  status: string;
  device: string;
  search: string;
}

// Helper function to get source display name and keyword
const getSourceInfo = (visitor: Visitor) => {
  // Priority: source field > search_engine > referrer domain
  let sourceName = 'Direct';
  let keyword = null;
  
  if (visitor.source) {
    sourceName = visitor.source;
    // Get keyword from visitor.keyword or visitor.term
    keyword = visitor.keyword || visitor.term || null;
  } else if (visitor.searchEngine) {
    sourceName = visitor.searchEngine;
    keyword = visitor.keyword || visitor.term || null;
  } else if (visitor.referrer && visitor.referrer !== 'Direct') {
    try {
      const url = new URL(visitor.referrer);
      const hostname = url.hostname.replace('www.', '');
      
      // Map common domains to recognizable names
      if (hostname.includes('google')) {
        sourceName = 'Google';
        keyword = visitor.keyword || visitor.term || null;
      } else if (hostname.includes('bing')) {
        sourceName = 'Bing';
        keyword = visitor.keyword || visitor.term || null;
      } else if (hostname.includes('facebook')) {
        sourceName = 'Facebook';
      } else if (hostname.includes('twitter') || hostname.includes('x.com')) {
        sourceName = 'Twitter';
      } else if (hostname.includes('linkedin')) {
        sourceName = 'LinkedIn';
      } else if (hostname.includes('youtube')) {
        sourceName = 'YouTube';
      } else if (hostname.includes('instagram')) {
        sourceName = 'Instagram';
      } else {
        sourceName = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
      }
    } catch {
      sourceName = visitor.referrer || 'Direct';
    }
  }
  
  return { sourceName, keyword };
};

// Source Badge Component with Tooltip (Zendesk-style)
const SourceBadge: React.FC<{ visitor: Visitor }> = ({ visitor }) => {
  const { sourceName, keyword } = getSourceInfo(visitor);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Get source badge color based on source name
  const getSourceColor = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('google')) return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    if (sourceLower.includes('bing')) return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    if (sourceLower.includes('facebook')) return 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700';
    if (sourceLower.includes('twitter') || sourceLower.includes('x.com')) return 'bg-gray-900 text-white border-gray-950 hover:bg-gray-800';
    if (sourceLower.includes('linkedin')) return 'bg-blue-700 text-white border-blue-800 hover:bg-blue-800';
    if (sourceLower.includes('youtube')) return 'bg-red-600 text-white border-red-700 hover:bg-red-700';
    if (sourceLower.includes('instagram')) return 'bg-pink-600 text-white border-pink-700 hover:bg-pink-700';
    if (source === 'Direct') return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
    return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
  };

  // Handle tooltip positioning and visibility
  useEffect(() => {
    if (showTooltip && keyword && tooltipRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      
      // Adjust position if tooltip goes off-screen
      if (rect.left < 0) {
        tooltip.style.left = '0';
        tooltip.style.transform = 'translateX(0)';
      } else if (rect.right > window.innerWidth) {
        tooltip.style.right = '0';
        tooltip.style.left = 'auto';
        tooltip.style.transform = 'translateX(0)';
      }
    }
  }, [showTooltip, keyword]);

  return (
    <div 
      className="relative inline-block group"
      onMouseEnter={() => keyword && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${getSourceColor(sourceName)} ${keyword ? 'cursor-help' : ''}`}
        title={keyword ? `Hover to see keyword: ${keyword}` : undefined}
      >
        <Globe className="w-3 h-3" />
        <span>{sourceName}</span>
        {keyword && (
          <Search className="w-3 h-3 opacity-60" />
        )}
      </div>
      {showTooltip && keyword && (
        <div
          ref={tooltipRef}
          className="absolute z-[9999] px-3 py-2 mt-2 text-xs text-white bg-gray-900 rounded-md shadow-xl whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center space-x-2">
            <Search className="w-3 h-3 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Search Keyword</div>
              <div className="font-semibold text-sm">{keyword}</div>
            </div>
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AccordionSectionProps {
  title: string;
  visitors: Visitor[];
  icon: string;
  iconColor: string;
  onVisitorClick: (visitor: Visitor) => void;
  formatDuration: (visitor: Visitor) => string;
  getPageTitle: (url: string) => string;
  showServedBy?: boolean;
  newMessageVisitors: Set<string>;
  blinkingChats: Set<string>;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  visitors,
  icon,
  iconColor,
  onVisitorClick,
  formatDuration,
  getPageTitle,
  showServedBy = false,
  newMessageVisitors,
  blinkingChats
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Accordion Header */}
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

      {/* Accordion Content */}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Online
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    {title === "Incoming chats" && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agent
                      </th>
                    )}
                    {showServedBy && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Served by
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Viewing
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visits
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chats
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitors.map((visitor, index) => {
                    const hasNewMessage = newMessageVisitors.has(visitor.id);
                    const isBlinking = blinkingChats.has(visitor.id);
                    
                    return (
                      <tr
                        key={`${visitor.id}-${index}`}
                        className={`cursor-pointer transition-all duration-200 ${
                          hasNewMessage 
                            ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400 shadow-sm' 
                            : 'hover:bg-gray-50'
                        } ${isBlinking ? 'animate-pulse bg-blue-100' : ''}`}
                        onClick={() => onVisitorClick(visitor)}
                      >
                      {/* Visitor Column */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg ${iconColor}`}>{icon}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                              <span>
                                {visitor.name && visitor.name.trim() && visitor.name !== 'Anonymous Visitor' 
                                  ? visitor.name 
                                  : `#${visitor.id.slice(-8)}`}
                              </span>
                              {hasNewMessage && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              )}
                              <Badge className={`text-xs ${
                                visitor.status === 'online' || visitor.status === 'idle'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : visitor.status === 'away'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              } border`}>
                                {visitor.status}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-1 mt-1">
                              <div className="w-4 h-3 bg-gray-200 rounded-sm flex items-center justify-center">
                                <span className="text-xs">🇵🇭</span>
                              </div>
                              <div className="w-4 h-4 flex items-center justify-center">
                                {visitor.device?.type === 'mobile' ? (
                                  <span className="text-xs">📱</span>
                                ) : visitor.device?.type === 'tablet' ? (
                                  <span className="text-xs">📱</span>
                                ) : (
                                  <span className="text-xs">💻</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Online Column */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            visitor.status === 'online' || visitor.status === 'idle'
                              ? 'bg-green-500 animate-pulse' 
                              : visitor.status === 'away'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                          }`} title={`Status: ${visitor.status}`}></div>
                          <span className="text-sm text-gray-900">{formatDuration(visitor)}</span>
                        </div>
                      </td>

                      {/* Brand Column */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {visitor.brandName || visitor.brand?.name || 'No Brand'}
                        </span>
                      </td>

                      {/* Agent Column (for Incoming chats) */}
                      {title === "Incoming chats" && (
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {visitor.assignedAgent?.name || '-'}
                          </span>
                        </td>
                      )}

                      {/* Served by Column */}
                      {showServedBy && (
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {visitor.assignedAgent?.name || '-'}
                          </span>
                        </td>
                      )}

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

                      {/* Source Column */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <SourceBadge visitor={visitor} />
                      </td>

                      {/* Visits Column */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {visitor.visitsCount || 1}
                        </span>
                      </td>

                      {/* Chats Column */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="text-sm text-gray-500">
                          {visitor.messagesCount > 0 ? visitor.messagesCount : '-'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function VisitorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [visitorIds, setVisitorIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [filters, setFilters] = useState<VisitorFilters>({
    status: 'all',
    device: 'all',
    search: ''
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showVisitorPanel, setShowVisitorPanel] = useState(false);
  const [minimizedChats, setMinimizedChats] = useState<Map<string, Visitor>>(new Map());
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(new Map());
  const [blinkingChats, setBlinkingChats] = useState<Set<string>>(new Set());
  const [newMessageVisitors, setNewMessageVisitors] = useState<Set<string>>(new Set());
  const [visitorMessageCounts, setVisitorMessageCounts] = useState<Map<string, number>>(new Map());
  const [visitorProfile, setVisitorProfile] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    tags: [] as string[]
  });
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  // Ensure chatMessages is always an array - safety check on every render
  useEffect(() => {
    if (!Array.isArray(chatMessages)) {
      console.warn('chatMessages is not an array, resetting to empty array:', typeof chatMessages, chatMessages);
      setChatMessages([]);
    }
  }, [chatMessages]);
  const [globalMessages, setGlobalMessages] = useState<Map<string, any[]>>(new Map());
  const [newMessage, setNewMessage] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [isVisitorTyping, setIsVisitorTyping] = useState(false);
  const [visitorTypingContent, setVisitorTypingContent] = useState<string>('');
  const [triggerSuggestions, setTriggerSuggestions] = useState<Array<{ id: number; name: string; message: string; description?: string; isFavorite?: boolean }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>('');
  const [agentJoined, setAgentJoined] = useState(false);
  const [chatSessionActive, setChatSessionActive] = useState(false);
  const [checkingAgentAssignment, setCheckingAgentAssignment] = useState(false);
  const [agentSettings, setAgentSettings] = useState<any>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now()); // For auto-updating duration display
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const agentTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedVisitorRef = useRef<Visitor | null>(null);

  // Cleanup typing timeout on unmount or visitor change
  useEffect(() => {
    return () => {
      if (agentTypingTimeoutRef.current) {
        clearTimeout(agentTypingTimeoutRef.current);
      }
      // Stop typing when component unmounts or visitor changes
      if (socket && selectedVisitor) {
        socket.emit('agent:typing', {
          visitorId: selectedVisitor.id,
          isTyping: false
        });
      }
    };
  }, [socket, selectedVisitor?.id]);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Auto-update timer for visitor online time display (updates every second)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Show browser notification
  const showBrowserNotification = (title: string, body: string, visitorId: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `visitor-${visitorId}`, // Replace previous notification from same visitor
        requireInteraction: false,
        silent: false
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Function to play notification sound
  const playNotificationSound = () => {
    try {
      // Get agent settings for notification preferences
      const soundEnabled = localStorage.getItem('agent_notification_sound_enabled') !== 'false';
      const soundFile = localStorage.getItem('agent_notification_sound') || 'default';
      const volume = parseFloat(localStorage.getItem('agent_notification_volume') || '0.5');
      
      if (!soundEnabled) return;
      
      // Create audio element
      const audio = new Audio();
      
      // Set sound file based on configuration
      let soundPath = '/sounds/notification-default.mp3';
      
      switch (soundFile) {
        case 'chime':
          soundPath = '/sounds/notification-chime.mp3';
          break;
        case 'ding':
          soundPath = '/sounds/notification-ding.mp3';
          break;
        case 'pop':
          soundPath = '/sounds/notification-pop.mp3';
          break;
        case 'bell':
          soundPath = '/sounds/notification-bell.mp3';
          break;
        default:
          soundPath = '/sounds/notification-default.mp3';
      }
      
      audio.src = soundPath;
      audio.volume = volume;
      
      // Play the sound
      audio.play().catch(error => {
        console.warn('Could not play notification sound:', error);
        // Fallback: try to play a simple beep using Web Audio API
        playFallbackSound(volume);
      });
      
    } catch (error) {
      console.warn('Error playing notification sound:', error);
      const volume = parseFloat(localStorage.getItem('agent_notification_volume') || '0.5');
      playFallbackSound(volume);
    }
  };

  // Fallback sound using Web Audio API
  const playFallbackSound = (volume: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Fallback sound also failed:', error);
    }
  };


  // Handle visitor information updates with debounced saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [savingStatus, setSavingStatus] = useState<string>('');

  const handleVisitorInfoUpdate = (field: string, value: string) => {
    if (!selectedVisitor) return;

    // Update local state immediately for responsive UI
    setSelectedVisitor(prev => prev ? { ...prev, [field]: value } : null);
    setVisitors(prev => prev.map(visitor => 
      visitor.id === selectedVisitor.id 
        ? { ...visitor, [field]: value }
        : visitor
    ));

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Show "Saving..." indicator
    setSavingStatus('Saving...');

    // Set new timeout to save after 1 second of no typing
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiClient.put(`/agent/visitors/${selectedVisitor.id}/profile`, {
          [field]: value
        });

        if (response.success) {
          console.log(`Saved ${field} to database`);
          setSavingStatus('Saved');
          // Clear the "Saved" message after 2 seconds
          setTimeout(() => {
            setSavingStatus('');
          }, 2000);
        } else {
          console.error('Failed to update visitor info:', response.message);
          setSavingStatus('Failed to save');
          toast.error('Failed to save changes');
        }
      } catch (error) {
        console.error('Error updating visitor info:', error);
        setSavingStatus('Failed to save');
        toast.error('Failed to save changes');
      }
    }, 1000); // 1 second debounce
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Track if initial fetch has been done to prevent refetch on every connection
  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    if (!socket) {
      console.warn('⚠️ Socket not available');
      return;
    }

    // Set up listeners immediately, but also listen for connection events
    const handleConnect = () => {
      console.log('🔌 Socket connected, setting up listeners');
      setupSocketListeners();
      
      // Only fetch visitors on initial connection, not on reconnections
      if (!initialFetchDoneRef.current) {
        fetchVisitors();
        initialFetchDoneRef.current = true;
      }
      
      // Rejoin visitor room if a visitor is selected
      if (selectedVisitor) {
        socket.emit('join_visitor_room', { visitorId: selectedVisitor.id });
        console.log('🔌 Rejoined visitor room on socket connect:', `visitor_${selectedVisitor.id}`);
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    
    return () => {
      // Cleanup socket listeners on unmount
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('visitor:update');
        socket.off('visitor:status');
        socket.off('visitor:typing');
        socket.off('visitor:new');
        socket.off('visitor:leave');
        socket.off('visitor:message');
        socket.off('ai:response');
        socket.off('agent:message');
        socket.off('visitor:chat:typing');
        socket.off('visitor:agent:assigned');
        socket.off('visitor:agent:unassigned');
        socket.off('widget:status');
        socket.off('visitor:typing-content');
      }
    };
  }, [socket]); // Removed selectedVisitor from dependencies to prevent refetch

  // Recalculate visitor status periodically to keep it accurate
  useEffect(() => {
    const recalculateStatuses = () => {
      setVisitors(prev => {
        if (prev.length === 0) return prev;
        
        let hasChanges = false;
        const updatedVisitors = prev.map(visitor => {
          // Calculate new status based on lastActivity
          const newStatus = calculateVisitorStatus(visitor);
          
          // Only update if status changed
          if (visitor.status !== newStatus) {
            hasChanges = true;
            return { ...visitor, status: newStatus };
          }
          
          return visitor;
        });
        
        return hasChanges ? updatedVisitors : prev;
      });
    };

    // Recalculate status every 30 seconds to keep it accurate
    const interval = setInterval(recalculateStatuses, 30 * 1000);
    
    // Initial recalculation after a short delay
    const timeout = setTimeout(recalculateStatuses, 2000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // Empty dependency array - we only want to set up the interval once

  // Track visitor activity gaps and mark inactive visitors as offline
  useEffect(() => {
    const checkVisitorActivity = () => {
      setVisitors(prev => {
        // Early return if no visitors
        if (prev.length === 0) return prev;
        
        const now = Date.now();
        // Only remove visitors who have been inactive for more than 30 minutes (truly offline/disconnected)
        // This gives time for visitors to become idle (15 min) before being removed
        const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes of no activity = truly offline
        
        let hasChanges = false;
        const updatedVisitors = prev.map(visitor => {
          // Skip if visitor is already offline
          if (visitor.status === 'offline') {
            // Remove offline visitors immediately
            hasChanges = true;
            return null;
          }
          
          // Check if visitor has last_activity timestamp
          if (visitor.lastActivity) {
            const lastActivityTime = new Date(visitor.lastActivity).getTime();
            if (isNaN(lastActivityTime)) {
              // Invalid date, remove visitor
              hasChanges = true;
              return null;
            }
            
            const timeSinceActivity = now - lastActivityTime;
            
            // Only remove if visitor has been inactive for more than 30 minutes
            // Visitors with 15-30 min inactivity will be in Idle list
            // Visitors with <15 min inactivity will be in Active list
            if (timeSinceActivity > INACTIVITY_THRESHOLD && !visitor.isTyping) {
              console.log(`🚪 Visitor ${visitor.id} removed due to extended inactivity (${Math.round(timeSinceActivity / 1000 / 60)}m). Moving to History.`);
              hasChanges = true;
              return null;
            }
          } else {
            // If no last activity timestamp but visitor is online, keep them
            // They might be new or just connected
            // Only remove if they've been in the list for a very long time without activity
            if (visitor.createdAt) {
              const createdAtTime = new Date(visitor.createdAt).getTime();
              if (!isNaN(createdAtTime)) {
                const timeSinceCreation = now - createdAtTime;
                // If visitor was created more than 30 minutes ago and has no activity, remove
                if (timeSinceCreation > INACTIVITY_THRESHOLD) {
                  hasChanges = true;
                  return null;
                }
              }
            }
          }
          
          return visitor;
        }).filter(visitor => visitor !== null); // Filter out null values
        
        // Only return updated visitors if there were actual changes
        return hasChanges ? updatedVisitors : prev;
      });
    };

    // Check every 30 seconds for truly offline visitors
    const interval = setInterval(checkVisitorActivity, 30 * 1000);
    
    // Initial check after a delay
    const timeout = setTimeout(checkVisitorActivity, 5000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []); // Empty dependency array - we only want to set up the interval once

  // Handle URL parameters for automatic chat opening
  useEffect(() => {
    console.log('🌐 URL parameter useEffect triggered');
    console.log('🌐 visitors.length:', visitors.length);
    console.log('🌐 searchParams:', searchParams.toString());
    
    const visitorParam = searchParams.get('visitor');
    console.log('🌐 visitorParam:', visitorParam);
    console.log('🌐 current selectedVisitor:', selectedVisitor?.id);
    console.log('🌐 current showVisitorPanel:', showVisitorPanel);
    
    if (visitorParam && visitors.length > 0) {
      const visitor = visitors.find(v => v.id === visitorParam);
      console.log('🌐 Found visitor in list:', visitor?.id);
      
      if (visitor) {
        // Only update state if the visitor is different from current selectedVisitor
        if (!selectedVisitor || selectedVisitor.id !== visitor.id) {
          console.log('🌐 Setting visitor from URL parameter:', visitor.id);
          setSelectedVisitor(visitor);
          setShowVisitorPanel(true);
          
          // Add visitor to minimized chats
          setMinimizedChats(prev => {
            const newMap = new Map(prev);
            newMap.set(visitor.id, visitor);
            return newMap;
          });
          
          // Clear unread messages and stop blinking for this visitor
          setUnreadMessages(prev => {
            const newMap = new Map(prev);
            newMap.delete(visitor.id);
            return newMap;
          });
          setBlinkingChats(prev => {
            const newSet = new Set(prev);
            newSet.delete(visitor.id);
            return newSet;
          });
          
          // Immediately check agent assignment for this visitor
          checkAgentAssignment(visitor.id);
        } else {
          console.log('🌐 Visitor already selected, ensuring panel is open');
          setShowVisitorPanel(true);
        }
        // Keep the URL parameter for persistence
      }
    } else if (!visitorParam && selectedVisitor) {
      console.log('🌐 No visitor param but selectedVisitor exists');
      // Don't automatically close the panel - user clicked minimize, keep it minimized
      // The panel will only close if the user explicitly clicks the close button
      // This prevents the chat from closing when visitor messages arrive
    }
  }, [visitors, searchParams]);

  // Apply filters using useMemo for optimization (prevents unnecessary re-renders)
  const filteredVisitorsMemo = useMemo(() => {
    let filtered = [...visitors];

    if (filters.status !== 'all') {
      filtered = filtered.filter(visitor => visitor.status === filters.status);
    }

    if (filters.device !== 'all') {
      filtered = filtered.filter(visitor => visitor.device.type === filters.device);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(visitor => 
        visitor.name.toLowerCase().includes(searchTerm) ||
        visitor.email?.toLowerCase().includes(searchTerm) ||
        visitor.currentPage.toLowerCase().includes(searchTerm) ||
        visitor.location.city.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }, [visitors, filters]);

  // Update filteredVisitors state only when memoized value actually changes
  useEffect(() => {
    setFilteredVisitors(filteredVisitorsMemo);
  }, [filteredVisitorsMemo]);

  // Keep ref in sync with selectedVisitor state
  useEffect(() => {
    selectedVisitorRef.current = selectedVisitor;
  }, [selectedVisitor]);

  // Effect to sync chat messages when selectedVisitor changes
  useEffect(() => {
    console.log('🔄 selectedVisitor useEffect triggered');
    console.log('🔄 selectedVisitor:', selectedVisitor?.id);
    console.log('🔄 showVisitorPanel:', showVisitorPanel);
    
    if (selectedVisitor) {
      console.log('🔄 Processing selectedVisitor:', selectedVisitor.id);
      
      // Always load messages from API when visitor is selected to ensure we have the latest
      // This ensures previous messages are always visible
      console.log('📥 Loading messages from API for visitor:', selectedVisitor.id);
      loadChatMessages(selectedVisitor.id, true);
      
      // Check if agent is already assigned to this visitor (only if not already checking and not already joined)
      // Skip check if agent is already joined to prevent disabling textarea during typing
      if (!checkingAgentAssignment && !agentJoined) {
        checkAgentAssignment(selectedVisitor.id);
      }
      
      // Clear typing preview when switching visitors
      setVisitorTypingContent('');
      
      // Join visitor-specific room to receive typing content events
      if (socket && socket.connected) {
        socket.emit('join_visitor_room', { visitorId: selectedVisitor.id });
        console.log('🔌 Joined visitor room for typing content:', `visitor_${selectedVisitor.id}`);
      }
      
      // Scroll to bottom when opening chat
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } else {
      console.log('No visitor selected, clearing chat messages');
      setChatMessages([]);
      setVisitorTypingContent('');
      setAgentJoined(false);
      setChatSessionActive(false);
      setCheckingAgentAssignment(false);
    }
  }, [selectedVisitor?.id]); // Only depend on visitor ID to avoid unnecessary reloads

  // Separate effect to sync messages when globalMessages changes (without triggering agent assignment check)
  // Use a ref to track the previous messages to prevent unnecessary updates
  const prevGlobalMessagesRef = useRef<Map<string, any[]>>(new Map());
  useEffect(() => {
    if (selectedVisitor) {
      const globalMessagesForVisitor = globalMessages.get(selectedVisitor.id);
      const prevMessagesForVisitor = prevGlobalMessagesRef.current.get(selectedVisitor.id);
      
      // Only update if messages actually changed
      if (JSON.stringify(globalMessagesForVisitor) !== JSON.stringify(prevMessagesForVisitor)) {
        // Ensure it's an array
        const messagesArray = Array.isArray(globalMessagesForVisitor) ? globalMessagesForVisitor : [];
        
        if (messagesArray.length > 0) {
          console.log('Syncing updated messages from global store for visitor:', selectedVisitor.id, 'Messages:', messagesArray.length);
          setChatMessages(messagesArray);
        }
        
        // Update ref
        prevGlobalMessagesRef.current = new Map(globalMessages);
      }
    }
  }, [globalMessages, selectedVisitor]);

  // Debug effect to track agentJoined state changes
  useEffect(() => {
    console.log('🔄 agentJoined state changed:', agentJoined);
    console.log('🔄 chatSessionActive state changed:', chatSessionActive);
    console.log('🔄 checkingAgentAssignment state changed:', checkingAgentAssignment);
  }, [agentJoined, chatSessionActive, checkingAgentAssignment]);

  // Handle window resize for dynamic chat width calculation
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle page refresh warning for minimized chats
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only show warning if there are minimized chats
      if (minimizedChats.size > 0) {
        const message = 'Are you sure? If you reload this page, all opened minimized chats will be lost.';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    // Handle browser navigation (back/forward buttons)
    const handlePopState = (event: PopStateEvent) => {
      if (minimizedChats.size > 0) {
        const confirmed = window.confirm(
          'Are you sure? If you navigate away from this page, all opened minimized chats will be lost.'
        );
        if (!confirmed) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Add a state to the history to detect navigation attempts
    window.history.pushState(null, '', window.location.href);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [minimizedChats]);

  const handleNewMessage = (visitorId: string) => {
    // Find the visitor who sent the message
    const visitor = visitors.find(v => v.id === visitorId);
    if (!visitor) return;

    // Only add unread count if chat window is not open for this visitor
    if (!showVisitorPanel || selectedVisitor?.id !== visitorId) {
      // Always automatically open this visitor's minimized chat for new messages
      setMinimizedChats(prev => {
        const newMap = new Map(prev);
        // Only add if not already minimized
        if (!newMap.has(visitorId)) {
          newMap.set(visitorId, visitor);
        }
        return newMap;
      });

      setUnreadMessages(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(visitorId) || 0;
        newMap.set(visitorId, currentCount + 1);
        return newMap;
      });
    }
  };

  const setupSocketListeners = () => {
    if (!socket) {
      console.warn('⚠️ Socket not available for setting up listeners');
      return;
    }
    
    console.log('🔧 Setting up socket listeners, socket connected:', socket.connected);

    // Clean up existing listeners first to prevent duplicates
    socket.off('visitor:update');
    socket.off('visitor:status');
    socket.off('visitor:typing');
    socket.off('visitor:new');
    socket.off('visitor:leave');
    socket.off('visitor:message');
    socket.off('ai:response');
    socket.off('agent:message');
    socket.off('visitor:chat:typing');
    socket.off('visitor:agent:assigned');
    socket.off('visitor:agent:unassigned');
    socket.off('widget:status');
        socket.off('visitor:typing-content'); // Also clean up typing content listener
        socket.off('message:seen');

    // Listen for visitor updates
    socket.on('visitor:update', (visitor: Visitor) => {
      console.log('🔄 Visitor update received:', visitor);
      
      setVisitors(prev => {
        // Check if visitor is becoming active (status changed from offline/away to online/idle)
        const currentVisitor = prev.find(v => v.id === visitor.id);
        const wasInactive = currentVisitor && (currentVisitor.status === 'offline' || currentVisitor.status === 'away');
        
        // Transform visitor data to ensure consistent format
        const transformedVisitor: Visitor = {
          ...visitor,
          // Explicitly map IP address (handle both snake_case and camelCase)
          ipAddress: visitor.ipAddress || (visitor as any).ip_address || 'Unknown',
          // Ensure location is properly structured
          location: visitor.location && typeof visitor.location === 'object' && !Array.isArray(visitor.location)
            ? {
                country: visitor.location.country || 'Unknown',
                city: visitor.location.city || 'Unknown',
                region: visitor.location.region || 'Unknown'
              }
            : { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
          brandName: visitor.brandName || (visitor.brand && typeof visitor.brand === 'object' ? visitor.brand.name : null) || (visitor as any).brand_name || 'No Brand',
          brand: (visitor.brand && typeof visitor.brand === 'object' && visitor.brand !== null)
            ? {
                id: visitor.brand.id || (visitor as any).brand_id,
                name: visitor.brand.name || visitor.brandName || (visitor as any).brand_name || 'No Brand',
                primaryColor: visitor.brand.primaryColor || (visitor.brand as any).primary_color || '#3B82F6'
              }
            : ((visitor as any).brand_id 
                ? {
                    id: (visitor as any).brand_id,
                    name: visitor.brandName || (visitor as any).brand_name || 'No Brand',
                    primaryColor: '#3B82F6'
                  }
                : undefined)
        };
        
        const existingIndex = prev.findIndex(v => v.id === visitor.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          // Merge existing visitor data with the update, but preserve brand if update doesn't have it
          const existingVisitor = updated[existingIndex];
          const merged = { ...existingVisitor, ...transformedVisitor };
          // If the update doesn't include brand data but existing visitor has it, preserve it
          if ((!merged.brand || merged.brandName === 'No Brand') && existingVisitor.brand && existingVisitor.brandName && existingVisitor.brandName !== 'No Brand') {
            merged.brand = existingVisitor.brand;
            merged.brandName = existingVisitor.brandName;
          }
          // Preserve isTyping if not in update
          if (transformedVisitor.isTyping === undefined) {
            merged.isTyping = existingVisitor.isTyping;
          }
          // Update lastActivity if provided
          if (visitor.lastActivity || (visitor as any).last_activity) {
            merged.lastActivity = visitor.lastActivity || (visitor as any).last_activity;
          }
          // Recalculate status based on updated lastActivity
          merged.status = calculateVisitorStatus(merged);
          
          // Check if visitor is becoming active after status recalculation
          const isNowActive = merged.status !== 'offline' && merged.status !== 'away';
          if (wasInactive && isNowActive) {
            console.log('🔔 Visitor became active, playing notification sound');
            playNotificationSound();
          }
          
          // Only update if there are actual changes to prevent unnecessary re-renders
          if (JSON.stringify(merged) !== JSON.stringify(existingVisitor)) {
            updated[existingIndex] = merged;
            console.log('✅ Updated existing visitor:', visitor.id, 'Status:', merged.status, 'Brand:', merged.brandName);
            return updated;
          }
          return prev; // No changes, return previous state
        } else {
          // Recalculate status for new visitor
          transformedVisitor.lastActivity = transformedVisitor.lastActivity || (visitor as any).last_activity;
          transformedVisitor.status = calculateVisitorStatus(transformedVisitor);
          console.log('✅ Added new visitor:', visitor.id, 'Status:', transformedVisitor.status, 'Brand:', transformedVisitor.brandName);
          return [...prev, transformedVisitor];
        }
      });
    });

    // Listen for visitor status changes
    socket.on('visitor:status', (data: { visitorId: string; status: string }) => {
      setVisitors(prev => {
        // If visitor goes offline, remove them from the list (they should be in History)
        if (data.status === 'offline') {
          console.log(`🚪 Visitor ${data.visitorId} went offline, removing from list`);
          return prev.filter(visitor => visitor.id !== data.visitorId);
        }
        
        // Update status for online visitors
        return prev.map(visitor => {
          if (visitor.id === data.visitorId) {
            // Only update if status actually changed
            if (visitor.status === data.status) {
              return visitor; // No change, return same object reference
            }
            return { ...visitor, status: data.status as any };
          }
          return visitor;
        });
      });
      
      // Add status message to chat if this is the selected visitor (but don't do this for every status update)
      // Only show important status changes
      if (selectedVisitor && data.visitorId === selectedVisitor.id && 
          (data.status === 'offline' || data.status === 'online')) {
        setChatMessages(prev => {
          // Check if this status message already exists to prevent duplicates
          const exists = prev.some(msg => 
            msg.isStatusMessage && 
            msg.content?.includes(`Status changed to ${data.status}`) &&
            new Date(msg.timestamp).getTime() > Date.now() - 5000 // Within last 5 seconds
          );
          if (exists) return prev;
          
          const statusMessage = {
            id: `visitor-status-${Date.now()}`,
            sender: 'visitor',
            content: `📱 Status changed to ${data.status}`,
            timestamp: new Date().toISOString(),
            visitorId: data.visitorId,
            isStatusMessage: true
          };
          
          return [...prev, statusMessage];
        });
      }
    });

    // Listen for visitor typing status
    socket.on('visitor:typing', (data: { visitorId: string; isTyping: boolean }) => {
      setVisitors(prev => prev.map(visitor => 
        visitor.id === data.visitorId 
          ? { ...visitor, isTyping: data.isTyping }
          : visitor
      ));
      
      // Also update selectedVisitor if it's the same visitor
      setSelectedVisitor(prev => {
        if (prev && prev.id === data.visitorId) {
          return { ...prev, isTyping: data.isTyping };
        }
        return prev;
      });
      
      // Update isVisitorTyping state for chat display
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        setIsVisitorTyping(data.isTyping);
      }
      
      // Only clear typing content when visitor explicitly stops typing (not just a pause)
      // The widget will send an empty content message after inactivity, so we don't need to clear here
      // This ensures the preview stays visible during brief pauses in typing
    });

    // Listen for visitor typing content (live preview)
    socket.on('visitor:typing-content', (data: { visitorId: string; content: string; timestamp: string }) => {
      // Use ref to get current selectedVisitor value (avoid stale closure)
      const currentSelectedVisitor = selectedVisitorRef.current;
      
      // Normalize IDs for comparison (handle both string and number formats)
      const eventVisitorId = String(data.visitorId || '').trim();
      const selectedVisitorId = currentSelectedVisitor ? String(currentSelectedVisitor.id || '').trim() : '';
      
      console.log('🔤 [FRONTEND] Received visitor:typing-content event:', { 
        eventVisitorId: eventVisitorId,
        selectedVisitorId: selectedVisitorId,
        contentLength: data.content?.length || 0,
        hasContent: !!data.content && data.content.length > 0,
        idsMatch: eventVisitorId === selectedVisitorId,
        hasSelectedVisitor: !!currentSelectedVisitor
      });
      
      // Match visitor IDs (normalized comparison)
      if (currentSelectedVisitor && eventVisitorId && selectedVisitorId && eventVisitorId === selectedVisitorId) {
        const previewContent = data.content || '';
        
        // Only update if there's content, or explicitly clear if empty string is sent
        if (previewContent.length > 0) {
          console.log('✅ [FRONTEND] Matched! Updating typing preview:', { 
            contentLength: previewContent.length,
            preview: previewContent.substring(0, 50) + (previewContent.length > 50 ? '...' : '')
          });
          // Update the live typing preview - keep it visible while typing
          setVisitorTypingContent(previewContent);
          // Scroll to bottom to show the typing preview
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        } else {
          // Only clear if explicitly sent as empty (after inactivity timeout)
          console.log('🗑️ [FRONTEND] Clearing typing preview (empty content received after inactivity)');
          setVisitorTypingContent('');
        }
      } else {
        console.log('❌ [FRONTEND] No match:', { 
          reason: !currentSelectedVisitor ? 'no selected visitor' : 
                  !eventVisitorId ? 'no event visitor ID' :
                  !selectedVisitorId ? 'no selected visitor ID' :
                  eventVisitorId !== selectedVisitorId ? 'IDs do not match' : 'unknown',
          eventVisitorId: eventVisitorId,
          selectedVisitorId: selectedVisitorId
        });
      }
    });

    // Listen for new visitors
    socket.on('visitor:new', (visitor: Visitor) => {
      console.log('Received visitor:new event:', visitor.id, visitor.name);
      
      // Play notification sound for new visitor if enabled in settings
      playNotificationSound();
      
      // Transform visitor data to ensure consistent format (especially for brand)
      const transformedVisitor: Visitor = {
        ...visitor,
        // Explicitly map IP address (handle both snake_case and camelCase)
        ipAddress: visitor.ipAddress || (visitor as any).ip_address || 'Unknown',
        // Ensure location is properly structured
        location: visitor.location && typeof visitor.location === 'object' && !Array.isArray(visitor.location)
          ? {
              country: visitor.location.country || 'Unknown',
              city: visitor.location.city || 'Unknown',
              region: visitor.location.region || 'Unknown'
            }
          : { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
        brandName: visitor.brandName || visitor.brand?.name || (visitor as any).brand_name || 'No Brand',
        brand: visitor.brand || (visitor as any).brand_id ? { 
          id: (visitor as any).brand_id, 
          name: visitor.brandName || (visitor as any).brand_name || 'No Brand',
          primaryColor: visitor.brand?.primaryColor || '#3B82F6'
        } : undefined
      };
      
      // Update lastActivity and calculate status
      transformedVisitor.lastActivity = transformedVisitor.lastActivity || (visitor as any).last_activity;
      transformedVisitor.status = calculateVisitorStatus(transformedVisitor);
      
      setVisitors(prev => {
        // Check if visitor already exists to prevent duplicates
        const existingVisitor = prev.find(v => v.id === visitor.id);
        if (existingVisitor) {
          console.log('Visitor already exists, updating instead of adding:', visitor.id);
          // Update existing visitor, but preserve brand data if new data doesn't have it
          return prev.map(v => {
            if (v.id === visitor.id) {
              const merged = { ...v, ...transformedVisitor };
              // If the update doesn't include brand data but existing visitor has it, preserve it
              if ((!merged.brand || merged.brandName === 'No Brand') && v.brand && v.brandName && v.brandName !== 'No Brand') {
                merged.brand = v.brand;
                merged.brandName = v.brandName;
              }
              // Recalculate status after merge
              merged.status = calculateVisitorStatus(merged);
              return merged;
            }
            return v;
          });
        }
        console.log('Adding new visitor:', visitor.id, 'Status:', transformedVisitor.status);
        return [transformedVisitor, ...prev];
      });
      setVisitorIds(prev => new Set([...prev, visitor.id]));
      toast.success(`New visitor: ${visitor.name}`);
      
      // Add status message to chat if this is the selected visitor
      if (selectedVisitor && visitor.id === selectedVisitor.id) {
        const statusMessage = {
          id: `visitor-join-${Date.now()}`,
          sender: 'visitor',
          content: '👋 Joined the chat',
          timestamp: new Date().toISOString(),
          visitorId: visitor.id,
          isStatusMessage: true
        };
        
        setChatMessages(prev => [...prev, statusMessage]);
      }
    });

    // Listen for visitor leaving
    socket.on('visitor:leave', (visitorId: string) => {
      console.log('🚪 Visitor leaving:', visitorId);
      // Remove visitor from list (they should be in History)
      // When visitor leaves, they should disappear from Visitor page
      setVisitors(prev => prev.filter(visitor => visitor.id !== visitorId));
      
      // Also remove from minimized chats
      setMinimizedChats(prev => {
        const newMap = new Map(prev);
        newMap.delete(visitorId);
        return newMap;
      });
      
      // If this was the selected visitor, clear selection
      if (selectedVisitor && visitorId === selectedVisitor.id) {
        setSelectedVisitor(null);
        setShowVisitorPanel(false);
        router.push('/agent/visitors');
      }
      
      // Add status message to chat if this is the selected visitor
      if (selectedVisitor && visitorId === selectedVisitor.id) {
        const statusMessage = {
          id: `visitor-leave-${Date.now()}`,
          sender: 'system',
          content: '🚪 Visitor Left',
          timestamp: new Date().toISOString(),
          visitorId: visitorId,
          isStatusMessage: true
        };
        
        setChatMessages(prev => [...prev, statusMessage]);
        
        // Scroll to bottom to show the message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    });

    // Listen for AI-only visitor session ended (automatic cleanup)
    socket.on('visitor:session-ended', (data: { visitorId: string; reason: string }) => {
      console.log('AI-only visitor session ended:', data);
      
      // Add status message to chat if this is the selected visitor
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        const statusMessage = {
          id: `chat-ended-${Date.now()}`,
          sender: 'system',
          content: '🔚 Chat Ended by Visitor',
          timestamp: new Date().toISOString(),
          visitorId: data.visitorId,
          isStatusMessage: true
        };
        
        setChatMessages(prev => [...prev, statusMessage]);
        
        // Scroll to bottom to show the message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
      
      // Remove from visitors list
      setVisitors(prev => prev.filter(visitor => visitor.id !== data.visitorId));
      setVisitorIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.visitorId);
        return newSet;
      });
      
      // Remove from minimized chats
      setMinimizedChats(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.visitorId);
        return newMap;
      });
      
      // If this was the selected visitor, close the chat panel
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        // Don't close immediately, show the message first
        setTimeout(() => {
          setSelectedVisitor(null);
          setShowVisitorPanel(false);
          router.push('/agent/visitors');
        }, 2000);
      }
      
      // Clear unread messages and other state
      setUnreadMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.visitorId);
        return newMap;
      });
      setBlinkingChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.visitorId);
        return newSet;
      });
    });

    // Listen for visitor messages
    socket.on('visitor:message', (data: { visitorId: string; message: string; sender: string; timestamp: string; messageId: string; file_url?: string; file_name?: string; file_size?: number; message_type?: string }) => {
      console.log('Received visitor message:', data);
      console.log('Current selected visitor:', selectedVisitor?.id);
      console.log('Message visitor ID:', data.visitorId);
      
      // Clear typing preview only when actual message is sent (not during typing)
      // Only clear if this is the selected visitor and the message sender is 'visitor'
      if (selectedVisitor && data.visitorId === selectedVisitor.id && data.sender === 'visitor') {
        console.log('🗑️ Clearing typing preview - visitor sent message');
        setVisitorTypingContent('');
      }
      
      const visitorMessage = {
        id: data.messageId,
        content: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
        visitorId: data.visitorId,
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
        message_type: data.message_type
      };
      
      // Update visitor message count
      setVisitorMessageCounts(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(data.visitorId) || 0;
        newMap.set(data.visitorId, currentCount + 1);
        return newMap;
      });
      
      // Store message globally for all visitors
      setGlobalMessages(prev => {
        const newMap = new Map(prev);
        const existingMessages = newMap.get(data.visitorId) || [];
        newMap.set(data.visitorId, [...existingMessages, visitorMessage]);
        return newMap;
      });
      
      // Add visual notification for new visitor message
      setNewMessageVisitors(prev => {
        const newSet = new Set(prev);
        newSet.add(data.visitorId);
        return newSet;
      });
      
      // Check if this is the first message from this visitor BEFORE incrementing
      const currentMessageCount = visitorMessageCounts.get(data.visitorId) || 0;
      const isFirstMessage = currentMessageCount === 0;
      
      // Update visitor message count
      setVisitorMessageCounts(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(data.visitorId) || 0;
        newMap.set(data.visitorId, currentCount + 1);
        return newMap;
      });
      
      // Only blink for the FIRST message from a visitor
      if (isFirstMessage) {
        console.log('First message from visitor, adding blinking effect:', data.visitorId);
        setBlinkingChats(prev => {
          const newSet = new Set(prev);
          newSet.add(data.visitorId);
          return newSet;
        });
        
        // Auto-stop blinking after 5 seconds
        setTimeout(() => {
          setBlinkingChats(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.visitorId);
            return newSet;
          });
        }, 5000);
      }
      
      // Increment unread message count
      setUnreadMessages(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(data.visitorId) || 0;
        newMap.set(data.visitorId, currentCount + 1);
        return newMap;
      });
      
      // If this visitor is currently selected, add to current chat immediately
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        console.log('Adding visitor message to current chat:', visitorMessage);
        setChatMessages(prev => [...prev, visitorMessage]);
        
        // Scroll to bottom to show the new message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        // Clear visual notifications for current visitor
        setNewMessageVisitors(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.visitorId);
          return newSet;
        });
        setBlinkingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.visitorId);
          return newSet;
        });
        setUnreadMessages(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.visitorId);
          return newMap;
        });
        
        // Play notification sound for new visitor message
        playNotificationSound();
      } else {
        console.log('Visitor message not for current visitor:', { selectedVisitorId: selectedVisitor?.id, messageVisitorId: data.visitorId });
        
        // Update visitor message count in the visitors list for real-time updates
        setVisitors(prev => prev.map(visitor => 
          visitor.id === data.visitorId 
            ? { ...visitor, messagesCount: (visitor.messagesCount || 0) + 1 }
            : visitor
        ));
        
        // Handle unread messages and blinking for minimized chats
        handleNewMessage(data.visitorId);
        
        // Show browser notification for new visitor messages
        const visitorName = visitors.find(v => v.id === data.visitorId)?.name || 'Visitor';
        showBrowserNotification(
          'New Message',
          `New message from ${visitorName}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}`,
          data.visitorId
        );
        
        // Play notification sound for new visitor message (even if not currently selected)
        playNotificationSound();
        
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    });

    // Listen for AI responses
    socket.on('ai:response', (data: { visitorId: string; response: string; messageId?: string; timestamp?: string }) => {
      // Check if visitor is assigned to an agent - if so, ignore AI response
      const visitor = visitors.find(v => v.id === data.visitorId);
      if (visitor && visitor.assignedAgent) {
        console.log('🚫 Ignoring AI response for assigned visitor:', data.visitorId, 'assigned to:', visitor.assignedAgent.name);
        return;
      }

      const aiMessage = {
        id: data.messageId || Date.now().toString(),
        content: data.response,
        sender: 'ai',
        timestamp: data.timestamp || new Date().toISOString(),
        visitorId: data.visitorId
      };
      
      // Store AI response globally for all visitors
      setGlobalMessages(prev => {
        const newMap = new Map(prev);
        const existingMessages = newMap.get(data.visitorId) || [];
        newMap.set(data.visitorId, [...existingMessages, aiMessage]);
        return newMap;
      });
      
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        setChatMessages(prev => [...prev, aiMessage]);
        
        // Scroll to bottom when AI response arrives
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        console.log('AI response not for current visitor:', { selectedVisitorId: selectedVisitor?.id, responseVisitorId: data.visitorId });
        
        // Update visitor message count for AI responses too
        setVisitors(prev => prev.map(visitor => 
          visitor.id === data.visitorId 
            ? { ...visitor, messagesCount: (visitor.messagesCount || 0) + 1 }
            : visitor
        ));
      }
    });

    // Listen for message seen status updates
    socket.on('message:seen', (data: { visitorId: string; messageId: string; timestamp: string }) => {
      console.log('📬 Message seen status update received:', data);
      
      // Update message seen status in global messages
      setGlobalMessages(prev => {
        const newMap = new Map(prev);
        const existingMessages = newMap.get(data.visitorId) || [];
        const updatedMessages = existingMessages.map(msg => {
          // Match by exact ID or by string conversion (handles number/string mismatches)
          const msgIdStr = String(msg.id);
          const dataIdStr = String(data.messageId);
          if (msgIdStr === dataIdStr || msg.id === data.messageId) {
            console.log(`✅ Updating message ${msg.id} to seen status`);
            return { ...msg, isSeen: true, seenAt: data.timestamp };
          }
          return msg;
        });
        newMap.set(data.visitorId, updatedMessages);
        return newMap;
      });
      
      // Update message seen status in current chat if this visitor is selected
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        console.log(`📬 Updating seen status for current chat - visitor ${data.visitorId}, message ${data.messageId}`);
        setChatMessages(prev => {
          const updated = prev.map(msg => {
            // Match by exact ID or by string conversion (handles number/string mismatches)
            const msgIdStr = String(msg.id);
            const dataIdStr = String(data.messageId);
            if (msgIdStr === dataIdStr || msg.id === data.messageId) {
              console.log(`✅ Updating message ${msg.id} in chat to seen status`);
              return { ...msg, isSeen: true, seenAt: data.timestamp };
            }
            return msg;
          });
          return updated;
        });
      } else {
        console.log(`⚠️ Message seen update not for current visitor. Current: ${selectedVisitor?.id}, Update: ${data.visitorId}`);
      }
    });

    // Listen for agent messages (from other agents or current agent)
    socket.on('agent:message', (data: { visitorId: string; message: string; sender: string; agentId: string; agentName: string; timestamp: string; messageId: string }) => {
      console.log('Received agent message:', data);
      
      const agentMessage = {
        id: data.messageId,
        content: data.message,
        sender: 'agent',
        senderName: data.agentName,
        senderId: data.agentId,
        timestamp: data.timestamp,
        visitorId: data.visitorId,
        isSeen: false // Initially unseen until visitor views it
      };
      
      // Check if this is from the current agent (confirmation of their own message)
      const isCurrentAgent = String(data.agentId) === String(user?.id);
      
      // Store message globally for all visitors
      setGlobalMessages(prev => {
        const newMap = new Map(prev);
        const existingMessages = newMap.get(data.visitorId) || [];
        
        // Check for duplicates by ID
        const messageExistsById = existingMessages.some(msg => msg.id === data.messageId);
        if (messageExistsById) {
          return prev;
        }
        
        // If this is from current agent, check for pending message with same content and update it
        if (isCurrentAgent) {
          const pendingMessageIndex = existingMessages.findIndex(msg => 
            msg.content === data.message && 
            msg.sender === 'agent' &&
            msg.id !== data.messageId &&
            (!msg.id || String(msg.id).startsWith('temp_') || (typeof msg.id === 'string' && msg.id.length < 10))
          );
          
          if (pendingMessageIndex !== -1) {
            // Replace pending message with confirmed one
            const updatedMessages = [...existingMessages];
            updatedMessages[pendingMessageIndex] = agentMessage;
            newMap.set(data.visitorId, updatedMessages);
            return newMap;
          }
        }
        
        // Otherwise add as new message
        newMap.set(data.visitorId, [...existingMessages, agentMessage]);
        return newMap;
      });
      
      // If this visitor is currently selected, update current chat immediately
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        console.log('Processing agent message for current chat:', agentMessage, 'isCurrentAgent:', isCurrentAgent);
        
        setChatMessages(prev => {
          // Check for duplicates by ID
          const messageExistsById = prev.some(msg => msg.id === data.messageId);
          if (messageExistsById) {
            console.log('Message already exists by ID, skipping');
            return prev;
          }
          
          // If this is from current agent, check for pending message with same content and replace it
          if (isCurrentAgent) {
            const pendingMessageIndex = prev.findIndex(msg => 
              msg.content === data.message && 
              msg.sender === 'agent' &&
              msg.id !== data.messageId &&
              (!msg.id || String(msg.id).startsWith('temp_') || (typeof msg.id === 'string' && msg.id.length < 10))
            );
            
            if (pendingMessageIndex !== -1) {
              console.log('Replacing pending message with confirmed message:', pendingMessageIndex);
              // Replace pending message with confirmed one
              const updatedMessages = [...prev];
              updatedMessages[pendingMessageIndex] = agentMessage;
              return updatedMessages;
            }
          }
          
          // Otherwise add as new message (from another agent)
          console.log('Adding new agent message (from another agent)');
          return [...prev, agentMessage];
        });
        
        // Scroll to bottom when agent message arrives
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        console.log('Agent message not for current visitor:', { selectedVisitorId: selectedVisitor?.id, messageVisitorId: data.visitorId });
      }
    });

    // Listen for visitor typing in chat
    socket.on('visitor:chat:typing', (data: { visitorId: string; isTyping: boolean }) => {
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        setIsVisitorTyping(data.isTyping);
        // Also update selectedVisitor typing status
        setSelectedVisitor(prev => {
          if (prev && prev.id === data.visitorId) {
            return { ...prev, isTyping: data.isTyping };
          }
          return prev;
        });
      }
    });

    // Listen for agent join events (when agent joins a chat - including transferred chats)
    socket.on('agent:join', (data: { visitorId: string; agentId: string; agentName: string; tenantId: number }) => {
      console.log('Agent join event received:', data);
      
      // If this is the current agent joining and this visitor is selected, show join message
      const currentSelectedVisitor = selectedVisitorRef.current;
      if (currentSelectedVisitor && 
          data.visitorId === currentSelectedVisitor.id && 
          String(data.agentId) === String(user?.id)) {
        const joinMessage = {
          id: `agent-join-${Date.now()}`,
          content: `${data.agentName} joined the chat.`,
          sender: 'system',
          timestamp: new Date().toISOString(),
          visitorId: data.visitorId,
          isStatusMessage: true
        };
        
        console.log('Adding agent join message to chat:', joinMessage);
        setChatMessages(prev => {
          // Check if this message already exists
          const exists = prev.some(msg => 
            msg.isStatusMessage && 
            msg.content === joinMessage.content && 
            new Date(msg.timestamp).getTime() > Date.now() - 3000
          );
          if (exists) {
            console.log('Agent join message already exists');
            return prev;
          }
          return [...prev, joinMessage];
        });
        
        // Update agent joined state
        setAgentJoined(true);
        setChatSessionActive(true);
        
        // Update visitor status from 'waiting_for_agent' to 'online'
        setVisitors(prev => prev.map(visitor => 
          visitor.id === data.visitorId 
            ? { ...visitor, status: 'online' }
            : visitor
        ));
        
        setSelectedVisitor(prev => {
          if (prev && prev.id === data.visitorId) {
            return { ...prev, status: 'online' };
          }
          return prev;
        });
        
        // Scroll to bottom to show the message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    });

    // Listen for agent assignment changes
    socket.on('visitor:agent:assigned', (data: { visitorId: string; agentId: string; agentName: string }) => {
      console.log('🔄 Agent assignment received:', data);
      setVisitors(prev => prev.map(visitor => 
        visitor.id === data.visitorId 
          ? { 
              ...visitor, 
              assignedAgent: { 
                id: data.agentId, 
                name: data.agentName 
              } 
            }
          : visitor
      ));
      
      // Show notification for agent assignment
      toast.success(`Visitor assigned to ${data.agentName}`);
    });

    // Listen for agent unassignment
    socket.on('visitor:agent:unassigned', (data: { visitorId: string }) => {
      console.log('🔄 Agent unassignment received:', data);
      setVisitors(prev => prev.map(visitor => 
        visitor.id === data.visitorId 
          ? { ...visitor, assignedAgent: undefined }
          : visitor
      ));
      
      // Show notification for agent unassignment
      toast.info('Visitor unassigned from agent');
    });

    // Listen for visitor end chat event
    socket.on('visitor:end-chat', (data: { visitorId: string; tenantId: number; endedBy: string; rating?: number; feedback?: string; message?: any }) => {
      console.log('Visitor ended chat received:', data);
      
      // Use ref to get current selectedVisitor (not stale closure)
      const currentSelectedVisitor = selectedVisitorRef.current;
      
      // If this is the currently selected visitor, add system message
      if (currentSelectedVisitor && data.visitorId === currentSelectedVisitor.id) {
        // Use message from socket event if available, otherwise create default
        const endMessage = data.message ? {
          ...data.message,
          isStatusMessage: true,
          sender: 'system',
          content: data.message.content || 'Visitor ended the chat.'
        } : {
          id: `visitor-end-${Date.now()}`,
          content: 'Visitor ended the chat.',
          sender: 'system',
          timestamp: new Date().toISOString(),
          visitorId: data.visitorId,
          isStatusMessage: true,
          messageType: 'system',
          metadata: {
            event_type: 'chat_ended',
            ended_by: data.endedBy || 'visitor',
            rating: data.rating,
            has_feedback: !!data.feedback
          }
        };
        
        console.log('Adding visitor end chat message to chat:', endMessage);
        setChatMessages(prev => {
          // Check if this message already exists (check by content and timestamp, not just content)
          const exists = prev.some(msg => 
            (msg.sender === 'system' || msg.messageType === 'system') &&
            (msg.content === endMessage.content || msg.content?.includes('ended the chat')) &&
            new Date(msg.timestamp).getTime() > Date.now() - 10000 // Within last 10 seconds
          );
          if (exists) {
            console.log('Visitor end chat message already exists, skipping duplicate');
            return prev;
          }
          console.log('Adding new visitor end chat message to chatMessages');
          return [...prev, endMessage];
        });
        
        // Remove visitor from list (they should be in History page)
        // When visitor ends chat or goes offline, they should disappear from Visitor page
        setVisitors(prev => prev.filter(visitor => visitor.id !== data.visitorId));
        
        // Also remove from minimized chats
        setMinimizedChats(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.visitorId);
          return newMap;
        });
        
        // If this was the selected visitor, clear selection
        if (selectedVisitor && selectedVisitor.id === data.visitorId) {
          setSelectedVisitor(null);
          setShowVisitorPanel(false);
          router.push('/agent/visitors');
        }
        
        // Update agent joined state
        setAgentJoined(false);
        setChatSessionActive(false);
        
        // Scroll to bottom to show the message
        setTimeout(() => {
          scrollToBottom();
        }, 200);
        
        // Show notification
        toast.info('Visitor ended the chat');
        
        // Reload messages from database to get the persisted system message (after a longer delay)
        // This ensures our immediate message is shown first, then gets replaced by the persisted one
        setTimeout(() => {
          console.log('Reloading messages from database after visitor ended chat');
          loadChatMessages(data.visitorId);
        }, 1000);
      } else {
        console.log('Visitor end chat received but not for selected visitor:', {
          receivedVisitorId: data.visitorId,
          selectedVisitorId: currentSelectedVisitor?.id
        });
        // Remove visitor from list even if not selected (they should be in History)
        setVisitors(prev => prev.filter(visitor => visitor.id !== data.visitorId));
        
        // Also remove from minimized chats
        setMinimizedChats(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.visitorId);
          return newMap;
        });
      }
    });

    // Listen for widget status updates (minimize/maximize)
    socket.on('widget:status', (data: { visitorId: string; status: string; timestamp: string }) => {
      console.log('Widget status update received:', data);
      console.log('Current selectedVisitorRef:', selectedVisitorRef.current?.id);
      
      // Update visitor widget status in the list
      setVisitors(prev => prev.map(visitor => {
        if (visitor.id === data.visitorId) {
          return {
            ...visitor,
            widgetStatus: data.status as 'minimized' | 'maximized',
            lastWidgetUpdate: data.timestamp
          };
        }
        return visitor;
      }));
      
      // Immediately show status message in chat if this is the selected visitor
      // Use ref to always get the current value, not closure value
      const currentSelectedVisitor = selectedVisitorRef.current;
      if (currentSelectedVisitor && data.visitorId === currentSelectedVisitor.id) {
        let content = '';
        if (data.status === 'maximized') {
          content = 'Visitor reopened the chat window';
        } else if (data.status === 'minimized') {
          content = 'Visitor minimized the chat window';
        } else {
          content = `Widget status: ${data.status}`;
        }
        
        // Create status message for immediate display
        const statusMessage = {
          id: `widget-status-${Date.now()}-${Math.random()}`,
          sender: 'system',
          content: content,
          timestamp: data.timestamp || new Date().toISOString(),
          visitorId: data.visitorId,
          isStatusMessage: true
        };
        
        console.log('Adding widget status message to chat immediately:', statusMessage);
        setChatMessages(prev => {
          // Prevent duplicates by checking if a recent status message with same content exists
          const recentExists = prev.some(msg => 
            msg.isStatusMessage && 
            msg.content === content && 
            new Date(msg.timestamp).getTime() > Date.now() - 3000 // Within last 3 seconds
          );
          if (recentExists) {
            console.log('Duplicate status message prevented');
            return prev;
          }
          return [...prev, statusMessage];
        });
        
        // Also update global messages store
        setGlobalMessages(prev => {
          const newMap = new Map(prev);
          const existingMessages = newMap.get(data.visitorId) || [];
          // Check for duplicates in global store too
          const recentExists = existingMessages.some(msg => 
            msg.isStatusMessage && 
            msg.content === content && 
            new Date(msg.timestamp).getTime() > Date.now() - 3000
          );
          if (!recentExists) {
            newMap.set(data.visitorId, [...existingMessages, statusMessage]);
          }
          return newMap;
        });
        
        // Scroll to bottom to show the message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    });

    // Listen for chat transfer notifications
    socket.on('chat:transfer_notification', (data: { visitorId: string; agentName: string; message: string; timestamp: string; type: string }) => {
      console.log('Chat transfer notification received:', data);
      
      // Add transfer message to chat if this visitor is currently selected
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        const transferMessage = {
          id: `transfer-${Date.now()}`,
          content: data.message,
          sender: 'system',
          timestamp: data.timestamp,
          visitorId: data.visitorId,
          isTransferMessage: true,
          agentName: data.agentName
        };
        
        setChatMessages(prev => [...prev, transferMessage]);
        
        // Scroll to bottom to show transfer message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
      
      // Show toast notification
      toast.info(`Chat transferred to ${data.agentName}`, {
        duration: 5000,
        position: 'top-right'
      });
    });

    // Listen for chat takeover notifications (when another agent takes over a chat you're handling)
    socket.on('chat:transferred', (data: { visitorId: string; agentId: string; agentName: string; message: string; timestamp: string; type: string }) => {
      console.log('Chat takeover notification received:', data);
      
      // If this visitor is currently selected, show takeover message
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        const takeoverMessage = {
          id: `takeover-${Date.now()}`,
          content: data.message || `${data.agentName} has taken over this chat.`,
          sender: 'system',
          timestamp: data.timestamp || new Date().toISOString(),
          visitorId: data.visitorId,
          isStatusMessage: true
        };
        
        setChatMessages(prev => [...prev, takeoverMessage]);
        
        // Disable agent joined state since another agent took over
        setAgentJoined(false);
        setChatSessionActive(false);
        
        // Update visitor state
        setVisitors(prev => prev.map(visitor => 
          visitor.id === data.visitorId 
            ? { 
                ...visitor, 
                assignedAgent: {
                  id: data.agentId,
                  name: data.agentName
                },
                status: 'online' // New agent is now handling
              }
            : visitor
        ));
        
        // Update selected visitor if it matches
        setSelectedVisitor(prev => {
          if (prev && prev.id === data.visitorId) {
            return {
              ...prev,
              assignedAgent: {
                id: data.agentId,
                name: data.agentName
              },
              status: 'online'
            };
          }
          return prev;
        });
        
        // Scroll to bottom to show the message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        toast.warning(`Another agent (${data.agentName}) has taken over this chat.`, {
          duration: 5000,
          position: 'top-right'
        });
      }
    });

    // Listen for transfer messages
    socket.on('transfer:message', (data: { visitorId: string; message: any }) => {
      console.log('Transfer message received:', data);
      
      // Add transfer message to chat if this visitor is currently selected
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        setChatMessages(prev => [...prev, data.message]);
        
        // Scroll to bottom to show transfer message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    });

    // Listen for general visitor transfer notifications (for agent-to-agent transfers with specific agent)
    socket.on('visitor:transfer_notification', (data: { visitorId: string; agentId?: string; agentName?: string; message: string; timestamp: string; type: string }) => {
      console.log('Visitor transfer notification received:', data);
      
      // Update visitor status if this visitor is in our list
      setVisitors(prev => prev.map(visitor => {
        if (visitor.id === data.visitorId) {
          // If agentId is provided, it's a specific agent transfer
          // If not, it's a pool transfer (no specific agent assigned)
          return {
            ...visitor,
            assignedAgent: data.agentId && data.agentName ? {
              id: data.agentId,
              name: data.agentName
            } : undefined, // No assigned agent for pool transfers
            status: 'waiting_for_agent' as const
          };
        }
        return visitor;
      }));
      
      // Add blinking effect for transferred visitor
      setBlinkingChats(prev => {
        const newSet = new Set(prev);
        newSet.add(data.visitorId);
        return newSet;
      });
      
      // Auto-stop blinking after 10 seconds for transfers
      setTimeout(() => {
        setBlinkingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.visitorId);
          return newSet;
        });
      }, 10000);
    });

    // Listen for visitor:transfer event (AI to agent pool - no specific agent)
    socket.on('visitor:transfer', (data: { visitorId: string; tenantId: number; message?: string; timestamp: string; type: string }) => {
      console.log('Visitor transfer to pool received:', data);
      
      // Update visitor status - set to waiting_for_agent with NO assigned agent
      setVisitors(prev => prev.map(visitor => {
        if (visitor.id === data.visitorId) {
          return {
            ...visitor,
            assignedAgent: undefined, // No specific agent - in transfer pool
            status: 'waiting_for_agent' as const
          };
        }
        return visitor;
      }));
      
      // Update selectedVisitor if it's the current one
      setSelectedVisitor(prev => {
        if (prev && prev.id === data.visitorId) {
          return {
            ...prev,
            assignedAgent: undefined,
            status: 'waiting_for_agent' as const
          };
        }
        return prev;
      });
      
      // Add blinking effect for transferred visitor
      setBlinkingChats(prev => {
        const newSet = new Set(prev);
        newSet.add(data.visitorId);
        return newSet;
      });
      
      // Auto-stop blinking after 10 seconds
      setTimeout(() => {
        setBlinkingChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.visitorId);
          return newSet;
        });
      }, 10000);
      
      // Show toast notification
      toast.info('New chat available in Transfer Chats', {
        duration: 5000,
        position: 'top-right'
      });
    });

    return () => {
      socket.off('visitor:update');
      socket.off('visitor:status');
      socket.off('visitor:typing');
      socket.off('visitor:new');
      socket.off('visitor:leave');
      socket.off('visitor:session-ended');
      socket.off('visitor:message');
      socket.off('ai:response');
      socket.off('visitor:chat:typing');
      socket.off('visitor:agent:assigned');
      socket.off('visitor:agent:unassigned');
      socket.off('widget:status');
      socket.off('chat:transfer_notification');
      socket.off('transfer:message');
      socket.off('visitor:transfer_notification');
      socket.off('visitor:transfer');
      socket.off('agent:join');
      socket.off('chat:transferred');
      socket.off('visitor:end-chat');
    };
  };

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      let response;
      
      // Use different API endpoint based on user role
      if (user?.role === 'super_admin') {
        response = await apiClient.getSuperAdminVisitors();
      } else {
        response = await apiClient.getVisitors();
      }
      
      if (response.success) {
        // Transform the data to match our interface
        const transformedVisitors = response.data.map((visitor: any) => {
          const transformed: Visitor = {
            ...visitor,
            name: visitor.name || 'Anonymous Visitor',
            currentPage: visitor.current_page || visitor.currentPage || 'Unknown page',
            lastActivity: visitor.last_activity || visitor.lastActivity,
            sessionDuration: visitor.session_duration ? visitor.session_duration.toString() : visitor.sessionDuration || '0',
            messagesCount: visitor.messages_count || visitor.messagesCount || 0,
            visitsCount: visitor.visits_count || visitor.visitsCount || 1,
            isTyping: visitor.is_typing || visitor.isTyping || false,
          // Explicitly map IP address (handle both snake_case and camelCase)
          ipAddress: (visitor.ipAddress && visitor.ipAddress !== 'Unknown') 
            ? visitor.ipAddress 
            : ((visitor.ip_address && visitor.ip_address !== 'Unknown') 
              ? visitor.ip_address 
              : null),
          // Ensure location is properly structured
          location: visitor.location && typeof visitor.location === 'object' && !Array.isArray(visitor.location)
            ? {
                country: visitor.location.country || 'Unknown',
                city: visitor.location.city || 'Unknown',
                region: visitor.location.region || 'Unknown'
              }
            : { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
          device: visitor.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
          createdAt: visitor.created_at || visitor.createdAt,
          lastWidgetUpdate: visitor.last_widget_update || visitor.lastWidgetUpdate,
          widgetStatus: visitor.widget_status || visitor.widgetStatus,
          // Explicitly map referrer
          referrer: visitor.referrer || 'Direct',
          // Explicitly map tracking fields
          source: visitor.source,
          medium: visitor.medium,
          campaign: visitor.campaign,
          content: visitor.content,
          term: visitor.term,
          keyword: visitor.keyword,
          searchEngine: visitor.search_engine,
          landingPage: visitor.landing_page,
          // Explicitly map brand data - ensure brand object is properly structured
          brand: visitor.brand && typeof visitor.brand === 'object' && visitor.brand !== null
            ? {
                id: visitor.brand.id,
                name: visitor.brand.name || 'No Brand',
                primaryColor: visitor.brand.primaryColor || visitor.brand.primary_color || '#3B82F6'
              }
            : null,
          brandName: visitor.brandName || (visitor.brand && typeof visitor.brand === 'object' ? visitor.brand.name : null) || 'No Brand'
          };
          
          // Calculate status dynamically based on lastActivity
          // This ensures status is always accurate regardless of what the backend returns
          transformed.status = calculateVisitorStatus(transformed);
          
          return transformed;
        });
        
        // Remove duplicates based on visitor ID
        const uniqueVisitors = transformedVisitors.filter((visitor: Visitor, index: number, self: Visitor[]) => 
          index === self.findIndex((v: Visitor) => v.id === visitor.id)
        );
        
        // Debug: Check for duplicates
        const duplicateIds = transformedVisitors.filter((visitor: Visitor, index: number, self: Visitor[]) => 
          index !== self.findIndex((v: Visitor) => v.id === visitor.id)
        );
        
        if (duplicateIds.length > 0) {
          console.warn('Found duplicate visitors in API response:', duplicateIds.map((v: Visitor) => v.id));
        }
        
        console.log(`Loaded ${uniqueVisitors.length} unique visitors`);
        
        // Filter out offline visitors and visitors who have been inactive for too long
        // Only show visitors who are currently online/active
        const now = Date.now();
        const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes - only show truly inactive visitors as offline
        const onlineVisitors = uniqueVisitors.filter((v: Visitor) => {
          // Exclude offline visitors
          if (v.status === 'offline') return false;
          
          // Exclude visitors who have been inactive for more than 30 minutes (should be in history)
          if (v.lastActivity) {
            const lastActivityTime = new Date(v.lastActivity).getTime();
            const timeSinceActivity = now - lastActivityTime;
            // Only exclude if they're truly inactive (not just idle)
            if (timeSinceActivity > INACTIVITY_THRESHOLD && !v.isTyping) {
              return false;
            }
          }
          
          return true;
        });
        console.log(`Filtered to ${onlineVisitors.length} active online visitors`);
        
        setVisitors(onlineVisitors);
        setVisitorIds(new Set(onlineVisitors.map((v: Visitor) => v.id)));
        
        // Initialize visitor message counts based on existing message counts
        const initialMessageCounts = new Map<string, number>();
        uniqueVisitors.forEach((visitor: Visitor) => {
          initialMessageCounts.set(visitor.id, visitor.messagesCount || 0);
        });
        setVisitorMessageCounts(initialMessageCounts);
      } else {
        toast.error(response.message || 'Failed to fetch visitors');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch visitors');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...visitors];

    if (filters.status !== 'all') {
      filtered = filtered.filter(visitor => visitor.status === filters.status);
    }

    if (filters.device !== 'all') {
      filtered = filtered.filter(visitor => visitor.device.type === filters.device);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(visitor => 
        visitor.name.toLowerCase().includes(searchTerm) ||
        visitor.email?.toLowerCase().includes(searchTerm) ||
        visitor.currentPage.toLowerCase().includes(searchTerm) ||
        visitor.location.city.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredVisitors(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVisitors();
    setRefreshing(false);
  };

  const handleAssignAgent = async (visitorId: string, agentId: string) => {
    try {
      const response = await apiClient.assignVisitorToAgent(visitorId, agentId);
      if (response.success) {
        toast.success('Visitor assigned to agent');
        fetchVisitors();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign visitor');
    }
  };

  const handleStartChat = (visitor: Visitor) => {
    console.log('🚀 handleStartChat called for visitor:', visitor.id);
    console.log('🚀 Current selectedVisitor:', selectedVisitor?.id);
    console.log('🚀 Current showVisitorPanel:', showVisitorPanel);
    
    // Set the selected visitor and show the panel
    setSelectedVisitor(visitor);
    setShowVisitorPanel(true);
    
    console.log('🚀 After setting state - selectedVisitor will be:', visitor.id);
    console.log('🚀 After setting state - showVisitorPanel will be: true');
    
    // Add visitor to minimized chats
    setMinimizedChats(prev => {
      const newMap = new Map(prev);
      newMap.set(visitor.id, visitor);
      return newMap;
    });
    
    // Clear unread messages for this visitor
    setUnreadMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(visitor.id);
      return newMap;
    });
    
    // Add blinking effect when agent joins the chat
    console.log('Agent joining chat, adding blinking effect for visitor:', visitor.id);
    setBlinkingChats(prev => {
      const newSet = new Set(prev);
      newSet.add(visitor.id);
      return newSet;
    });
    
    // Auto-stop blinking after 5 seconds
    setTimeout(() => {
      setBlinkingChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitor.id);
        return newSet;
      });
    }, 5000);
    setNewMessageVisitors(prev => {
      const newSet = new Set(prev);
      newSet.delete(visitor.id);
      return newSet;
    });
    
    // Update URL to include visitor parameter
    router.push(`/agent/visitors?visitor=${visitor.id}`);
    console.log('🚀 URL updated to:', `/agent/visitors?visitor=${visitor.id}`);
  };

  const handleCloseChat = () => {
    setShowVisitorPanel(false);
    // Keep minimized chat open - don't remove from minimizedChats
    // setSelectedVisitor(null); // Keep visitor selected for minimized chat
    
    // Update URL to remove visitor parameter
    router.push('/agent/visitors');
  };

  const handleCloseMinimizedChat = (visitorId: string) => {
    // Remove specific visitor from minimized chats
    setMinimizedChats(prev => {
      const newMap = new Map(prev);
      newMap.delete(visitorId);
      return newMap;
    });
    
    // If this was the selected visitor, clear selection
    if (selectedVisitor && selectedVisitor.id === visitorId) {
      setSelectedVisitor(null);
      setShowVisitorPanel(false);
      router.push('/agent/visitors');
    }
  };

  const handleExpandMinimizedChat = (visitorId: string) => {
    const visitor = minimizedChats.get(visitorId);
    if (visitor) {
      setSelectedVisitor(visitor);
      setShowVisitorPanel(true);
      router.push(`/agent/visitors?visitor=${visitorId}`);
      
      // Clear unread messages and stop blinking when expanding
      setUnreadMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(visitorId);
        return newMap;
      });
      setBlinkingChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitorId);
        return newSet;
      });
    }
  };

  const handleViewVisitor = (visitorId: string) => {
    // Find visitor and set as selected for dialog
    const visitor = visitors.find(v => v.id === visitorId);
    if (visitor) {
      setSelectedVisitor(visitor);
    }
  };

  const checkAgentAssignment = async (visitorId: string) => {
    // Prevent multiple simultaneous calls
    if (checkingAgentAssignment) {
      console.log('⚠️ Agent assignment check already in progress, skipping...');
      return;
    }
    
    setCheckingAgentAssignment(true);
    try {
      const response = await apiClient.get(`/agent/visitors/${visitorId}`);
      if (response.success && response.data) {
        const visitor = response.data;
        console.log('Checking agent assignment for visitor:', visitorId);
        console.log('Visitor assignedAgent:', visitor.assignedAgent);
        console.log('Current user ID:', user?.id);
        console.log('User ID type:', typeof user?.id);
        console.log('Assigned agent ID type:', typeof visitor.assignedAgent?.id);
        
        // For transferred chats (status 'waiting_for_agent'), ANY agent can take over by typing
        // This enables unlimited transfers
        if (visitor.status === 'waiting_for_agent') {
          // This is a transferred chat - any agent can take over
          // Don't set agentJoined automatically - they need to type to join
          setAgentJoined(false);
          setChatSessionActive(false);
          console.log('⚠️ Transferred chat - ANY agent can take over by typing (unlimited transfers enabled)');
        } else if (visitor.assignedAgent && String(visitor.assignedAgent.id) === String(user?.id)) {
          // Agent is already assigned and chat is active (not transferred)
          setAgentJoined(true);
          setChatSessionActive(true);
          console.log('✅ Agent is already assigned to this visitor, chat session active');
        } else if (visitor.assignedAgent && String(visitor.assignedAgent.id) !== String(user?.id)) {
          // Another agent is assigned and chat is active
          setAgentJoined(false);
          setChatSessionActive(false);
          console.log('❌ Another agent is assigned to this visitor');
        } else {
          // No agent assigned
          setAgentJoined(false);
          setChatSessionActive(false);
          console.log('❌ No agent assigned to this visitor');
        }
      }
    } catch (error) {
      console.error('Error checking agent assignment:', error);
      setAgentJoined(false);
      setChatSessionActive(false);
    } finally {
      setCheckingAgentAssignment(false);
    }
  };


  const loadChatMessages = async (visitorId: string, forceReload: boolean = false) => {
    try {
      console.log('📥 Loading chat messages for visitor:', visitorId, 'forceReload:', forceReload);
      
      // Use the proper API method
      const response = await apiClient.getVisitorMessages(visitorId, { limit: 1000 });
      
      if (response.success) {
        // Backend returns: { success: true, data: { messages: [...], hasMore, total, nextCursor } }
        const messages = response.data?.messages || response.data?.data || [];
        
        console.log('📥 Received messages from API:', messages.length);
        
        // Ensure it's an array and transform system messages to match frontend format
        const messagesArray = (Array.isArray(messages) ? messages : []).map(msg => ({
          ...msg,
          // Mark system messages so they render correctly
          isStatusMessage: msg.sender === 'system' || msg.messageType === 'system',
          // Use content if available, otherwise message
          content: msg.content || msg.message || '',
          // Ensure timestamp is in ISO format
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
          // Handle seen status - for agent messages, check if visitor has read it
          isSeen: msg.sender === 'agent' ? (msg.isRead || msg.is_read || msg.isSeen || false) : undefined,
          // Explicitly include file attachment fields
          file_url: msg.file_url || msg.fileUrl || null,
          file_name: msg.file_name || msg.fileName || null,
          file_size: msg.file_size || msg.fileSize || null,
          message_type: msg.message_type || msg.messageType || 'text'
        })).reverse(); // Reverse to show oldest first (messages come DESC from API)
        
        console.log('📥 Processed messages array:', messagesArray.length);
        
        setChatMessages(messagesArray);
        
        // Also store in global messages for consistency
        setGlobalMessages(prev => {
          const newMap = new Map(prev);
          newMap.set(visitorId, messagesArray);
          return newMap;
        });
        
        // Scroll to bottom after loading messages
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        console.error('❌ Failed to load messages - API returned success: false');
        setChatMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading chat messages:', error);
      setChatMessages([]); // Set empty array on error
      toast.error('Failed to load chat messages');
    }
  };

  // Search triggers for suggestions
  const searchTriggers = async (searchText: string) => {
    try {
      const response = await apiClient.searchTriggers(searchText);
      if (response.success && response.data && response.data.length > 0) {
        setTriggerSuggestions(response.data);
        setShowSuggestions(true);
        setSelectedSuggestionIndex(0);
        // Set the first suggestion message as the current suggestion
        setCurrentSuggestion(response.data[0].message || '');
      } else {
        setShowSuggestions(false);
        setTriggerSuggestions([]);
        setCurrentSuggestion('');
      }
    } catch (error) {
      console.error('Error searching triggers:', error);
      setShowSuggestions(false);
      setTriggerSuggestions([]);
      setCurrentSuggestion('');
    }
  };

  // Select trigger suggestion
  const selectTriggerSuggestion = () => {
    if (currentSuggestion) {
      setNewMessage(currentSuggestion);
      setShowSuggestions(false);
      setTriggerSuggestions([]);
      setCurrentSuggestion('');
      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedVisitor) return;
    
    const messageContent = newMessage.trim();
    setNewMessage('');
    
    // Restore focus to textarea to ensure placeholder text behaves correctly
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 10);
    
    // Add agent message immediately with temporary ID
    // This will be replaced with the real ID when the socket confirmation arrives
    const agentMessage = {
      id: `temp_${Date.now()}`,
      content: messageContent,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      visitorId: selectedVisitor.id,
      senderId: user?.id,
      senderName: user?.name,
      isSeen: false // Initially unseen until visitor views it
    };
    setChatMessages(prev => [...prev, agentMessage]);
    
    // Scroll to bottom when agent sends message
    setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    // Also store in global messages
    setGlobalMessages(prev => {
      const newMap = new Map(prev);
      const existingMessages = newMap.get(selectedVisitor.id);
      const messagesArray = Array.isArray(existingMessages) ? existingMessages : [];
      newMap.set(selectedVisitor.id, [...messagesArray, agentMessage]);
      return newMap;
    });
    
    try {
      // Send message to visitor via widget
      console.log('Sending agent message:', { 
        visitorId: selectedVisitor.id, 
        message: messageContent,
        agentId: user?.id,
        agentName: user?.name 
      });
      
      const response = await apiClient.post(`/agent/visitors/${selectedVisitor.id}/messages`, {
        message: messageContent,
        sender: 'agent'
      });
      
      if (response.success && response.data) {
        console.log('Agent message sent successfully to visitor', response.data);
        // The socket event will handle updating the message with the real ID
        // We don't need to add it again here as the socket handler will replace the temp message
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAgentJoin = async (visitorId: string) => {
    try {
      // Set agentJoined immediately to prevent textarea from being disabled
      setAgentJoined(true);
      setChatSessionActive(true);
      
      // Update visitor's assigned agent status immediately
      setVisitors(prev => prev.map(visitor => 
        visitor.id === visitorId 
          ? { 
              ...visitor, 
              assignedAgent: { 
                id: String(user?.id || ''), 
                name: user?.name || 'Agent' 
              } 
            }
          : visitor
      ));

      // Notify backend that agent joined (disconnect AI for this visitor)
      await apiClient.post(`/agent/visitors/${visitorId}/agent-join`, {
        agentId: user?.id,
        agentName: user?.name
      });
      
      // Emit socket event to notify widget
      if (socket) {
        socket.emit('agent:join', {
          visitorId: visitorId,
          agentId: user?.id,
          agentName: user?.name
        });
      }
      
      // Reload messages from database to get the persisted system message
      setTimeout(() => {
        loadChatMessages(visitorId);
      }, 200);
    } catch (error) {
      console.error('Error notifying agent join:', error);
      // On error, still keep agentJoined true to allow continued typing
      // The user can retry sending a message
    }
  };

  const handleBanVisitor = async () => {
    if (!selectedVisitor) return;
    
    try {
      // Confirm ban action
      const confirmed = window.confirm(
        `Are you sure you want to ban this visitor?\n\nIP Address: ${selectedVisitor.ipAddress || 'Unknown'}\n\nThis will hide the chat widget from this visitor permanently.`
      );
      
      if (!confirmed) return;
      
      console.log('Banning visitor:', selectedVisitor.id);
      
      // Send ban request to backend
      const response = await apiClient.banVisitor(selectedVisitor.id);
      
      if (response.success) {
        // Remove visitor from list
        const bannedVisitorId = selectedVisitor.id;
        setVisitors(prev => prev.filter(visitor => visitor.id !== bannedVisitorId));
        
        // Also remove from minimized chats
        setMinimizedChats(prev => {
          const newMap = new Map(prev);
          newMap.delete(bannedVisitorId);
          return newMap;
        });
        
        // Clear selection and close panel
        setSelectedVisitor(null);
        setShowVisitorPanel(false);
        setAgentJoined(false);
        setChatSessionActive(false);
        
        toast.success('Visitor banned successfully. The chat widget will no longer be visible to this visitor.');
        console.log('Visitor banned successfully');
      } else {
        toast.error(response.message || 'Failed to ban visitor');
      }
    } catch (error: any) {
      console.error('Error banning visitor:', error);
      toast.error(error.response?.data?.message || 'Failed to ban visitor');
    }
  };

  const handleEndChat = async () => {
    if (!selectedVisitor) return;
    
    try {
      console.log('Ending chat for visitor:', selectedVisitor.id);
      
      // Send end chat request to backend
      const response = await apiClient.post(`/agent/visitors/${selectedVisitor.id}/agent-leave`, {
        agentId: user?.id,
        agentName: user?.name
      });
      
      if (response.success) {
        // Reset agent state
        setAgentJoined(false);
        setChatSessionActive(false);
        
        // Remove visitor from list (they should be in History page)
        // When agent ends chat, visitor should disappear from Visitor page
        const endedVisitorId = selectedVisitor.id;
        setVisitors(prev => prev.filter(visitor => visitor.id !== endedVisitorId));
        
        // Also remove from minimized chats
        setMinimizedChats(prev => {
          const newMap = new Map(prev);
          newMap.delete(endedVisitorId);
          return newMap;
        });
        
        // Clear selection and close panel
        setSelectedVisitor(null);
        setShowVisitorPanel(false);
        router.push('/agent/visitors');
        
        // Reload messages from database to get the persisted system message
        setTimeout(() => {
          loadChatMessages(endedVisitorId);
        }, 200);
        
        toast.success('Chat ended successfully. Visitor moved to History.');
        console.log('Chat ended successfully');
      } else {
        console.error('Failed to end chat:', response.message);
        toast.error('Failed to end chat');
      }
    } catch (error) {
      console.error('Error ending chat:', error);
      toast.error('Failed to end chat');
    }
  };

  const fetchAvailableAgents = async () => {
    try {
      const response = await apiClient.getAgentsList();
      if (response.success) {
        // Filter out current agent
        const agents = response.data.filter((agent: any) => agent.id !== user?.id);
        setAvailableAgents(agents);
      }
    } catch (error: any) {
      console.error('Failed to fetch agents:', error);
      toast.error('Failed to load agents');
    }
  };

  const handleTransferVisitor = async (newAgentId: string) => {
    if (!selectedVisitor) return;

    try {
      setTransferring(true);
      
      // Call transfer API
      const response = await apiClient.assignVisitorToAgent(selectedVisitor.id, newAgentId);
      
      if (response.success) {
        toast.success('Visitor transferred successfully');
        setShowTransferDialog(false);
        
        // Add transfer message to chat
        const transferMessage = {
          id: `transfer-${Date.now()}`,
          content: `Chat transferred to ${availableAgents.find(a => a.id === newAgentId)?.name || 'another agent'}`,
          sender: 'system',
          timestamp: new Date().toISOString(),
          visitorId: selectedVisitor.id,
          isTransferMessage: true
        };
        
        setChatMessages(prev => [...prev, transferMessage]);
        
        // Update visitor assignment with correct status for transfer
        setVisitors(prev => prev.map(visitor => 
          visitor.id === selectedVisitor.id 
            ? { 
                ...visitor, 
                assignedAgent: {
                  id: newAgentId,
                  name: availableAgents.find(a => a.id === newAgentId)?.name || 'Unknown Agent'
                },
                status: 'waiting_for_agent' // Set status to indicate transfer
              }
            : visitor
        ));
        
        // Update selected visitor with correct status
        setSelectedVisitor(prev => prev ? {
          ...prev,
          assignedAgent: {
            id: newAgentId,
            name: availableAgents.find(a => a.id === newAgentId)?.name || 'Unknown Agent'
          },
          status: 'waiting_for_agent' // Set status to indicate transfer
        } : null);
        
        // Reset agent joined status since visitor is now assigned to another agent
        setAgentJoined(false);
      } else {
        toast.error(response.message || 'Failed to transfer visitor');
      }
    } catch (error: any) {
      console.error('Error transferring visitor:', error);
      toast.error(error.message || 'Failed to transfer visitor');
    } finally {
      setTransferring(false);
    }
  };

  const handleUpdateVisitorProfile = async () => {
    if (!selectedVisitor) return;
    
    try {
      const response = await apiClient.put(`/agent/visitors/${selectedVisitor.id}/profile`, visitorProfile);
      if (response.success) {
        toast.success('Visitor profile updated successfully');
        // Update the visitor in the list
        setVisitors(prev => prev.map(v => 
          v.id === selectedVisitor.id 
            ? { ...v, ...visitorProfile }
            : v
        ));
      }
    } catch (error) {
      console.error('Error updating visitor profile:', error);
      toast.error('Failed to update visitor profile');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'desktop': return '💻';
      default: return '💻';
    }
  };

  const formatDuration = (visitor: Visitor) => {
    // Use currentTime state to ensure the duration updates automatically
    const now = currentTime;
    const createdAt = visitor.createdAt ? new Date(visitor.createdAt).getTime() : null;
    
    if (!createdAt || isNaN(createdAt)) {
      return 'Just now';
    }
    
    const diffInSeconds = Math.floor((now - createdAt) / 1000);
    
    // If visitor is offline, show session duration instead (static)
    if (visitor.status === 'offline' && visitor.sessionDuration) {
      const seconds = parseInt(visitor.sessionDuration);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    }
    
    // For online/away/idle visitors, show live time since first widget load (auto-updates)
    if (diffInSeconds < 0) return 'Just now';
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    
    const minutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'Just now';
    }
  };

  const getPageTitle = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract title from pathname
      if (pathname === '/' || pathname === '') {
        return 'Homepage';
      }
      
      // Remove leading slash and split by slashes
      const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
      
      if (segments.length === 0) {
        return 'Homepage';
      }
      
      // Get the last segment and format it
      const lastSegment = segments[segments.length - 1];
      
      // Remove file extensions
      const title = lastSegment.replace(/\.[^/.]+$/, '');
      
      // Convert hyphens and underscores to spaces and capitalize
      const formattedTitle = title
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      // If it's too long, truncate it
      if (formattedTitle.length > 30) {
        return formattedTitle.substring(0, 30) + '...';
      }
      
      return formattedTitle || 'Page';
    } catch (error) {
      // If URL parsing fails, try to extract from the string
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      
      if (lastPart && lastPart !== '') {
        const title = lastPart.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        return title.charAt(0).toUpperCase() + title.slice(1);
      }
      
      return 'Page';
    }
  };

  // Visitor categorization functions
  // Get transferred visitors - visitors that have been transferred by AI to agent pool
  // A visitor is transferred if they have status 'waiting_for_agent' and NO assigned agent
  // This means the chat is in the transfer pool, visible to all online agents
  // Manual agent joins set status to 'online' and assign an agent, so they don't appear here
  const getTransferredVisitors = () => {
    return visitors.filter(visitor => {
      // A visitor is considered transferred if:
      // 1. Their status is 'waiting_for_agent' (indicates AI transfer to pool)
      // 2. They have NO assigned agent (null or undefined) - means it's in the pool for all agents
      // Agent-to-agent transfers have assignedAgent set, so they're handled differently
      const hasNoAssignedAgent = !visitor.assignedAgent || !visitor.assignedAgent.id;
      const isTransferred = visitor.status === 'waiting_for_agent' && hasNoAssignedAgent;
      
      if (isTransferred) {
        console.log(`🔍 Transferred visitor (in pool): visitor ${visitor.id}:`, {
          assignedAgent: visitor.assignedAgent,
          status: visitor.status,
          hasNoAssignedAgent,
          isTransferred
        });
      }
      
      return isTransferred;
    });
  };

  // Get active visitors - visitors who are currently online and active
  // A visitor stays active as long as they are online and have activity within 15 minutes
  // Visitors remain in active list until they become idle (15+ min inactive) or go offline
  // Calculate visitor status based on lastActivity
  const calculateVisitorStatus = (visitor: Visitor): 'online' | 'idle' | 'away' | 'offline' | 'waiting_for_agent' => {
    // Preserve special statuses that shouldn't be recalculated
    if (visitor.status === 'waiting_for_agent' || visitor.status === 'offline') {
      return visitor.status;
    }

    // If visitor is typing, they're definitely online
    if (visitor.isTyping) {
      return 'online';
    }

    // If no lastActivity, default to online (new visitor)
    if (!visitor.lastActivity) {
      return 'online';
    }

    const now = Date.now();
    const lastActivityTime = new Date(visitor.lastActivity).getTime();
    
    // Invalid date, default to online
    if (isNaN(lastActivityTime)) {
      return 'online';
    }

    const timeSinceActivity = now - lastActivityTime;
    const IDLE_THRESHOLD = 15 * 60 * 1000; // 15 minutes
    const OFFLINE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    // If activity is very recent (within 15 min), they're online
    if (timeSinceActivity < IDLE_THRESHOLD && timeSinceActivity >= 0) {
      return 'online';
    }

    // If activity is 15-30 minutes ago, they're idle
    if (timeSinceActivity >= IDLE_THRESHOLD && timeSinceActivity < OFFLINE_THRESHOLD) {
      return 'idle';
    }

    // If activity is > 30 minutes, they should be offline (but we'll keep them as idle for now)
    // The cleanup effect will remove them
    if (timeSinceActivity >= OFFLINE_THRESHOLD) {
      return 'idle'; // Will be filtered out by the cleanup effect
    }

    // Future date or invalid, default to online
    return 'online';
  };

  const getActiveVisitors = () => {
    const now = currentTime; // Use currentTime for real-time updates
    const IDLE_THRESHOLD = 15 * 60 * 1000; // 15 minutes of inactivity = idle
    
    return visitors.filter(visitor => {
      // Skip offline visitors (they should be in History)
      if (visitor.status === 'offline') return false;
      
      // Skip transferred visitors (they should be in Transfer Chats accordion)
      // Skip if status is 'waiting_for_agent' AND no assigned agent (in transfer pool)
      if (visitor.status === 'waiting_for_agent' && (!visitor.assignedAgent || !visitor.assignedAgent.id)) return false;
      
      // If visitor is actively typing, they are definitely active
      if (visitor.isTyping) return true;
      
      // Check if visitor has recent activity (within last 15 minutes)
      let hasRecentActivity = false;
      if (visitor.lastActivity) {
        const lastActivityTime = new Date(visitor.lastActivity).getTime();
        if (!isNaN(lastActivityTime)) {
          const timeSinceActivity = now - lastActivityTime;
          hasRecentActivity = timeSinceActivity < IDLE_THRESHOLD && timeSinceActivity >= 0;
        }
      }
      
      // Check if widget status changed recently (minimized/maximized) - keep in active
      let hasRecentWidgetActivity = false;
      if (visitor.lastWidgetUpdate) {
        const lastWidgetUpdateTime = new Date(visitor.lastWidgetUpdate).getTime();
        if (!isNaN(lastWidgetUpdateTime)) {
          hasRecentWidgetActivity = (now - lastWidgetUpdateTime) < IDLE_THRESHOLD && (now - lastWidgetUpdateTime) >= 0;
        }
      }
      
      // Visitors with widget status changes (minimized/maximized) should stay in Active
      const hasWidgetStatus = visitor.widgetStatus === 'minimized' || visitor.widgetStatus === 'maximized';
      
      // Visitor is active if they have recent activity (within 15 min) or recent widget activity
      // This ensures visitors stay active until they become idle (15+ min inactive)
      const isActive = hasRecentActivity || (hasWidgetStatus && hasRecentWidgetActivity);
      
      return isActive;
    });
  };

  const getIdleVisitors = () => {
    const now = currentTime; // Use currentTime for real-time updates
    const IDLE_THRESHOLD = 15 * 60 * 1000; // 15 minutes of inactivity = idle
    
    // Get active visitors first to avoid duplicates
    const activeVisitorIds = new Set(getActiveVisitors().map(v => v.id));
    
    return visitors.filter(visitor => {
      // Skip if already in active list
      if (activeVisitorIds.has(visitor.id)) return false;
      
      // Skip offline visitors (they should be in History)
      if (visitor.status === 'offline') return false;
      
      // Skip transferred visitors (they should be in Transfer Chats accordion)
      if (visitor.status === 'waiting_for_agent' && (!visitor.assignedAgent || !visitor.assignedAgent.id)) return false;
      
      // Only show online visitors (exclude away)
      // Note: offline visitors are already filtered out above, so we only need to check for 'away'
      const isOnline = visitor.status !== 'away';
      if (!isOnline) return false;
      
      // Require a valid lastActivity timestamp
      if (!visitor.lastActivity) {
        return false;
      }
      
      // Validate that lastActivity is a valid date
      const lastActivityDate = new Date(visitor.lastActivity);
      if (isNaN(lastActivityDate.getTime())) {
        return false;
      }
      
      // Calculate time since last activity
      const lastActivityTime = lastActivityDate.getTime();
      const timeSinceActivity = now - lastActivityTime;
      
      // Check widget activity
      let hasRecentWidgetActivity = false;
      if (visitor.lastWidgetUpdate) {
        const lastWidgetUpdateTime = new Date(visitor.lastWidgetUpdate).getTime();
        if (!isNaN(lastWidgetUpdateTime)) {
          hasRecentWidgetActivity = (now - lastWidgetUpdateTime) < IDLE_THRESHOLD && (now - lastWidgetUpdateTime) >= 0;
        }
      }
      
      // Visitor is idle if:
      // 1. Not actively typing
      // 2. Inactive for more than 15 minutes
      // 3. No recent widget activity
      // 4. Still online (not offline)
      // This automatically moves visitors from Active to Idle when they become idle
      const isIdle = !visitor.isTyping && 
                     timeSinceActivity >= IDLE_THRESHOLD && 
                     !hasRecentWidgetActivity &&
                     isOnline;
      
      // Ensure timeSinceActivity is valid (not a future date and reasonable)
      if (timeSinceActivity < 0 || timeSinceActivity > 365 * 24 * 60 * 60 * 1000) {
        return false;
      }
      
      return isIdle;
    });
  };

  if (loading) {
    return <LoadingSpinner text="Loading visitors..." />;
  }

  return (
    <div className="flex h-screen relative">
      {/* Left Panel - Visitors List */}
      <div 
        className="flex flex-col min-h-0"
        style={{ width: showVisitorPanel ? 'var(--visitor-left-panel-width)' : '100%' }}
      >
        <div className="p-3 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
             Live Visitors
            </h1>
          </div>
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


        </div>

        {/* Accordion Visitors Sections */}
        <div className="flex-1 p-3 pt-0 min-h-0 overflow-y-auto">
          <div className="space-y-4">
            {/* Active Visitors Section */}
            <AccordionSection
              title="Active visitors"
              visitors={getActiveVisitors()}
              icon="🟢"
              iconColor="text-green-500"
              onVisitorClick={handleStartChat}
              formatDuration={formatDuration}
              getPageTitle={getPageTitle}
              newMessageVisitors={newMessageVisitors}
              blinkingChats={blinkingChats}
            />

            {/* Transfer Chats Section */}
            <AccordionSection
              title="Transfer Chats"
              visitors={getTransferredVisitors()}
              icon="🔄"
              iconColor="text-blue-500"
              onVisitorClick={handleStartChat}
              formatDuration={formatDuration}
              getPageTitle={getPageTitle}
              showServedBy={true}
              newMessageVisitors={newMessageVisitors}
              blinkingChats={blinkingChats}
            />

            {/* Idle Visitors Section */}
            <AccordionSection
              title="Idle visitors"
              visitors={getIdleVisitors()}
              icon="⏰"
              iconColor="text-yellow-500"
              onVisitorClick={handleStartChat}
              formatDuration={formatDuration}
              getPageTitle={getPageTitle}
              newMessageVisitors={newMessageVisitors}
              blinkingChats={blinkingChats}
            />
                        </div>
                        </div>
      </div>

      {/* Chat Window - Two Column Layout */}
      {showVisitorPanel && selectedVisitor && (
        <div 
          className="border-l border-gray-200 bg-gray-100 flex flex-col"
          style={{ width: 'var(--visitor-chat-window-width)', height: '90%', borderWidth: '1px', borderColor: 'gray-800', borderStyle: 'solid', borderRadius: '10px', padding: '5px' }}
        >
          {/* Dark Header */}
          <div className="bg-gray-800 text-white p-4 flex items-center justify-between flex-shrink-0" style={{ borderRadius: '10px' }}>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {selectedVisitor.name?.charAt(0) || 'V'}
              </div>
              <div>
                <h2 className="font-semibold">
                  {selectedVisitor.name && selectedVisitor.name.trim() 
                    ? selectedVisitor.name 
                    : `Visitor ${selectedVisitor.id.slice(-8)}`}
                </h2>
                <p className="text-sm text-gray-300">{selectedVisitor.status}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-gray-700"
                onClick={() => {
                  setShowTransferDialog(true);
                  fetchAvailableAgents();
                }}
                disabled={!agentJoined}
                title={!agentJoined ? "Join chat first to transfer" : "Transfer chat to another agent"}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Transfer
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {agentJoined && (
                    <DropdownMenuItem 
                      onClick={handleEndChat}
                      className="text-red-600 focus:text-red-600"
                    >
                      End Chat
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={handleBanVisitor}
                    className="text-red-600 focus:text-red-600"
                  >
                    Ban Visitor
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Export Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    Mark as Resolved
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-gray-700"
                onClick={() => {
                  setShowVisitorPanel(false);
                  // Keep visitor in minimized chats
                }}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700" onClick={handleCloseChat}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="flex-1 flex min-h-0">
            {/* Left Column - Messages (Wider) */}
            <div className="flex-1 bg-white flex flex-col min-h-0">
              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto" ref={messagesContainerRef}>
                {/* Rating Display */}
                {selectedVisitor?.rating !== undefined && selectedVisitor?.rating !== null && (
                  <div className={`mb-6 p-4 rounded-lg border ${
                    selectedVisitor.rating === 1 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">
                        {selectedVisitor.rating === 1 ? '👍' : '👎'}
                      </span>
                      <h4 className={`font-semibold ${
                        selectedVisitor.rating === 1 
                          ? 'text-green-900' 
                          : 'text-red-900'
                      }`}>
                        Visitor Rating: {selectedVisitor.rating === 1 ? 'Thumbs Up' : 'Thumbs Down'}
                      </h4>
                    </div>
                    {selectedVisitor.ratingFeedback && (
                      <p className={`text-sm italic mt-2 ${
                        selectedVisitor.rating === 1 
                          ? 'text-green-800' 
                          : 'text-red-800'
                      }`}>
                        "{selectedVisitor.ratingFeedback}"
                      </p>
                    )}
                  </div>
                )}
                
                {chatMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-10 h-10 text-blue-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-700">No messages yet</p>
                    <p className="text-sm text-gray-500 mt-2">You can start the conversation by typing a message below</p>
                    <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>Visitor is online and ready to chat</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Real-time Activity Status Display */}
                    {selectedVisitor && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            selectedVisitor.status === 'online' || selectedVisitor.status === 'idle'
                              ? 'bg-green-500 animate-pulse'
                              : selectedVisitor.status === 'away'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                          }`}></div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">
                              {selectedVisitor.isTyping 
                                ? 'Visitor is typing...' 
                                : selectedVisitor.status === 'online' 
                                ? 'Visitor is online' 
                                : selectedVisitor.status === 'idle'
                                ? 'Visitor is idle'
                                : selectedVisitor.status === 'away'
                                ? 'Visitor is away'
                                : 'Visitor status'}
                            </span>
                            {selectedVisitor.lastActivity && (
                              <span className="text-xs text-gray-500">
                                Last active: {(() => {
                                  const lastActive = new Date(selectedVisitor.lastActivity);
                                  const now = new Date();
                                  const diffMinutes = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60));
                                  if (diffMinutes < 1) return 'Just now';
                                  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
                                  const diffHours = Math.floor(diffMinutes / 60);
                                  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                                  return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedVisitor.widgetStatus && (
                          <div className="text-xs text-gray-500">
                            Widget: {selectedVisitor.widgetStatus === 'minimized' ? 'Minimized' : 'Maximized'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {(!chatMessages || !Array.isArray(chatMessages)) ? (
                      <div className="text-center py-4 text-gray-500">Loading messages...</div>
                    ) : (
                      <>
                        {chatMessages.map((message) => (
                          <div key={message.id} className={`flex ${
                            message.sender === 'agent' ? 'justify-end' : 
                            message.sender === 'system' ? 'justify-center' : 'justify-start'
                          }`}>
                        {(message.sender === 'system' || message.messageType === 'system') ? (
                          <div className={`px-4 py-2 rounded-lg text-xs font-medium ${
                            message.isTransferMessage 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : message.isStatusMessage || message.content?.includes('ended the chat')
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {message.isTransferMessage ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>{message.content}</span>
                              </div>
                            ) : (message.isStatusMessage || message.content?.includes('ended the chat')) ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <span>{message.content || 'Visitor ended the chat.'}</span>
                              </div>
                            ) : (
                              message.content || message.message || ''
                            )}
                          </div>
                        ) : (
                          <div className={`max-w-md px-4 py-3 rounded-lg text-sm ${
                            message.sender === 'agent' 
                              ? 'bg-blue-500 text-white' 
                              : message.sender === 'ai'
                              ? 'bg-green-100 text-green-900 border border-green-200'
                              : message.isStatusMessage
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 italic'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <div className="font-medium text-xs mb-1">
                              {message.sender === 'agent' ? 'You' : 
                               message.sender === 'ai' ? 'AI Assistant' :
                               message.isStatusMessage ? 'System' :
                               selectedVisitor.name || 'Visitor'}
                            </div>
                            <div>
                              {/* File attachments */}
                              {(message.file_url || message.fileUrl) && (
                                <div className="mb-2">
                                  {(message.message_type === 'image' || message.messageType === 'image' || 
                                    (message.file_url || message.fileUrl)?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) ? (
                                    <div className="relative inline-block max-w-full">
                                      <a
                                        href={message.file_url || message.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        <img
                                          src={message.file_url || message.fileUrl}
                                          alt={message.file_name || message.fileName || 'Image'}
                                          className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-md border border-gray-200"
                                          onError={(e) => {
                                            console.error('Image failed to load:', message.file_url || message.fileUrl);
                                            // Fallback to file link if image fails to load
                                            const target = e.currentTarget;
                                            target.style.display = 'none';
                                            const fallbackLink = target.parentElement?.querySelector('.image-fallback-link') as HTMLElement;
                                            if (fallbackLink) {
                                              fallbackLink.style.display = 'inline-flex';
                                            }
                                          }}
                                        />
                                        <a
                                          href={message.file_url || message.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="image-fallback-link hidden inline-flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-colors mt-2"
                                        >
                                          <span>📎</span>
                                          <span>{message.file_name || message.fileName || 'Image'}</span>
                                          {(message.file_size || message.fileSize) && (
                                            <span className="text-xs opacity-70">
                                              ({(message.file_size || message.fileSize) / 1024 < 1024
                                                ? `${((message.file_size || message.fileSize) / 1024).toFixed(1)} KB`
                                                : `${((message.file_size || message.fileSize) / 1024 / 1024).toFixed(2)} MB`})
                                            </span>
                                          )}
                                        </a>
                                      </a>
                                    </div>
                                  ) : (
                                    <a
                                      href={message.file_url || message.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-colors"
                                    >
                                      <span>📎</span>
                                      <span>{message.file_name || message.fileName || 'File'}</span>
                                      {(message.file_size || message.fileSize) && (
                                        <span className="text-xs opacity-70">
                                          ({(message.file_size || message.fileSize) / 1024 < 1024
                                            ? `${((message.file_size || message.fileSize) / 1024).toFixed(1)} KB`
                                            : `${((message.file_size || message.fileSize) / 1024 / 1024).toFixed(2)} MB`})
                                        </span>
                                      )}
                                    </a>
                                  )}
                                </div>
                              )}
                              {/* Show message content - skip if it's just a file attachment placeholder */}
                              {message.content && message.content.trim() && 
                               !(message.content.trim().startsWith('📎') && (message.file_url || message.fileUrl)) && (
                                <div>{message.content}</div>
                              )}
                            </div>
                            <div className={`text-xs mt-1 flex items-center justify-between ${
                              message.sender === 'agent' ? 'text-blue-100' :
                              message.sender === 'ai' ? 'text-green-600' :
                              message.isStatusMessage ? 'text-blue-500' :
                              'text-gray-500'
                            }`}>
                              <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {/* Seen/Unseen indicator for agent messages */}
                              {message.sender === 'agent' && (
                                <span className={`ml-2 text-[10px] font-medium ${
                                  message.isSeen ? 'text-blue-200' : 'text-blue-300 opacity-70'
                                }`}>
                                  {message.isSeen ? 'Seen' : 'Unseen'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Live Typing Preview */}
                    {visitorTypingContent && visitorTypingContent.trim().length > 0 && (
                      <div key="typing-preview" className="flex justify-start animate-pulse">
                        <div className="max-w-[80%] bg-gray-100 border border-dashed border-gray-300 rounded-lg px-4 py-2 opacity-75">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-xs text-gray-500 italic">typing...</span>
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {visitorTypingContent}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Invisible div to scroll to */}
                    <div ref={messagesEndRef} />
                    </>
                    )}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-end space-x-3">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder={
                        checkingAgentAssignment 
                          ? "Checking agent status..." 
                          : agentJoined 
                          ? "Type your message here..." 
                          : "Type a message to start the conversation..."
                      }
                      value={newMessage}
                      disabled={checkingAgentAssignment && !agentJoined}
                      onChange={(e) => {
                        console.log('Textarea onChange - agentJoined:', agentJoined, 'chatSessionActive:', chatSessionActive, 'checkingAgentAssignment:', checkingAgentAssignment);
                        const value = e.target.value;
                        setNewMessage(value);
                        
                        // Live trigger search
                        if (value.length >= 2) {
                          searchTriggers(value);
                        } else {
                          setShowSuggestions(false);
                          setTriggerSuggestions([]);
                          setCurrentSuggestion('');
                        }
                        
                        // Trigger agent join when typing starts
                        // For transferred chats (status 'waiting_for_agent'), ANY agent can take over by typing
                        // This enables unlimited transfers - any agent can take over a transferred chat
                        const isTransferredChat = selectedVisitor?.status === 'waiting_for_agent';
                        const shouldJoin = (!agentJoined && !chatSessionActive) || (isTransferredChat && !agentJoined);
                        
                        if (shouldJoin && value.trim() && selectedVisitor) {
                          console.log('Agent typing detected - triggering join:', {
                            visitorId: selectedVisitor.id,
                            status: selectedVisitor.status,
                            assignedAgent: selectedVisitor.assignedAgent,
                            isTransferredChat,
                            agentJoined,
                            chatSessionActive
                          });
                          
                          // Set states immediately to prevent textarea from being disabled
                          // handleAgentJoin will also set these, but setting them here prevents
                          // any race condition where checkAgentAssignment might run
                          setAgentJoined(true);
                          setChatSessionActive(true);
                          
                          // Notify backend that agent joined (disconnects AI/previous agent automatically)
                          // The system message "AgentName joined the chat" will be added by the backend
                          // Call this asynchronously without awaiting to prevent blocking input
                          handleAgentJoin(selectedVisitor.id).catch(error => {
                            console.error('Error joining chat:', error);
                          });
                        }

                        // Emit agent typing events to visitor
                        if (socket && selectedVisitor && agentJoined) {
                          // Clear existing timeout
                          if (agentTypingTimeoutRef.current) {
                            clearTimeout(agentTypingTimeoutRef.current);
                          }

                          // Emit typing start if there's text
                          if (value.trim().length > 0) {
                            socket.emit('agent:typing', {
                              visitorId: selectedVisitor.id,
                              isTyping: true
                            });
                          } else {
                            socket.emit('agent:typing', {
                              visitorId: selectedVisitor.id,
                              isTyping: false
                            });
                            return;
                          }

                          // Set timeout to stop typing after 2 seconds of inactivity
                          agentTypingTimeoutRef.current = setTimeout(() => {
                            if (socket && selectedVisitor) {
                              socket.emit('agent:typing', {
                                visitorId: selectedVisitor.id,
                                isTyping: false
                              });
                            }
                          }, 2000);
                        }
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key to send message (unless suggestions are shown)
                      if (e.key === 'Enter' && newMessage.trim() && !showSuggestions) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                      // Handle Arrow keys to cycle through suggestions
                      if (showSuggestions && triggerSuggestions.length > 1) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const nextIndex = selectedSuggestionIndex < triggerSuggestions.length - 1 ? selectedSuggestionIndex + 1 : 0;
                          setSelectedSuggestionIndex(nextIndex);
                          setCurrentSuggestion(triggerSuggestions[nextIndex].message);
                          return;
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const prevIndex = selectedSuggestionIndex > 0 ? selectedSuggestionIndex - 1 : triggerSuggestions.length - 1;
                          setSelectedSuggestionIndex(prevIndex);
                          setCurrentSuggestion(triggerSuggestions[prevIndex].message);
                          return;
                        }
                      }
                      // Handle Enter to select suggestion
                      if (e.key === 'Enter' && showSuggestions && currentSuggestion) {
                        e.preventDefault();
                        selectTriggerSuggestion();
                        return;
                      }
                      // Handle Escape to dismiss suggestion
                      if (e.key === 'Escape' && showSuggestions) {
                        setShowSuggestions(false);
                        setTriggerSuggestions([]);
                        setCurrentSuggestion('');
                        return;
                      }
                    }}
                    className="w-full min-h-[100px] max-h-[200px] resize-none pr-5 pb-8 overflow-y-auto whitespace-pre-wrap break-words"
                  />
                  
                  {/* Suggestion displayed inside textbox at the bottom */}
                  {showSuggestions && currentSuggestion && (
                    <div 
                      className="absolute bottom-2 right-2 left-2 bg-blue-50 text-blue-700 border-l-4 border-blue-500 px-3 py-2 rounded text-sm cursor-pointer hover:bg-blue-100 transition-colors shadow-sm"
                      onClick={() => selectTriggerSuggestion()}
                      style={{ pointerEvents: 'auto' }}
                    >
                      {currentSuggestion}
                    </div>
                  )}
                  </div>
                </div>
              </div>
              
            </div>

            {/* Right Column - Visitor Information */}
            <div 
              className="bg-gray-100 p-4 space-y-4 overflow-y-auto flex-shrink-0"
              style={{ width: 'var(--visitor-info-panel-width)' }}
            >


              {/* Visitor Information Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Visitor Information</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                </div>

                {/* Editable Fields Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <UserIcon className="w-4 h-4 mr-2" />
                      Contact Details
                    </h4>
                    {savingStatus && (
                      <span className={`text-xs font-medium ${
                        savingStatus === 'Saved' ? 'text-green-600' : 
                        savingStatus === 'Failed to save' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {savingStatus}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Name</label>
                      <Input
                        placeholder="Enter visitor name"
                        value={selectedVisitor?.name || ''}
                        onChange={(e) => handleVisitorInfoUpdate('name', e.target.value)}
                        className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <Input
                        placeholder="Enter email address"
                        value={selectedVisitor?.email || ''}
                        onChange={(e) => handleVisitorInfoUpdate('email', e.target.value)}
                        className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <Input
                        placeholder="Enter phone number"
                        value={selectedVisitor?.phone || ''}
                        onChange={(e) => handleVisitorInfoUpdate('phone', e.target.value)}
                        className="h-10 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Notes</label>
                      <Textarea
                        placeholder="Add visitor notes..."
                        value={selectedVisitor?.notes || ''}
                        onChange={(e) => handleVisitorInfoUpdate('notes', e.target.value)}
                        className="min-h-[100px] max-h-[200px] text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none overflow-y-auto whitespace-pre-wrap break-words"
                      />
                    </div>
                  </div>
                </div>

                {/* Read-only Information Section */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                    <Globe className="w-4 h-4 mr-2" />
                    Session Details
                  </h4>
                  <div className="grid grid-cols-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">IP</span>
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor?.ipAddress || (selectedVisitor as any)?.ip_address || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">City</span>
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor?.location?.city || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Country</span>
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor?.location?.country || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Browser</span>
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor?.device?.browser || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Referrer</span>
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor?.referrer || 'Direct'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Current URL</span>
                        {selectedVisitor?.currentPage && selectedVisitor.currentPage !== 'Unknown page' ? (() => {
                          try {
                            const url = new URL(selectedVisitor.currentPage);
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                                title={selectedVisitor.currentPage}
                                onClick={() => window.open(selectedVisitor.currentPage, '_blank')}
                              >
                                View
                              </Button>
                            );
                          } catch {
                            return <span className="text-sm font-medium text-gray-500">Invalid URL</span>;
                          }
                        })() : (
                          <span className="text-sm font-medium text-gray-500">Unknown</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Base URL</span>
                        {selectedVisitor?.landingPage ? (() => {
                          try {
                            const url = new URL(selectedVisitor.landingPage);
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                                title={url.origin}
                                onClick={() => window.open(url.origin, '_blank')}
                              >
                                View
                              </Button>
                            );
                          } catch {
                            return <span className="text-sm font-medium text-gray-500">Invalid URL</span>;
                          }
                        })() : selectedVisitor?.currentPage && selectedVisitor.currentPage !== 'Unknown page' ? (() => {
                          try {
                            const url = new URL(selectedVisitor.currentPage);
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-3 text-xs"
                                title={url.origin}
                                onClick={() => window.open(url.origin, '_blank')}
                              >
                                View
                              </Button>
                            );
                          } catch {
                            return <span className="text-sm font-medium text-gray-500">Invalid URL</span>;
                          }
                        })() : (
                          <span className="text-sm font-medium text-gray-500">Unknown</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-500">Device Type</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">{selectedVisitor?.device?.type || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Enhanced Tracking Information */}
                  <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center mt-6">
                    <Globe className="w-4 h-4 mr-2" />
                    Traffic Source
                  </h4>
                  <div className="space-y-3">
                    {/* Source Badge */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Source</span>
                      <div className="flex items-center">
                        <SourceBadge visitor={selectedVisitor} />
                      </div>
                    </div>
                    
                    {/* Medium */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Medium</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {selectedVisitor?.medium || 'None'}
                      </Badge>
                    </div>
                    
                    {/* Keyword with Tooltip */}
                    {(selectedVisitor?.keyword || selectedVisitor?.term) && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500 flex items-center">
                          <Search className="w-3 h-3 mr-1" />
                          Keyword
                        </span>
                        <div className="flex items-center space-x-2 max-w-[60%]">
                          <span 
                            className="text-sm font-medium text-blue-600 break-all text-right cursor-help"
                            title={selectedVisitor.keyword || selectedVisitor.term}
                          >
                            {selectedVisitor.keyword || selectedVisitor.term}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Search Engine */}
                    {selectedVisitor?.searchEngine && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Search Engine</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedVisitor.searchEngine}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Campaign */}
                    {selectedVisitor?.campaign && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Campaign</span>
                        <span className="text-sm font-medium text-gray-900 max-w-[60%] text-right break-words">
                          {selectedVisitor.campaign}
                        </span>
                      </div>
                    )}
                    
                    {/* Content */}
                    {selectedVisitor?.content && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Content</span>
                        <span className="text-sm font-medium text-gray-900 max-w-[60%] text-right break-words">
                          {selectedVisitor.content}
                        </span>
                      </div>
                    )}
                    
                    {/* Landing Page */}
                    {selectedVisitor?.landingPage && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Landing Page</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 max-w-[200px] truncate" title={selectedVisitor.landingPage}>
                            {selectedVisitor.landingPage.replace(/^https?:\/\//, '').split('/')[0]}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            title={selectedVisitor.landingPage}
                            onClick={() => window.open(selectedVisitor.landingPage, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Referrer (if different from source) */}
                    {selectedVisitor?.referrer && 
                     selectedVisitor.referrer !== 'Direct' && 
                     !selectedVisitor?.source && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Referrer</span>
                        <span className="text-sm font-medium text-gray-900 max-w-[60%] text-right break-words text-xs">
                          {selectedVisitor.referrer.replace(/^https?:\/\//, '').split('/')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visit Summary Card */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Past visits</span>
                    <span className="text-sm font-medium">1</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Past chats</span>
                    <span className="text-sm font-medium">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Time on site</span>
                    <span className="text-sm font-medium">{formatDuration(selectedVisitor)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Minimized Chat Windows - Bottom */}
      {minimizedChats.size > 0 && (
        <div 
          className="fixed bottom-6 z-50 overflow-x-hidden"
          style={{ 
            display: 'flex',
            gap: '12px',
            bottom: '-10px',
            justifyContent: 'flex-start'
          }}
        >
          {Array.from(minimizedChats.values()).map((visitor, index) => {
            // Calculate dynamic width based on number of chats
            const chatCount = minimizedChats.size;
            const containerPadding = 32; // 16px left + 16px right padding
            const gapSize = 12; // Gap between chats
            const containerWidth = showVisitorPanel ? 
              (typeof window !== 'undefined' ? window.innerWidth * 0.6 : 800) : // Left panel width when chat is open
              (typeof window !== 'undefined' ? window.innerWidth : 1200); // Full width when no chat
            const availableWidth = containerWidth - containerPadding;
            const totalGapWidth = (chatCount - 1) * gapSize;
            const maxChatWidth = 300;
            const minChatWidth = 250;
            
            // Calculate optimal width ensuring no overflow
            let calculatedWidth = (availableWidth - totalGapWidth) / chatCount;
            
            // Ensure width respects minimum and maximum constraints
            calculatedWidth = Math.max(minChatWidth, Math.min(maxChatWidth, calculatedWidth));
            
            // Final safety check to prevent overflow
            const maxPossibleWidth = availableWidth / chatCount - gapSize;
            const finalWidth = Math.min(calculatedWidth, maxPossibleWidth);
            
            const unreadCount = unreadMessages.get(visitor.id) || 0;
            const isBlinking = blinkingChats.has(visitor.id);
            // Check if this is the currently active visitor in the chat window
            const isActiveVisitor = selectedVisitor?.id === visitor.id && showVisitorPanel;
            
            return (
              <div 
                key={visitor.id}
                className={`bg-gray-800 border border-gray-600 rounded-lg shadow-lg flex-shrink-0 ${isBlinking ? 'animate-pulse' : ''} ${isActiveVisitor ? 'ring-2 ring-blue-500' : ''}`}
                style={{ 
                  width: `${finalWidth}px`,
                  minWidth: `${minChatWidth}px`,
                  maxWidth: `${maxChatWidth}px`,
                  backgroundColor: isBlinking ? '#1f2937' : '#1f2937', // Dark gray, can add color change for blinking
                  height: isActiveVisitor ? 'calc(100% + 5px)' : 'auto'
                }}
              >
              <div className="p-3 border-b border-gray-600 bg-gray-700 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center text-gray-800 text-xs font-medium">
                      👤
                </div>
                    <span className="text-sm font-medium text-white">
                      {visitor.name && visitor.name.trim() && visitor.name !== 'Anonymous Visitor' 
                        ? visitor.name 
                        : `#${visitor.id.slice(-8)}`}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      visitor.status === 'online' || visitor.status === 'idle' ? 'bg-green-500' : 
                      visitor.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} title={`Status: ${visitor.status}`}></div>
                    {unreadCount > 0 && !isActiveVisitor && (
                      <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
              </div>
              <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 text-gray-300 hover:text-white hover:bg-gray-600"
                      onClick={() => handleExpandMinimizedChat(visitor.id)}
                    >
                      <MessageCircle className="w-3 h-3" />
                </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-1 text-gray-300 hover:text-white hover:bg-gray-600" 
                      onClick={() => handleCloseMinimizedChat(visitor.id)}
                    >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Transfer Visitor Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transfer Visitor</DialogTitle>
            <DialogDescription>
              Select an agent to transfer this visitor to. The current agent will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto pr-4">
            <div className="space-y-2">
              {availableAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No other agents available
                </div>
              ) : (
                availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleTransferVisitor(agent.id.toString())}
                    disabled={transferring}
                    className="w-full p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

