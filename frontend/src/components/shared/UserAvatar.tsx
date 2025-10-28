'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { User as UserType } from '@/types';

interface UserAvatarProps {
  user: UserType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnlineStatus?: boolean;
  showRole?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showOnlineStatus = false,
  showRole = false,
  className,
}) => {
  const getUserInitials = () => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500';
      case 'company_admin':
        return 'bg-blue-500';
      case 'agent':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'company_admin':
        return 'Company Admin';
      case 'agent':
        return 'Agent';
      default:
        return 'User';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'suspended':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />
          <AvatarFallback className={cn(textSizeClasses[size])}>
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        {/* Online Status Indicator */}
        {showOnlineStatus && (
          <div className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
            getStatusColor(user.status)
          )} />
        )}
      </div>

      {/* User Info */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center space-x-2">
          <span className={cn(
            'font-medium truncate',
            textSizeClasses[size]
          )}>
            {user.first_name} {user.last_name}
          </span>
          {showRole && (
            <Badge 
              variant="secondary" 
              className={cn(
                'text-xs',
                getRoleBadgeColor(user.role)
              )}
            >
              {getRoleDisplayName(user.role)}
            </Badge>
          )}
        </div>
        <span className={cn(
          'text-muted-foreground truncate',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          {user.email}
        </span>
      </div>
    </div>
  );
};
