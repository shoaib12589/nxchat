'use client';

import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  Plus, 
  Edit,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import apiClient from '@/lib/api';
import { User, Department } from '@/types';
import { toast } from 'sonner';

export default function AgentsPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<User | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    agent: User | null;
  }>({ open: false, agent: null });
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: 'none',
    status: 'active',
    creation_method: 'password', // 'password' or 'invite'
    password: '',
    send_invite: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchDepartments();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAgents();
      
      if (response.success) {
        setAgents(response.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.getDepartments();
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleCreateAgent = async () => {
    try {
      setSubmitting(true);
      
      // Validate required fields based on creation method
      if (formData.creation_method === 'password' && !formData.password.trim()) {
        toast.error('Password is required when setting password manually');
        return;
      }

      const agentData: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        department_id: formData.department_id && formData.department_id !== 'none' ? parseInt(formData.department_id) : undefined,
        status: formData.status,
        creation_method: formData.creation_method,
      };

      // Add password or invite options based on creation method
      if (formData.creation_method === 'password') {
        agentData.password = formData.password;
      } else if (formData.creation_method === 'invite') {
        agentData.send_invite = formData.send_invite;
      }

      const response = await apiClient.createAgent(agentData);

      if (response.success) {
        const successMessage = formData.creation_method === 'invite' && formData.send_invite
          ? 'Agent created and invitation email sent successfully'
          : 'Agent created successfully';
        toast.success(successMessage);
        setIsCreateDialogOpen(false);
        resetForm();
        fetchAgents();
      }
    } catch (error: any) {
      if (error.response?.data?.limit_reached) {
        toast.error(error.response.data.message || 'Agent limit reached');
        // Optionally navigate to billing page
        // router.push('/company/billing');
      } else {
        toast.error(error.message || 'Failed to create agent');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent) return;

    try {
      setSubmitting(true);
      const response = await apiClient.updateAgent(editingAgent.id, {
        ...formData,
        department_id: formData.department_id && formData.department_id !== 'none' ? parseInt(formData.department_id) : undefined,
      });

      if (response.success) {
        toast.success('Agent updated successfully');
        setIsEditDialogOpen(false);
        setEditingAgent(null);
        resetForm();
        fetchAgents();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update agent');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteDialog.agent) return;

    try {
      const response = await apiClient.deleteAgent(deleteDialog.agent.id);
      
      if (response.success) {
        toast.success('Agent deleted successfully');
        setDeleteDialog({ open: false, agent: null });
        fetchAgents();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete agent');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department_id: 'none',
      status: 'active',
      creation_method: 'password',
      password: '',
      send_invite: false,
    });
  };

  const openEditDialog = (agent: User) => {
    setEditingAgent(agent);
    
    // Split the name into first_name and last_name
    const nameParts = agent.name ? agent.name.split(' ') : ['', ''];
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || '';
    
    setFormData({
      first_name,
      last_name,
      email: agent.email,
      phone: agent.phone || '',
      department_id: agent.department_id?.toString() || 'none',
      status: agent.status,
      creation_method: 'password',
      password: '',
      send_invite: false,
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Active</span>
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Inactive</span>
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Suspended</span>
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const agentColumns = [
    {
      key: 'user',
      title: 'Agent',
      render: (value: any, agent: User) => (
        <UserAvatar
          user={agent}
          size="md"
          showRole={false}
          className="max-w-none"
        />
      ),
    },
    {
      key: 'department',
      title: 'Department',
      render: (value: any) => value?.name || 'No Department',
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'created_at',
      title: 'Joined',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, agent: User) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(agent)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialog({ open: true, agent })}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading agents..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Users}
        title="Failed to load agents"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchAgents,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage your support team members
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
              <DialogDescription>
                Create a new agent account for your support team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              {/* Password/Invite Options */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Account Creation Method</Label>
                  <RadioGroup
                    value={formData.creation_method}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, creation_method: value }))}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="password" id="password" />
                      <Label htmlFor="password" className="text-sm font-normal">
                        Set password manually
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="invite" id="invite" />
                      <Label htmlFor="invite" className="text-sm font-normal">
                        Send email invite
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Password field - only show when password method is selected */}
                {formData.creation_method === 'password' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password for the agent"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      The agent will use this password to log in
                    </p>
                  </div>
                )}

                {/* Invite options - only show when invite method is selected */}
                {formData.creation_method === 'invite' && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="send_invite"
                        checked={formData.send_invite}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_invite: checked }))}
                      />
                      <Label htmlFor="send_invite" className="text-sm">
                        Send invitation email immediately
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formData.send_invite 
                        ? "An invitation email will be sent to the agent with login instructions"
                        : "The agent account will be created but no email will be sent"
                      }
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAgent} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Agent'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Agents ({agents.length})</CardTitle>
          <CardDescription>
            Manage your support team members and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No agents found"
              description="Add your first agent to get started with customer support"
              action={{
                label: 'Add Agent',
                onClick: () => setIsCreateDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              data={agents}
              columns={agentColumns}
              searchable={false}
              filterable={false}
              pagination={undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update agent information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first_name">First Name</Label>
                <Input
                  id="edit-first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last_name">Last Name</Label>
                <Input
                  id="edit-last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone (Optional)</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, department_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAgent} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Agent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, agent: null })}
        title="Delete Agent"
        description={`Are you sure you want to delete "${deleteDialog.agent?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteAgent}
      />
    </div>
  );
}
