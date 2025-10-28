'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  User as UserIcon
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
                      Referrer
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
                              <span>#{visitor.id.slice(-8)}</span>
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

                      {/* Referrer Column */}
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {visitor.referrer === 'Direct' || !visitor.referrer ? '-' : visitor.referrer}
                          </span>
                        </div>
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
  const [triggerSuggestions, setTriggerSuggestions] = useState<Array<{ id: number; name: string; message: string; description?: string; isFavorite?: boolean }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [currentSuggestion, setCurrentSuggestion] = useState<string>('');
  const [agentJoined, setAgentJoined] = useState(false);
  const [chatSessionActive, setChatSessionActive] = useState(false);
  const [checkingAgentAssignment, setCheckingAgentAssignment] = useState(false);
  const [agentSettings, setAgentSettings] = useState<any>(null);
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
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


  // Handle visitor information updates with real-time saving
  const handleVisitorInfoUpdate = async (field: string, value: string) => {
    if (!selectedVisitor) return;

    try {
      // Update local state immediately for responsive UI
      setSelectedVisitor(prev => prev ? { ...prev, [field]: value } : null);
      
      // Update the visitor in the visitors list as well
      setVisitors(prev => prev.map(visitor => 
        visitor.id === selectedVisitor.id 
          ? { ...visitor, [field]: value }
          : visitor
      ));

      // Save to database
      const response = await apiClient.put(`/agent/visitors/${selectedVisitor.id}/profile`, {
        [field]: value
      });

      if (!response.success) {
        console.error('Failed to update visitor info:', response.message);
        // Revert local state on error
        setSelectedVisitor(prev => prev ? { ...prev, [field]: selectedVisitor[field as keyof Visitor] } : null);
        setVisitors(prev => prev.map(visitor => 
          visitor.id === selectedVisitor.id 
            ? { ...visitor, [field]: selectedVisitor[field as keyof Visitor] }
            : visitor
        ));
      }
    } catch (error) {
      console.error('Error updating visitor info:', error);
      // Revert local state on error
      setSelectedVisitor(prev => prev ? { ...prev, [field]: selectedVisitor[field as keyof Visitor] } : null);
      setVisitors(prev => prev.map(visitor => 
        visitor.id === selectedVisitor.id 
          ? { ...visitor, [field]: selectedVisitor[field as keyof Visitor] }
          : visitor
      ));
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useEffect(() => {
    fetchVisitors();
    setupSocketListeners();
    
    return () => {
      // Cleanup socket listeners on unmount
      if (socket) {
        socket.off('visitor:update');
        socket.off('visitor:status');
        socket.off('visitor:typing');
        socket.off('visitor:new');
        socket.off('visitor:leave');
        socket.off('visitor:message');
        socket.off('ai:response');
        socket.off('visitor:chat:typing');
        socket.off('visitor:agent:assigned');
        socket.off('visitor:agent:unassigned');
        socket.off('widget:status');
      }
    };
  }, [socket]);

  // Track visitor activity gaps and mark inactive visitors as offline
  useEffect(() => {
    const checkVisitorActivity = () => {
      setVisitors(prev => {
        // Early return if no visitors
        if (prev.length === 0) return prev;
        
        const now = Date.now();
        const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes of no activity = offline (visitor likely disconnected)
        
        let hasChanges = false;
        const updatedVisitors = prev.map(visitor => {
          // Skip if visitor is already offline
          if (visitor.status === 'offline') return visitor;
          
          // Check if visitor has last_activity timestamp
          if (visitor.lastActivity) {
            const lastActivityTime = new Date(visitor.lastActivity).getTime();
            const timeSinceActivity = now - lastActivityTime;
            
            // If visitor has been inactive for more than threshold, mark as offline
            if (timeSinceActivity > INACTIVITY_THRESHOLD) {
              console.log(`⚠️ Visitor ${visitor.id} marked as offline due to inactivity (${Math.round(timeSinceActivity / 1000 / 60)}m)`);
              hasChanges = true;
              
              // Update visitor status to offline
              return {
                ...visitor,
                status: 'offline' as const
              };
            }
          } else {
            // If no last activator timestamp, also mark as offline
            hasChanges = true;
            return {
              ...visitor,
              status: 'offline' as const
            };
          }
          
          return visitor;
        });
        
        // Only return updated visitors if there were actual changes
        return hasChanges ? updatedVisitors : prev;
      });
    };

    // Check every 30 seconds for activity gaps
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

  useEffect(() => {
    applyFilters();
  }, [visitors, filters]);

  // Effect to sync chat messages when selectedVisitor changes
  useEffect(() => {
    console.log('🔄 selectedVisitor useEffect triggered');
    console.log('🔄 selectedVisitor:', selectedVisitor?.id);
    console.log('🔄 showVisitorPanel:', showVisitorPanel);
    
    if (selectedVisitor) {
      console.log('🔄 Processing selectedVisitor:', selectedVisitor.id);
      const globalMessagesForVisitor = globalMessages.get(selectedVisitor.id);
      // Ensure it's an array
      const messagesArray = Array.isArray(globalMessagesForVisitor) ? globalMessagesForVisitor : [];
      
      if (messagesArray.length > 0) {
        console.log('Syncing chat messages from global store for visitor:', selectedVisitor.id, 'Messages:', messagesArray.length);
        setChatMessages(messagesArray);
      } else {
        console.log('No global messages found, loading from API for visitor:', selectedVisitor.id);
        loadChatMessages(selectedVisitor.id);
      }
      
      // Check if agent is already assigned to this visitor (only if not already checking)
      if (!checkingAgentAssignment) {
        checkAgentAssignment(selectedVisitor.id);
      }
      
      // Scroll to bottom when opening chat
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } else {
      console.log('No visitor selected, clearing chat messages');
      setChatMessages([]);
      setAgentJoined(false);
      setChatSessionActive(false);
      setCheckingAgentAssignment(false);
    }
  }, [selectedVisitor]); // Removed globalMessages from dependencies to prevent repeated calls

  // Separate effect to sync messages when globalMessages changes (without triggering agent assignment check)
  useEffect(() => {
    if (selectedVisitor) {
      const globalMessagesForVisitor = globalMessages.get(selectedVisitor.id);
      // Ensure it's an array
      const messagesArray = Array.isArray(globalMessagesForVisitor) ? globalMessagesForVisitor : [];
      
      if (messagesArray.length > 0) {
        console.log('Syncing updated messages from global store for visitor:', selectedVisitor.id, 'Messages:', messagesArray.length);
        setChatMessages(messagesArray);
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
    if (!socket) return;

    // Clean up existing listeners first to prevent duplicates
    socket.off('visitor:update');
    socket.off('visitor:status');
    socket.off('visitor:typing');
    socket.off('visitor:new');
    socket.off('visitor:leave');
    socket.off('visitor:message');
    socket.off('ai:response');
    socket.off('visitor:chat:typing');
    socket.off('visitor:agent:assigned');
    socket.off('visitor:agent:unassigned');
    socket.off('widget:status');

    // Listen for visitor updates
    socket.on('visitor:update', (visitor: Visitor) => {
      console.log('🔄 Visitor update received:', visitor);
      
      // Check if visitor is becoming active (status changed from offline/away to online/idle)
      const currentVisitor = visitors.find(v => v.id === visitor.id);
      const wasInactive = currentVisitor && (currentVisitor.status === 'offline' || currentVisitor.status === 'away');
      const isNowActive = visitor.status !== 'offline' && visitor.status !== 'away';
      
      // Play notification sound when visitor becomes active
      if (wasInactive && isNowActive) {
        console.log('🔔 Visitor became active, playing notification sound');
        playNotificationSound();
      }
      
      // Transform visitor data to ensure consistent format
      const transformedVisitor = {
        ...visitor,
        brandName: visitor.brandName || visitor.brand?.name || (visitor as any).brand_name || 'No Brand',
        brand: visitor.brand || (visitor as any).brand_id ? { 
          id: (visitor as any).brand_id, 
          name: visitor.brandName || (visitor as any).brand_name || 'No Brand',
          primaryColor: visitor.brand?.primaryColor || '#3B82F6'
        } : undefined
      };
      
      setVisitors(prev => {
        const existingIndex = prev.findIndex(v => v.id === visitor.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          // Merge existing visitor data with the update to preserve all fields
          updated[existingIndex] = { ...updated[existingIndex], ...transformedVisitor };
          console.log('✅ Updated existing visitor:', visitor.id);
          return updated;
        } else {
          console.log('✅ Added new visitor:', visitor.id);
          return [...prev, transformedVisitor];
        }
      });
    });

    // Listen for visitor status changes
    socket.on('visitor:status', (data: { visitorId: string; status: string }) => {
      setVisitors(prev => prev.map(visitor => 
        visitor.id === data.visitorId 
          ? { ...visitor, status: data.status as any }
          : visitor
      ));
      
      // Add status message to chat if this is the selected visitor
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        const statusMessage = {
          id: `visitor-status-${Date.now()}`,
          sender: 'visitor',
          content: `📱 Status changed to ${data.status}`,
          timestamp: new Date().toISOString(),
          visitorId: data.visitorId,
          isStatusMessage: true
        };
        
        setChatMessages(prev => [...prev, statusMessage]);
      }
    });

    // Listen for visitor typing status
    socket.on('visitor:typing', (data: { visitorId: string; isTyping: boolean }) => {
      setVisitors(prev => prev.map(visitor => 
        visitor.id === data.visitorId 
          ? { ...visitor, isTyping: data.isTyping }
          : visitor
      ));
    });

    // Listen for new visitors
    socket.on('visitor:new', (visitor: Visitor) => {
      console.log('Received visitor:new event:', visitor.id, visitor.name);
      
      // Play notification sound for new visitor if enabled in settings
      playNotificationSound();
      
      // Transform visitor data to ensure consistent format (especially for brand)
      const transformedVisitor = {
        ...visitor,
        brandName: visitor.brandName || visitor.brand?.name || (visitor as any).brand_name || 'No Brand',
        brand: visitor.brand || (visitor as any).brand_id ? { 
          id: (visitor as any).brand_id, 
          name: visitor.brandName || (visitor as any).brand_name || 'No Brand',
          primaryColor: visitor.brand?.primaryColor || '#3B82F6'
        } : undefined
      };
      
      setVisitors(prev => {
        // Check if visitor already exists to prevent duplicates
        const existingVisitor = prev.find(v => v.id === visitor.id);
        if (existingVisitor) {
          console.log('Visitor already exists, updating instead of adding:', visitor.id);
          // Update existing visitor instead of adding duplicate
          return prev.map(v => v.id === visitor.id ? { ...transformedVisitor, ...v } : v);
        }
        console.log('Adding new visitor:', visitor.id);
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
      // Mark visitor as offline instead of removing
      setVisitors(prev => prev.map(visitor => 
        visitor.id === visitorId 
          ? { ...visitor, status: 'offline' as const }
          : visitor
      ));
      
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
    socket.on('visitor:message', (data: { visitorId: string; message: string; sender: string; timestamp: string; messageId: string }) => {
      console.log('Received visitor message:', data);
      console.log('Current selected visitor:', selectedVisitor?.id);
      console.log('Message visitor ID:', data.visitorId);
      
      const visitorMessage = {
        id: data.messageId,
        content: data.message,
        sender: data.sender,
        timestamp: data.timestamp,
        visitorId: data.visitorId
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

    // Listen for visitor typing in chat
    socket.on('visitor:chat:typing', (data: { visitorId: string; isTyping: boolean }) => {
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        setIsVisitorTyping(data.isTyping);
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

    // Listen for widget status updates (minimize/maximize)
    socket.on('widget:status', (data: { visitorId: string; status: string; timestamp: string }) => {
      console.log('Widget status update:', data);
      
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
      
      // Add status message to chat if this is the selected visitor
      if (selectedVisitor && data.visitorId === selectedVisitor.id) {
        let content = '';
        if (data.status === 'maximized') {
          content = '🗨️ Visitor Maximized';
        } else if (data.status === 'minimized') {
          content = '📦 Visitor Minimized';
        }
        
        const statusMessage = {
          id: `widget-status-${Date.now()}`,
          sender: 'system',
          content: content,
          timestamp: data.timestamp || new Date().toISOString(),
          visitorId: data.visitorId,
          isStatusMessage: true
        };
        
        setChatMessages(prev => [...prev, statusMessage]);
        
        // Scroll to bottom to show the message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
      
      // Widget status notifications removed as requested
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

    // Listen for general visitor transfer notifications
    socket.on('visitor:transfer_notification', (data: { visitorId: string; agentId: string; agentName: string; message: string; timestamp: string; type: string }) => {
      console.log('Visitor transfer notification received:', data);
      
      // Update visitor status if this visitor is in our list
      setVisitors(prev => prev.map(visitor => {
        if (visitor.id === data.visitorId) {
          return {
            ...visitor,
            assignedAgent: {
              id: data.agentId,
              name: data.agentName
            },
            status: 'waiting_for_agent'
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
        const transformedVisitors = response.data.map((visitor: any) => ({
          ...visitor,
          name: visitor.name || 'Anonymous Visitor',
          currentPage: visitor.current_page || visitor.currentPage || 'Unknown page',
          lastActivity: visitor.last_activity || visitor.lastActivity,
          sessionDuration: visitor.session_duration ? visitor.session_duration.toString() : visitor.sessionDuration || '0',
          messagesCount: visitor.messages_count || visitor.messagesCount || 0,
          visitsCount: visitor.visits_count || visitor.visitsCount || 1,
          isTyping: visitor.is_typing || visitor.isTyping || false,
          location: visitor.location || { country: 'Unknown', city: 'Unknown', region: 'Unknown' },
          device: visitor.device || { type: 'desktop', browser: 'Unknown', os: 'Unknown' },
          createdAt: visitor.created_at || visitor.createdAt,
          lastWidgetUpdate: visitor.last_widget_update || visitor.lastWidgetUpdate,
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
          // Explicitly map brand data
          brand: visitor.brand || null,
          brandName: visitor.brandName || visitor.brand?.name || 'No Brand'
        }));
        
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
        
        // Filter out offline visitors - only show visitors who are still online
        const onlineVisitors = uniqueVisitors.filter((v: Visitor) => v.status !== 'offline');
        console.log(`Filtered to ${onlineVisitors.length} online visitors`);
        
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
        
        if (visitor.assignedAgent && String(visitor.assignedAgent.id) === String(user?.id)) {
          // Agent is already assigned to this visitor
          setAgentJoined(true);
          setChatSessionActive(true);
          console.log('✅ Agent is already assigned to this visitor, chat session active');
        } else if (visitor.assignedAgent && String(visitor.assignedAgent.id) !== String(user?.id)) {
          // Another agent is assigned
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


  const loadChatMessages = async (visitorId: string) => {
    try {
      const response = await apiClient.get(`/agent/visitors/${visitorId}/messages`);
      if (response.success) {
        // Handle both old format (array) and new format (object with messages array)
        const messages = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.messages || response.data?.data || []);
        
        // Ensure it's an array
        const messagesArray = Array.isArray(messages) ? messages : [];
        
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
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setChatMessages([]); // Set empty array on error
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
    
    // Add agent message immediately
    const agentMessage = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      visitorId: selectedVisitor.id
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
      
      if (response.success) {
        console.log('Agent message sent successfully to visitor');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAgentJoin = async (visitorId: string) => {
    try {
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
    } catch (error) {
      console.error('Error notifying agent join:', error);
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
        // Add end chat message
        const endMessage = {
          id: Date.now().toString(),
          content: 'Chat ended by agent',
          sender: 'system',
          timestamp: new Date().toISOString(),
          visitorId: selectedVisitor.id
        };
        setChatMessages(prev => [...prev, endMessage]);
        
        // Store in global messages
        setGlobalMessages(prev => {
          const newMap = new Map(prev);
          const existingMessages = newMap.get(selectedVisitor.id) || [];
          newMap.set(selectedVisitor.id, [...existingMessages, endMessage]);
          return newMap;
        });
        
        // Reset agent state
        setAgentJoined(false);
        setChatSessionActive(false);
        
        // Clear assigned agent status
        setVisitors(prev => prev.map(visitor => 
          visitor.id === selectedVisitor.id 
            ? { ...visitor, assignedAgent: undefined }
            : visitor
        ));
        
        toast.success('Chat ended successfully');
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
    // Calculate total time since visitor first loaded the chat widget (createdAt)
    const now = new Date();
    const createdAt = new Date(visitor.createdAt);
    const diffInSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
    
    // If visitor is offline, show session duration instead
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
    
    // For online/away visitors, show total time since first widget load
    if (diffInSeconds < 0) return 'Just now';
    if (diffInSeconds < 60) return 'Just now';
    
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
  // Get active visitors - visitors who are currently active (within last 5 minutes)
  const getActiveVisitors = () => {
    const now = Date.now();
    const ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
    
    return visitors.filter(visitor => {
      // Skip offline visitors
      if (visitor.status === 'offline') return false;
      
      // Check if visitor has recent activity (within last 5 minutes)
      const hasRecentActivity = visitor.lastActivity && 
        (now - new Date(visitor.lastActivity).getTime()) < ACTIVITY_THRESHOLD;
      
      // Check if visitor is typing
      const isActivelyTyping = visitor.isTyping;
      
      // Only show visitors who are active within threshold OR currently typing
      const isActive = hasRecentActivity || isActivelyTyping;
      
      console.log(`🔍 Checking active visitor for visitor ${visitor.id}:`, {
        status: visitor.status,
        hasRecentActivity,
        isActivelyTyping,
        lastActivity: visitor.lastActivity,
        minutesSinceActivity: visitor.lastActivity ? Math.round((now - new Date(visitor.lastActivity).getTime()) / (60 * 1000)) : 'N/A',
        isActive
      });
      
      return isActive;
    });
  };

  const getIdleVisitors = () => {
    return visitors.filter(visitor => {
      // Only show online visitors (exclude offline/away)
      const isOnline = visitor.status !== 'offline' && visitor.status !== 'away';
      
      // Visitors who are still connected but haven't interacted for 5+ minutes
      // Check if visitor last activity was 5+ minutes ago (no recent activity)
      const hasOldActivity = visitor.lastActivity && 
        (new Date().getTime() - new Date(visitor.lastActivity).getTime()) >= (5 * 60 * 1000);
      
      // Check if visitor is not actively typing
      const notTyping = !visitor.isTyping;
      
      // Include visitors if they are online AND have no activity within last 5 minutes and are not typing
      const shouldShowInIdle = isOnline && hasOldActivity && notTyping;
      
      console.log(`🔍 Checking idle visitor for visitor ${visitor.id}:`, {
        isOnline,
        hasOldActivity,
        notTyping,
        status: visitor.status,
        lastActivity: visitor.lastActivity,
        isTyping: visitor.isTyping,
        shouldShowInIdle
      });
      
      return shouldShowInIdle;
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
                <h2 className="font-semibold">Visitor {selectedVisitor.id.slice(-8)}</h2>
                <p className="text-sm text-gray-300">{selectedVisitor.status}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
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
                    {(!chatMessages || !Array.isArray(chatMessages)) ? (
                      <div className="text-center py-4 text-gray-500">Loading messages...</div>
                    ) : chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${
                        message.sender === 'agent' ? 'justify-end' : 
                        message.sender === 'system' ? 'justify-center' : 'justify-start'
                      }`}>
                        {message.sender === 'system' ? (
                          <div className={`px-4 py-2 rounded-lg text-xs font-medium ${
                            message.isTransferMessage 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : message.isStatusMessage
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {message.isTransferMessage ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>{message.content}</span>
                              </div>
                            ) : message.isStatusMessage ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <span>{message.content}</span>
                              </div>
                            ) : (
                              message.content
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
                            <div>{message.content}</div>
                            <div className={`text-xs mt-1 ${
                              message.sender === 'agent' ? 'text-blue-100' :
                              message.sender === 'ai' ? 'text-green-600' :
                              message.isStatusMessage ? 'text-blue-500' :
                              'text-gray-500'
                            }`}>
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Invisible div to scroll to */}
                    <div ref={messagesEndRef} />
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
                      disabled={checkingAgentAssignment}
                      onChange={(e) => {
                        console.log('Textarea onChange - agentJoined:', agentJoined, 'chatSessionActive:', chatSessionActive, 'checkingAgentAssignment:', checkingAgentAssignment);
                        setNewMessage(e.target.value);
                        
                        // Live trigger search
                        if (e.target.value.length >= 2) {
                          searchTriggers(e.target.value);
                        } else {
                          setShowSuggestions(false);
                          setTriggerSuggestions([]);
                          setCurrentSuggestion('');
                        }
                        
                        if (!agentJoined && !chatSessionActive && e.target.value.trim()) {
                          setAgentJoined(true);
                          setChatSessionActive(true);
                          // Notify that agent joined (only if not already in session)
                          if (selectedVisitor) {
                          const joinMessage = {
                            id: Date.now().toString(),
                            content: `${user?.name || 'Agent'} joined the chat`,
                            sender: 'system',
                            timestamp: new Date().toISOString(),
                            visitorId: selectedVisitor.id
                          };
                          setChatMessages(prev => [...prev, joinMessage]);
                          
                          // Store in global messages too
                          setGlobalMessages(prev => {
                            const newMap = new Map(prev);
                            const existingMessages = newMap.get(selectedVisitor.id) || [];
                            newMap.set(selectedVisitor.id, [...existingMessages, joinMessage]);
                            return newMap;
                          });
                          
                          // Notify backend that agent joined (disconnect AI)
                          handleAgentJoin(selectedVisitor.id);
                        }
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
              {isVisitorTyping && (
                <div className="px-4 text-xs text-gray-500 mt-2 flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{selectedVisitor?.name || 'Visitor'} is typing...</span>
                </div>
              )}
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
                  <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    Contact Details
                  </h4>
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
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor?.ipAddress || 'Unknown'}</span>
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
                        {selectedVisitor?.currentPage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            title={selectedVisitor.currentPage}
                            onClick={() => window.open(selectedVisitor.currentPage, '_blank')}
                          >
                            View
                          </Button>
                        ) : (
                          <span className="text-sm font-medium text-gray-500">Unknown</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Base URL</span>
                        {selectedVisitor?.currentPage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            title={new URL(selectedVisitor.currentPage).origin}
                            onClick={() => window.open(new URL(selectedVisitor.currentPage).origin, '_blank')}
                          >
                            View
                          </Button>
                        ) : (
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
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Source</span>
                      <span className="text-sm font-medium text-gray-900">{selectedVisitor?.source || 'Direct'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Medium</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{selectedVisitor?.medium || '-'}</span>
                    </div>
                    {selectedVisitor?.keyword && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Keyword</span>
                        <span className="text-sm font-medium text-blue-600 break-all text-right">{selectedVisitor.keyword}</span>
                      </div>
                    )}
                    {selectedVisitor?.searchEngine && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Search Engine</span>
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor.searchEngine}</span>
                      </div>
                    )}
                    {selectedVisitor?.campaign && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Campaign</span>
                        <span className="text-sm font-medium text-gray-900">{selectedVisitor.campaign}</span>
                      </div>
                    )}
                    {selectedVisitor?.landingPage && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Landing Page</span>
                        {selectedVisitor.landingPage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 text-xs"
                            title={selectedVisitor.landingPage}
                            onClick={() => window.open(selectedVisitor.landingPage, '_blank')}
                          >
                            View
                          </Button>
                        ) : (
                          <span className="text-sm font-medium text-gray-500">Unknown</span>
                        )}
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
                      #{visitor.id.slice(-8)}
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

    </div>
  );
}

