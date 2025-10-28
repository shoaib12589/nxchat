'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Brand, User } from '@/types';

interface AssignAgentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
  availableAgents: User[];
  onAgentsAssigned: () => void;
}

export default function AssignAgentsDialog({ 
  open, 
  onOpenChange, 
  brand, 
  availableAgents, 
  onAgentsAssigned 
}: AssignAgentsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]);

  const formatRole = (role: string | undefined | null): string => {
    if (!role || typeof role !== 'string') {
      console.warn('Invalid role value:', role);
      return 'Unknown';
    }
    return role.replace('_', ' ');
  };

  useEffect(() => {
    if (open && brand) {
      // Pre-select currently assigned agents
      const assignedAgentIds = brand.agents?.map(agent => agent.id) || [];
      setSelectedAgentIds(assignedAgentIds);
    }
  }, [open, brand]);

  const handleAgentToggle = (agentId: number) => {
    setSelectedAgentIds(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSubmit = async () => {
    if (!brand) return;

    try {
      setLoading(true);
      const response = await apiClient.assignAgentsToBrand(brand.id, selectedAgentIds);
      
      if (response.success) {
        toast.success('Agents assigned successfully');
        onAgentsAssigned();
      } else {
        toast.error(response.message || 'Failed to assign agents');
      }
    } catch (error) {
      console.error('Error assigning agents:', error);
      toast.error('Failed to assign agents');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedAgentIds([]);
    }
    onOpenChange(open);
  };

  if (!brand) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Agents to {brand.name}</DialogTitle>
          <DialogDescription>
            Select which agents should handle chats from this brand&apos;s widget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {availableAgents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No available agents found.</p>
            </div>
          ) : (
            availableAgents.map((agent) => {
              console.log('Agent object:', agent);
              return (
              <div key={agent.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={`agent-${agent.id}`}
                  checked={selectedAgentIds.includes(agent.id)}
                  onCheckedChange={() => handleAgentToggle(agent.id)}
                />
                <div className="flex items-center gap-3 flex-1">
                  {agent.avatar ? (
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-semibold">
                        {agent.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-muted-foreground">{agent.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {formatRole(agent.role)}
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Assigning...' : `Assign ${selectedAgentIds.length} Agent${selectedAgentIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
