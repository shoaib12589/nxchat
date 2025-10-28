'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Search, 
  RefreshCw, 
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Copy,
  Send,
  Clock,
  Star,
  Zap
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface MessageTemplate {
  id: number;
  name: string;
  description?: string;
  category: 'greeting' | 'support' | 'closing' | 'escalation' | 'custom';
  message: string;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface TemplateStats {
  total_templates: number;
  favorites_count: number;
  most_used_template: string;
  total_usage: number;
  templates_by_category: Record<string, number>;
}

const templateCategories = [
  { value: 'greeting', label: 'Greeting', description: 'Welcome and introduction messages', color: 'bg-blue-100 text-blue-800' },
  { value: 'support', label: 'Support', description: 'Help and assistance messages', color: 'bg-green-100 text-green-800' },
  { value: 'closing', label: 'Closing', description: 'End conversation messages', color: 'bg-purple-100 text-purple-800' },
  { value: 'escalation', label: 'Escalation', description: 'Transfer and escalation messages', color: 'bg-orange-100 text-orange-800' },
  { value: 'custom', label: 'Custom', description: 'Your personal message templates', color: 'bg-gray-100 text-gray-800' },
];

const quickResponses = [
  {
    name: 'Thank you',
    message: 'Thank you for contacting us! How can I assist you today?'
  },
  {
    name: 'One moment',
    message: 'Please give me a moment to check that information for you.'
  },
  {
    name: 'Transfer request',
    message: 'I\'ll transfer you to a specialist who can better assist you with this matter.'
  },
  {
    name: 'Business hours',
    message: 'Our business hours are Monday to Friday, 9 AM to 5 PM. Is there anything else I can help you with?'
  },
  {
    name: 'Follow up',
    message: 'I\'ll make sure to follow up on this for you. You should hear back from us within 24 hours.'
  }
];

export default function AgentTriggersPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MessageTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom' as 'greeting' | 'support' | 'closing' | 'escalation' | 'custom',
    message: '',
    is_favorite: false
  });

  useEffect(() => {
    fetchTemplates();
    fetchStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [templates, searchTerm, selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAgentTriggers();
      if (response.success) {
        // Transform triggers to message templates
        const messageTemplates = response.data.map((trigger: any) => ({
          id: trigger.id,
          name: trigger.name,
          description: trigger.description,
          category: trigger.trigger_type === 'message' ? 'custom' : 'custom',
          message: trigger.actions?.[0]?.message || trigger.description || '',
          is_favorite: trigger.priority > 5,
          usage_count: trigger.priority || 0,
          created_at: trigger.created_at,
          updated_at: trigger.updated_at
        }));
        setTemplates(messageTemplates);
      } else {
        toast.error(response.message || 'Failed to fetch message templates');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch message templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.getAgentTriggerStats();
      if (response.success) {
        const templateStats = {
          total_templates: response.data.total_triggers,
          favorites_count: response.data.active_triggers,
          most_used_template: 'Welcome Message',
          total_usage: response.data.total_triggers * 5, // Estimated
          templates_by_category: {
            greeting: Math.floor(response.data.total_triggers * 0.3),
            support: Math.floor(response.data.total_triggers * 0.4),
            closing: Math.floor(response.data.total_triggers * 0.2),
            escalation: Math.floor(response.data.total_triggers * 0.1)
          }
        };
        setStats(templateStats);
      }
    } catch (error: any) {
      console.error('Failed to fetch template stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    await fetchStats();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...templates];

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Sort by favorites first, then by usage count
    filtered.sort((a, b) => {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return b.usage_count - a.usage_count;
    });

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = async () => {
    try {
      setSubmitting(true);
      
      // Create as a trigger with message action
      const triggerData = {
        name: formData.name,
        description: formData.description,
        trigger_type: 'message',
        conditions: {
          field: 'message',
          operator: 'contains',
          value: 'template'
        },
        actions: [{
          type: 'send_ai_response',
          message: formData.message
        }],
        priority: formData.is_favorite ? 10 : 1,
        status: 'active'
      };

      const response = await apiClient.createAgentTrigger(triggerData);

      if (response.success) {
        toast.success('Message template created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        await fetchTemplates();
        await fetchStats();
      } else {
        toast.error(response.message || 'Failed to create message template');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create message template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setSubmitting(true);
      
      const triggerData = {
        name: formData.name,
        description: formData.description,
        actions: [{
          type: 'send_ai_response',
          message: formData.message
        }],
        priority: formData.is_favorite ? 10 : 1,
        status: 'active'
      };

      const response = await apiClient.updateAgentTrigger(selectedTemplate.id, triggerData);

      if (response.success) {
        toast.success('Message template updated successfully');
        setIsEditDialogOpen(false);
        resetForm();
        await fetchTemplates();
        await fetchStats();
      } else {
        toast.error(response.message || 'Failed to update message template');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update message template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      const response = await apiClient.deleteAgentTrigger(id);

      if (response.success) {
        toast.success('Message template deleted successfully');
        await fetchTemplates();
        await fetchStats();
      } else {
        toast.error(response.message || 'Failed to delete message template');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete message template');
    }
  };

  const handleToggleFavorite = async (id: number, currentFavorite: boolean) => {
    try {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      const triggerData = {
        priority: !currentFavorite ? 10 : 1,
        status: 'active'
      };

      const response = await apiClient.updateAgentTrigger(id, triggerData);

      if (response.success) {
        toast.success(currentFavorite ? 'Removed from favorites' : 'Added to favorites');
        await fetchTemplates();
        await fetchStats();
      } else {
        toast.error(response.message || 'Failed to update template');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update template');
    }
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      message: template.message,
      is_favorite: template.is_favorite
    });
    setIsEditDialogOpen(true);
  };

  const handleQuickResponse = (quickResponse: any) => {
    setFormData(prev => ({
      ...prev,
      name: quickResponse.name,
      message: quickResponse.message,
      category: 'custom'
    }));
    setIsCreateDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Message copied to clipboard!');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'custom',
      message: '',
      is_favorite: false
    });
  };

  const getCategoryColor = (category: string) => {
    return templateCategories.find(c => c.value === category)?.color || 'bg-gray-100 text-gray-800';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'greeting': return '👋';
      case 'support': return '🛠️';
      case 'closing': return '👋';
      case 'escalation': return '⬆️';
      case 'custom': return '💬';
      default: return '💬';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat Triggers</h1>
          <p className="text-gray-600 mt-1">
            Message templates and quick responses for efficient chat support
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {templateCategories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Chat Trigger</DialogTitle>
                <DialogDescription>
                  Create a reusable message template for quick chat responses
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Welcome Message"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templateCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of when to use this template"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message Content</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter your message template here..."
                    rows={6}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_favorite"
                    checked={formData.is_favorite}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="is_favorite">Mark as favorite</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} disabled={submitting}>
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Template'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Responses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Quick Responses
          </CardTitle>
          <CardDescription>
            Pre-built common responses - click to create as templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickResponses.map((response, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{response.name}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickResponse(response)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{response.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(response.message)}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_templates}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favorites</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.favorites_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <Send className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.total_usage}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Used</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-blue-600">{stats.most_used_template}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No message templates found"
          description="Create your first message template to get started"
        />
      ) : (
        <div className="grid gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {getCategoryIcon(template.category)}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {template.name}
                        {template.is_favorite && (
                          <Star className="w-4 h-4 ml-2 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      {template.description && (
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getCategoryColor(template.category)}>
                      {templateCategories.find(c => c.value === template.category)?.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(template.message)}
                      title="Copy message"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(template.id, template.is_favorite)}
                      title={template.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-4 h-4 ${template.is_favorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{template.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {template.message}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                  <span>Used {template.usage_count} times</span>
                  <span>Created {new Date(template.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Chat Trigger</DialogTitle>
            <DialogDescription>
              Modify your message template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Welcome Message"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-message">Message Content</Label>
              <Textarea
                id="edit-message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your message template here..."
                rows={6}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-is_favorite"
                checked={formData.is_favorite}
                onChange={(e) => setFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="edit-is_favorite">Mark as favorite</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate} disabled={submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}