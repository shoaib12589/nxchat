'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { cn } from '@/lib/utils';

interface Message {
  id: string | number;
  content: string;
  sender: string;
  timestamp: string;
  senderName?: string;
  messageType?: string;
  isStatusMessage?: boolean;
  [key: string]: any;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  renderMessage: (message: Message, index: number) => React.ReactNode;
  itemHeight?: number;
  containerClassName?: string;
  onScrollToTop?: () => void;
  loadMoreThreshold?: number; // Percentage of scroll from top to trigger load more
}

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  renderMessage,
  itemHeight = 100,
  containerClassName,
  onScrollToTop,
  loadMoreThreshold = 10, // 10% from top
}) => {
  const listRef = useRef<List>(null);
  const [itemSizes, setItemSizes] = useState<Map<number, number>>(new Map());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasScrolledToTop = useRef(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      // Only auto-scroll if we're near the bottom
      // This preserves user's scroll position when viewing older messages
      const listElement = listRef.current;
      if (listElement) {
        // Check if we should auto-scroll (simplified check)
        // In a real implementation, you'd track scroll position
        setTimeout(() => {
          if (!hasScrolledToTop.current) {
            listRef.current?.scrollToItem(messages.length - 1, 'end');
          }
        }, 100);
      }
    }
  }, [messages.length]);

  // Variable height implementation
  const getItemSize = useCallback(
    (index: number): number => {
      return itemSizes.get(index) || itemHeight;
    },
    [itemSizes, itemHeight]
  );

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const message = messages[index];
      
      if (!message) {
        return null;
      }

      return (
        <div style={style}>
          <div ref={(node) => {
            if (node) {
              const height = node.offsetHeight;
              if (height > 0) {
                setItemSizes(prev => {
                  const newMap = new Map(prev);
                  newMap.set(index, height);
                  return newMap;
                });
              }
            }
          }}>
            {renderMessage(message, index)}
          </div>
        </div>
      );
    },
    [messages, renderMessage]
  );

  const handleScroll = useCallback(
    ({ scrollOffset, scrollUpdateWasRequested }: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => {
      if (!scrollUpdateWasRequested && onScrollToTop) {
        const listElement = listRef.current;
        if (listElement) {
          const container = listElement as any;
          if (container._outerRef) {
            const containerHeight = container._outerRef.clientHeight;
            const scrollPercentage = (scrollOffset / containerHeight) * 100;
            
            // Trigger load more when scrolled to threshold from top
            if (scrollPercentage <= loadMoreThreshold && !isLoadingMore) {
              setIsLoadingMore(true);
              hasScrolledToTop.current = true;
              onScrollToTop();
              
              // Reset loading state after a short delay
              setTimeout(() => {
                setIsLoadingMore(false);
              }, 500);
            } else if (scrollPercentage > loadMoreThreshold) {
              hasScrolledToTop.current = false;
            }
          }
        }
      }
    },
    [onScrollToTop, loadMoreThreshold, isLoadingMore]
  );

  const totalHeight = useMemo(() => {
    return messages.length * itemHeight;
  }, [messages.length, itemHeight]);

  if (messages.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', containerClassName)}>
        <p className="text-muted-foreground">No messages yet</p>
      </div>
    );
  }

  return (
    <div className={cn('h-full', containerClassName)}>
      {isLoadingMore && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Loading more messages...
        </div>
      )}
      <List
        ref={listRef}
        height={totalHeight}
        itemCount={messages.length}
        itemSize={getItemSize}
        width="100%"
        overscanCount={5}
        onScroll={handleScroll}
        className="scrollbar-thin scrollbar-thumb-gray-300"
      >
        {Row}
      </List>
    </div>
  );
};

