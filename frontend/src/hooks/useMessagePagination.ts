import { useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  id: string | number;
  [key: string]: any;
}

interface UseMessagePaginationOptions {
  initialMessages?: Message[];
  pageSize?: number;
  maxMessages?: number;
  onLoadMore?: (before?: string) => Promise<Message[]>;
}

interface UseMessagePaginationReturn {
  messages: Message[];
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  appendMessage: (message: Message) => void;
  prependMessage: (message: Message) => void;
  replaceMessage: (id: string | number, message: Message) => void;
  reset: () => void;
}

export const useMessagePagination = (options: UseMessagePaginationOptions): UseMessagePaginationReturn => {
  const {
    initialMessages = [],
    pageSize = 100,
    maxMessages = 150,
    onLoadMore
  } = options;

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oldestMessageTime = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Initialize oldest message time
  useEffect(() => {
    if (messages.length > 0) {
      const oldest = messages[0];
      oldestMessageTime.current = oldest?.created_at || oldest?.timestamp || null;
    }
  }, []);

  // Store only visible messages (sliding window approach)
  useEffect(() => {
    if (messages.length > maxMessages) {
      const removeCount = messages.length - maxMessages;
      setMessages(prev => prev.slice(removeCount));
    }
  }, [messages.length, maxMessages]);

  const loadMore = useCallback(async () => {
    if (!onLoadMore || isLoadingRef.current || !hasMore) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const newMessages = await onLoadMore(oldestMessageTime.current || undefined);

      if (newMessages.length === 0) {
        setHasMore(false);
      } else {
        // Prepend older messages
        setMessages(prev => [...newMessages, ...prev]);
        
        // Update oldest message time
        if (newMessages.length > 0) {
          const oldest = newMessages[0];
          oldestMessageTime.current = oldest?.created_at || oldest?.timestamp || null;
        }

        // If we got fewer messages than pageSize, we've reached the end
        if (newMessages.length < pageSize) {
          setHasMore(false);
        }
      }
    } catch (err: any) {
      console.error('Error loading more messages:', err);
      setError(err.message || 'Failed to load messages');
      setHasMore(false);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [onLoadMore, hasMore, pageSize, oldestMessageTime]);

  const appendMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Check if message already exists (deduplication)
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  const prependMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const exists = prev.some(m => m.id === message.id);
      if (exists) {
        return prev;
      }
      return [message, ...prev];
    });
  }, []);

  const replaceMessage = useCallback((id: string | number, message: Message) => {
    setMessages(prev => 
      prev.map(m => m.id === id ? message : m)
    );
  }, []);

  const reset = useCallback(() => {
    setMessages(initialMessages);
    setHasMore(true);
    setError(null);
    oldestMessageTime.current = null;
    
    if (initialMessages.length > 0) {
      const oldest = initialMessages[0];
      oldestMessageTime.current = oldest?.created_at || oldest?.timestamp || null;
    }
  }, [initialMessages]);

  return {
    messages,
    hasMore,
    isLoading,
    error,
    loadMore,
    appendMessage,
    prependMessage,
    replaceMessage,
    reset
  };
};

