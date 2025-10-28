'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { SocketMessage, SocketNotification } from '@/types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  messages: SocketMessage[];
  notifications: SocketNotification[];
  sendMessage: (chatId: number, content: string, messageType?: 'text' | 'image' | 'file') => void;
  markMessageAsRead: (messageId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearMessages: () => void;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  
  const { user, token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user && token) {
      console.log('Initializing socket connection...');
      console.log('Auth state:', { isAuthenticated, hasUser: !!user, hasToken: !!token });
      
      // Initialize socket connection
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        auth: {
          token,
          userId: user.id,
          userRole: user.role,
          tenantId: user.tenant_id,
        },
        transports: ['websocket', 'polling'],
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        
        // Debug authentication data
        console.log('Sending authentication with token:', token ? 'Token exists' : 'No token');
        console.log('Token value:', token);
        console.log('User data:', { id: user?.id, role: user?.role, tenantId: user?.tenant_id });
        
        // Debug token structure
        try {
          const tokenParts = cleanToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Token payload from frontend:', payload);
            console.log('Token has tenantId:', 'tenantId' in payload);
            console.log('Token tenantId value:', payload.tenantId);
          } else {
            console.log('Token format invalid - not 3 parts');
          }
        } catch (error) {
          console.log('Error decoding token on frontend:', error);
        }
        
        // Check if token is valid (not empty and not just "Bearer ")
        if (!token || token.trim() === '' || token === 'Bearer ') {
          console.error('Invalid token for socket authentication:', token);
          setIsConnected(false);
          return;
        }
        
        // Remove "Bearer " prefix if present
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
        console.log('Clean token for socket auth:', cleanToken);
        
        // Test token decoding on frontend (for debugging)
        try {
          const tokenParts = cleanToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('Token payload:', payload);
          } else {
            console.log('Token format invalid - not 3 parts');
          }
        } catch (error) {
          console.log('Error decoding token:', error);
        }
        
        // Authenticate with backend
        newSocket.emit('authenticate', { token: cleanToken });
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Authentication event handlers
      newSocket.on('authenticated', (data) => {
        console.log('Socket authenticated successfully:', data);
      });

      newSocket.on('auth_error', (error) => {
        console.error('Socket authentication error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Error type:', typeof error);
        console.error('Error keys:', error ? Object.keys(error) : 'No keys');
        console.error('Error message:', error?.message);
        console.error('Error errorType:', error?.errorType);
        setIsConnected(false);
      });

      // Message event handlers
      newSocket.on('new_message', (message: SocketMessage) => {
        console.log('New message received:', message);
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('message_read', (messageId: string) => {
        console.log('Message marked as read:', messageId);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
      });

      newSocket.on('typing_start', (data: { chatId: number; userId: number; userName: string }) => {
        console.log('User started typing:', data);
        // Handle typing indicators
      });

      newSocket.on('typing_stop', (data: { chatId: number; userId: number }) => {
        console.log('User stopped typing:', data);
        // Handle typing indicators
      });

      // Notification event handlers
      newSocket.on('new_notification', (notification: SocketNotification) => {
        console.log('New notification received:', notification);
        setNotifications(prev => [...prev, notification]);
      });

      newSocket.on('notification_read', (notificationId: string) => {
        console.log('Notification marked as read:', notificationId);
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
      });

      // Chat event handlers
      newSocket.on('chat_assigned', (data: { chatId: number; agentId: number; agentName: string }) => {
        console.log('Chat assigned:', data);
        // Handle chat assignment
      });

      newSocket.on('chat_ended', (data: { chatId: number; rating?: number; feedback?: string }) => {
        console.log('Chat ended:', data);
        // Handle chat end
      });

      // Call event handlers
      newSocket.on('call_initiated', (data: { chatId: number; initiatorId: number; initiatorName: string }) => {
        console.log('Call initiated:', data);
        // Handle call initiation
      });

      newSocket.on('call_ended', (data: { chatId: number; duration?: number }) => {
        console.log('Call ended:', data);
        // Handle call end
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      // Disconnect socket if not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user, token]);

  const sendMessage = useCallback((chatId: number, content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
    if (socket && isConnected) {
      const message: Partial<SocketMessage> = {
        chat_id: chatId,
        content,
        message_type: messageType,
        sender_id: user?.id,
        created_at: new Date().toISOString(),
      };

      socket.emit('send_message', message);
    }
  }, [socket, isConnected, user?.id]);

  const markMessageAsRead = useCallback((messageId: string) => {
    if (socket && isConnected) {
      socket.emit('mark_message_read', messageId);
    }
  }, [socket, isConnected]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    if (socket && isConnected) {
      socket.emit('mark_notification_read', notificationId);
    }
  }, [socket, isConnected]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value: SocketContextType = useMemo(() => ({
    socket,
    isConnected,
    messages,
    notifications,
    sendMessage,
    markMessageAsRead,
    markNotificationAsRead,
    clearMessages,
    clearNotifications,
  }), [socket, isConnected, messages, notifications, sendMessage, markMessageAsRead, markNotificationAsRead, clearMessages, clearNotifications]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
