'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Plus, Edit, Trash2, Eye, TestTube, Copy, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface EmailTemplate {
  id: number;
  name: string;
  type: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState(searchParams?.get('type') || 'all');
  const [showActiveOnly, setShowActiveOnly] = useState<'all' | 'true' | 'false'>('all');

  useEffect(() => {
    fetchTemplates();
  }, [selectedType, showActiveOnly]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 100
      };

      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      if (showActiveOnly !== 'all') {
        params.is_active = showActiveOnly;
      }

      const response = await apiClient.get('/email-templates', { params });
      
      if (response.success) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const deleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await apiClient.delete(`/email-templates/${id}`);
      if (response.success) {
        toast.success('Template deleted successfully');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const duplicateTemplate = async (id: number) => {
    try {
      const response = await apiClient.post(`/email-templates/${id}/duplicate`);
      if (response.success) {
        toast.success('Template duplicated successfully');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const toggleActive = async (id: number) => {
    try {
      const response = await apiClient.patch(`/email-templates/${id}/toggle`);
      if (response.success) {
        toast.success(response.message);
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to toggle template status');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      verification: 'bg-blue-100 text-blue-800',
      password_reset: 'bg-orange-100 text-orange-800',
      welcome: 'bg-green-100 text-green-800',
      agent_invitation: 'bg-purple-100 text-purple-800',
      notification: 'bg-yellow-100 text-yellow-800',
      chat_assignment: 'bg-indigo-100 text-indigo-800',
      ticket_created: 'bg-teal-100 text-teal-800',
      ticket_reply: 'bg-emerald-100 text-emerald-800',
      custom: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.custom;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      verification: 'Verification',
      password_reset: 'Password Reset',
      welcome: 'Welcome',
      agent_invitation: 'Agent Invitation',
      notification: 'Notification',
      chat_assignment: 'Chat Assignment',
      ticket_created: 'Ticket Created',
      ticket_reply: 'Ticket Reply',
      custom: 'Custom'
    };
    return labels[type] || type;
  };

  if (loading) {
    return <LoadingSpinner text="Loading email templates..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage and customize your email templates
          </p>
        </div>
        <Button onClick={() => router.push('/superadmin/email-templates/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="verification">Verification</option>
                <option value="password_reset">Password Reset</option>
                <option value="welcome">Welcome</option>
                <option value="agent_invitation">Agent Invitation</option>
                <option value="notification">Notification</option>
                <option value="chat_assignment">Chat Assignment</option>
                <option value="ticket_created">Ticket Created</option>
                <option value="ticket_reply">Ticket Reply</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email templates found"
          description="Create your first email template to get started"
          action={{
            label: 'New Template',
            onClick: () => router.push('/superadmin/email-templates/new')
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge className={getTypeColor(template.type)}>
                    {getTypeLabel(template.type)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {template.subject}
                </p>
                
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/superadmin/email-templates/${template.id}`)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(template.id)}
                    >
                      {template.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateTemplate(template.id)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


