'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { 
  Bot, 
  Plus, 
  Upload, 
  FileText, 
  Trash2, 
  Edit,
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  Target,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api';

interface AITrainingDoc {
  id: number;
  title: string;
  content: string;
  category: string;
  brand_id?: number;
  brand?: {
    id: number;
    name: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface TrainingStats {
  total_documents: number;
  processed_documents: number;
  pending_documents: number;
  failed_documents: number;
  training_progress: number;
}

export default function AITrainingPage() {
  const [documents, setDocuments] = useState<AITrainingDoc[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<AITrainingDoc | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    brand_id: 'general',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const response = await apiClient.getBrands();
      if (response.success) {
        setBrands(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch brands:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAITrainingDocs();
      
      if (response.success) {
        setDocuments(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch training documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.getAITrainingStats();
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch training stats:', error);
    }
  };

  const handleCreateDocument = async () => {
    try {
      setSubmitting(true);
      const response = await apiClient.createAITrainingDoc({
        ...formData,
        brand_id: formData.brand_id === 'general' ? null : parseInt(formData.brand_id)
      });

      if (response.success) {
        toast.success('Training document created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchDocuments();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create training document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDocument = async () => {
    if (!editingDoc) return;

    try {
      setSubmitting(true);
      const response = await apiClient.updateAITrainingDoc(editingDoc.id, {
        ...formData,
        brand_id: formData.brand_id === 'general' ? null : parseInt(formData.brand_id)
      });

      if (response.success) {
        toast.success('Training document updated successfully');
        setIsEditDialogOpen(false);
        setEditingDoc(null);
        resetForm();
        fetchDocuments();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update training document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    try {
      const response = await apiClient.deleteAITrainingDoc(id);

      if (response.success) {
        toast.success('Training document deleted successfully');
        fetchDocuments();
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete training document');
    }
  };

  const handleProcessDocument = async (id: number) => {
    try {
      const response = await apiClient.processAITrainingDoc(id);

      if (response.success) {
        toast.success('Document processing started');
        fetchDocuments();
        fetchStats();
        
        // Refresh after a delay to show processing status
        setTimeout(() => {
          fetchDocuments();
          fetchStats();
        }, 3000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process training document');
    }
  };

  const handleProcessAllDocuments = async () => {
    try {
      const response = await apiClient.processAllAITrainingDocs();

      if (response.success) {
        toast.success(`Processing started for ${response.data.processed_count} documents`);
        fetchDocuments();
        fetchStats();
        
        // Refresh after a delay to show processing status
        setTimeout(() => {
          fetchDocuments();
          fetchStats();
        }, 5000);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process training documents');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      brand_id: 'general',
    });
  };

  const openEditDialog = (doc: AITrainingDoc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      category: doc.category,
      brand_id: doc.brand_id?.toString() || 'general',
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'faq':
        return <BookOpen className="w-4 h-4" />;
      case 'product':
        return <Target className="w-4 h-4" />;
      case 'support':
        return <Bot className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Training</h1>
          <p className="text-muted-foreground">
            Train your AI assistant with business-specific knowledge and responses
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleProcessAllDocuments}
            disabled={documents.filter(doc => doc.status === 'pending').length === 0}
          >
            <Zap className="w-4 h-4 mr-2" />
            Process All Pending
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Training Document
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Training Document</DialogTitle>
              <DialogDescription>
                Add a new document to train your AI assistant
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Product FAQ, Support Guidelines"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="policy">Policy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand (Optional)</Label>
                <Select
                  value={formData.brand_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, brand_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand for brand-specific training" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (All Brands)</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the training content here..."
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDocument} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Document'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_documents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.processed_documents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending_documents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.training_progress}%</div>
              <Progress value={stats.training_progress} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Training Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Training Documents</CardTitle>
          <CardDescription>
            Manage your AI training documents and monitor their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Training Documents</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first training document to improve your AI assistant
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Document
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(doc.category)}
                      <div>
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {doc.category} • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(doc.status)}
                    {doc.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleProcessDocument(doc.id)}
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Process
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(doc)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Training Document</DialogTitle>
            <DialogDescription>
              Update the training document content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Product FAQ, Support Guidelines"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the training content here..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDocument} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Document'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
