'use client';

import React, { memo, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User, Bot, FileText, Image, File } from 'lucide-react';
import { Message } from '@/types';

interface ChatBubbleProps {
  message: Message;
  isOwn?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

const ChatBubbleComponent: React.FC<ChatBubbleProps> = ({
  message,
  isOwn = false,
  showAvatar = true,
  showTimestamp = true,
  className,
}) => {
  // Memoize expensive computations
  const senderInitials = useMemo(() => {
    if (!message.sender) return 'U';
    return `${message.sender.first_name?.[0] || ''}${message.sender.last_name?.[0] || ''}`.toUpperCase();
  }, [message.sender]);

  const formattedTimestamp = useMemo(() => {
    const date = new Date(message.created_at);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.created_at]);
  const getMessageIcon = (messageType: string) => {
    switch (messageType) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'file':
        return <File className="w-4 h-4" />;
      case 'system':
        return <Bot className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const renderMessageContent = () => {
    if (message.message_type === 'image' && message.file_url) {
      return (
        <div className="space-y-2">
          <img
            src={message.file_url}
            alt="Shared image"
            className="max-w-xs rounded-lg"
          />
          {message.content && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    if (message.message_type === 'file' && message.file_url) {
      return (
        <div className="space-y-2">
          <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
            {getMessageIcon(message.message_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.file_name || 'File'}
              </p>
              {message.file_size && (
                <p className="text-xs text-muted-foreground">
                  {(message.file_size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
            <a
              href={message.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-xs"
            >
              Download
            </a>
          </div>
          {message.content && (
            <p className="text-sm">{message.content}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.message_type === 'system' && (
          <Badge variant="secondary" className="text-xs">
            System Message
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex items-start space-x-2 group',
      isOwn && 'flex-row-reverse space-x-reverse',
      className
    )}>
      {/* Avatar */}
      {showAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback>
            {senderInitials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message Content */}
      <div className={cn(
        'flex flex-col space-y-1 max-w-xs lg:max-w-md',
        isOwn && 'items-end'
      )}>
        {/* Sender Name */}
        {message.sender && !isOwn && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-muted-foreground">
              {message.sender.first_name} {message.sender.last_name}
            </span>
            {message.sender.role === 'agent' && (
              <Badge variant="outline" className="text-xs">
                Agent
              </Badge>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div className={cn(
          'rounded-lg px-3 py-2',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
          message.message_type === 'system' && 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
        )}>
          {renderMessageContent()}
        </div>

        {/* Timestamp */}
        {showTimestamp && (
          <div className={cn(
            'text-xs text-muted-foreground',
            isOwn && 'text-right'
          )}>
            {formattedTimestamp}
            {message.is_read && isOwn && (
              <span className="ml-1 text-primary">✓</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ChatBubble = memo(ChatBubbleComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_read === nextProps.message.is_read &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.showTimestamp === nextProps.showTimestamp
  );
});

ChatBubble.displayName = 'ChatBubble';
