'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, 
  ChevronUp, 
  Wifi, 
  Coffee, 
  EyeOff 
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/lib/api';
import { useSocket } from '@/contexts/SocketContext';
import { toast } from 'sonner';

type PresenceStatus = 'online' | 'away' | 'invisible';

interface AgentStatusIndicatorProps {
  className?: string;
}

const statusConfig = {
  online: {
    label: 'Online',
    icon: Wifi,
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-100',
    dotColor: 'bg-green-500',
    circleBg: 'bg-green-500'
  },
  away: {
    label: 'Away',
    icon: Coffee,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    dotColor: 'bg-orange-500',
    circleBg: 'bg-orange-500'
  },
  invisible: {
    label: 'Invisible',
    icon: EyeOff,
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-100',
    dotColor: 'bg-gray-500',
    circleBg: 'bg-gray-600'
  }
};

export const AgentStatusIndicator: React.FC<AgentStatusIndicatorProps> = ({ className = '' }) => {
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('online');
  const [isUpdating, setIsUpdating] = useState(false);
  const [workload, setWorkload] = useState<{
    available_agents: number;
    waiting_chats: number;
    agents: Array<{
      id: number;
      name: string;
      current_chats: number;
      max_chats: number;
      availability: number;
    }>;
  } | null>(null);

  useEffect(() => {
    if (user?.role === 'agent') {
      fetchAgentStatus();
      fetchWorkload();
    }
  }, [user]);

  useEffect(() => {
    if (socket && user?.role === 'agent') {
      // Listen for agent status changes
      socket.on('agent:status:changed', (data: {
        agentId: number;
        agentName: string;
        presenceStatus: PresenceStatus;
        oldStatus: PresenceStatus;
        timestamp: string;
      }) => {
        if (data.agentId === user.id) {
          setPresenceStatus(data.presenceStatus);
          toast.success(`Status changed to ${data.presenceStatus}`);
        }
        // Refresh workload when any agent status changes
        fetchWorkload();
      });

      return () => {
        socket.off('agent:status:changed');
      };
    }
  }, [socket, user]);

  const fetchAgentStatus = async () => {
    try {
      const response = await apiClient.getAgentStatus();
      if (response.success) {
        setPresenceStatus(response.data.presence_status || 'online');
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    }
  };

  const fetchWorkload = async () => {
    try {
      const response = await apiClient.getAgentWorkload();
      if (response.success) {
        setWorkload(response.data);
      }
    } catch (error) {
      console.error('Error fetching workload:', error);
    }
  };

  const handleStatusChange = async (newStatus: PresenceStatus) => {
    if (isUpdating || newStatus === presenceStatus) return;

    setIsUpdating(true);
    try {
      const response = await apiClient.updateAgentStatus(newStatus);
      if (response.success) {
        setPresenceStatus(newStatus);
        toast.success(`Status changed to ${statusConfig[newStatus].label}`);
        // Refresh workload after status change
        fetchWorkload();
      } else {
        toast.error(response.message || 'Failed to update status');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user || user.role !== 'agent') {
    return null;
  }

  const currentConfig = statusConfig[presenceStatus];

  return (
    <div className={`w-full ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg border-0 shadow-sm"
            disabled={isUpdating}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-4 ${currentConfig.circleBg} rounded-full flex items-center justify-center`}>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-sm font-medium text-white">
                {currentConfig.label}
              </span>
            </div>
            <ChevronUp className="w-4 h-4 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-full min-w-[200px] mt-1 shadow-lg border border-gray-200">
          {Object.entries(statusConfig).map(([status, config]) => {
            const isSelected = status === presenceStatus;
            
            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusChange(status as PresenceStatus)}
                className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 ${
                  isSelected ? 'bg-gray-100' : ''
                }`}
                disabled={isUpdating}
              >
                <div className={`w-6 h-4 ${config.circleBg} rounded-full flex items-center justify-center`}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {config.label}
                </span>
              </DropdownMenuItem>
            );
          })}
          
          {/* Workload Information */}
          {workload && (
            <>
              <div className="border-t border-gray-200 my-2"></div>
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Team Status
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Available Agents</span>
                    <Badge variant="secondary" className="text-xs">
                      {workload.available_agents}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Waiting Chats</span>
                    <Badge variant={workload.waiting_chats > 0 ? "destructive" : "secondary"} className="text-xs">
                      {workload.waiting_chats}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
