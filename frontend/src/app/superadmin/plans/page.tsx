'use client';

import React, { useEffect, useState } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  CreditCard, 
  Plus, 
  Edit,
  Trash2,
  DollarSign,
  Loader2,
  Check,
  X
} from 'lucide-react';
import apiClient from '@/lib/api';
import { Plan } from '@/types';
import { toast } from 'sonner';

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    plan: Plan | null;
  }>({ open: false, plan: null });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    billing_cycle: 'monthly',
    max_agents: '',
    max_brands: '',
    max_departments: '',
    max_storage: '',
    max_ai_messages: '',
    ai_enabled: false,
    ai_training: false,
    grammar_checker: false,
    custom_branding: false,
    is_active: true,
    stripe_price_id: '',
    interval: 'month',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPlans();
      
      if (response.success) {
        setPlans(response.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      setSubmitting(true);
      const response = await apiClient.createPlan({
        ...formData,
        price: parseFloat(formData.price),
        max_agents: parseInt(formData.max_agents),
        max_brands: parseInt(formData.max_brands),
        max_departments: parseInt(formData.max_departments),
        max_storage: parseInt(formData.max_storage),
        max_ai_messages: parseInt(formData.max_ai_messages) || 0,
        ai_enabled: formData.ai_enabled,
        stripe_price_id: formData.stripe_price_id,
        billing_interval: formData.interval,
        features: {
          ai_training: formData.ai_training,
          grammar_checker: formData.grammar_checker,
          custom_branding: formData.custom_branding,
        },
      });

      if (response.success) {
        toast.success('Plan created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchPlans();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;

    try {
      setSubmitting(true);
      const response = await apiClient.updatePlan(editingPlan.id, {
        ...formData,
        price: parseFloat(formData.price),
        max_agents: parseInt(formData.max_agents),
        max_brands: parseInt(formData.max_brands),
        max_departments: parseInt(formData.max_departments),
        max_storage: parseInt(formData.max_storage),
        max_ai_messages: parseInt(formData.max_ai_messages) || 0,
        ai_enabled: formData.ai_enabled,
        stripe_price_id: formData.stripe_price_id,
        billing_interval: formData.interval,
        features: {
          ai_training: formData.ai_training,
          grammar_checker: formData.grammar_checker,
          custom_branding: formData.custom_branding,
        },
      });

      if (response.success) {
        toast.success('Plan updated successfully');
        setIsEditDialogOpen(false);
        setEditingPlan(null);
        resetForm();
        fetchPlans();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deleteDialog.plan) return;

    try {
      const response = await apiClient.deletePlan(deleteDialog.plan.id);
      
      if (response.success) {
        toast.success('Plan deleted successfully');
        setDeleteDialog({ open: false, plan: null });
        fetchPlans();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete plan');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      currency: 'USD',
      billing_cycle: 'monthly',
      max_agents: '',
      max_brands: '',
      max_departments: '',
      max_storage: '',
      max_ai_messages: '',
      ai_enabled: false,
      ai_training: false,
      grammar_checker: false,
      custom_branding: false,
      is_active: true,
      stripe_price_id: '',
      interval: 'month',
    });
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    
    // Parse features from plan.features (could be array or object)
    const features = plan.features || {};
    const featureMap = Array.isArray(features) 
      ? features.reduce((acc, feature) => ({ ...acc, [feature]: true }), {})
      : features;

    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      currency: plan.currency,
      billing_cycle: plan.billing_cycle,
      max_agents: plan.max_agents.toString(),
      max_brands: plan.max_brands?.toString() || '',
      max_departments: plan.max_departments.toString(),
      max_storage: plan.max_storage.toString(),
      max_ai_messages: plan.max_ai_messages?.toString() || '',
      ai_enabled: plan.ai_enabled || false,
      ai_training: featureMap.ai_training || false,
      grammar_checker: featureMap.grammar_checker || false,
      custom_branding: featureMap.custom_branding || false,
      is_active: plan.is_active,
      stripe_price_id: plan.stripe_price_id || '',
      interval: plan.billing_interval || 'month',
    });
    setIsEditDialogOpen(true);
  };

  const planColumns = [
    {
      key: 'name',
      title: 'Plan Name',
      render: (value: string, plan: Plan) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">{plan.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      title: 'Price',
      render: (value: number, plan: Plan) => (
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{value}</span>
          <span className="text-sm text-muted-foreground">/{plan.billing_cycle}</span>
        </div>
      ),
    },
    {
      key: 'max_agents',
      title: 'Max Agents',
      render: (value: number) => (
        <Badge variant="secondary">{value}</Badge>
      ),
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, plan: Plan) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(plan)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialog({ open: true, plan })}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading plans..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Failed to load plans"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchPlans,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Manage subscription plans and pricing
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Add a new subscription plan
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Pro Plan"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="29.99"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Plan description..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing_cycle">Billing Cycle</Label>
                  <Select
                    value={formData.billing_cycle}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, billing_cycle: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_storage">Max Storage (GB)</Label>
                  <Input
                    id="max_storage"
                    type="number"
                    value={formData.max_storage}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_storage: e.target.value }))}
                    placeholder="100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_agents">Max Agents</Label>
                  <Input
                    id="max_agents"
                    type="number"
                    value={formData.max_agents}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_agents: e.target.value }))}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_brands">Max Brands</Label>
                  <Input
                    id="max_brands"
                    type="number"
                    value={formData.max_brands}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_brands: e.target.value }))}
                    placeholder="3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_departments">Max Departments</Label>
                  <Input
                    id="max_departments"
                    type="number"
                    value={formData.max_departments}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_departments: e.target.value }))}
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_ai_messages">Max AI Messages</Label>
                  <Input
                    id="max_ai_messages"
                    type="number"
                    value={formData.max_ai_messages}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_ai_messages: e.target.value }))}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe_price_id">Stripe Price ID</Label>
                  <Input
                    id="stripe_price_id"
                    value={formData.stripe_price_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, stripe_price_id: e.target.value }))}
                    placeholder="price_1234567890"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Plan Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="ai_enabled" className="text-base font-medium">AI Enabled</Label>
                      <p className="text-sm text-muted-foreground">Enable AI chatbot functionality</p>
                    </div>
                    <Switch
                      id="ai_enabled"
                      checked={formData.ai_enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ai_enabled: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="ai_training" className="text-base font-medium">AI Training</Label>
                      <p className="text-sm text-muted-foreground">Allow AI training with custom documents</p>
                    </div>
                    <Switch
                      id="ai_training"
                      checked={formData.ai_training}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ai_training: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">AI Messages Limit</Label>
                      <p className="text-sm text-muted-foreground">Maximum AI messages allowed per billing cycle</p>
                    </div>
                    <div className="text-sm font-medium text-right">
                      {formData.max_ai_messages || 0}<br/>
                      <span className="text-xs text-muted-foreground">messages</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="custom_branding" className="text-base font-medium">Custom Branding</Label>
                      <p className="text-sm text-muted-foreground">Allow custom branding and white-labeling</p>
                    </div>
                    <Switch
                      id="custom_branding"
                      checked={formData.custom_branding}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, custom_branding: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label htmlFor="grammar_checker" className="text-base font-medium">Grammar Checker</Label>
                      <p className="text-sm text-muted-foreground">Enable grammar checking for messages</p>
                    </div>
                    <Switch
                      id="grammar_checker"
                      checked={formData.grammar_checker}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, grammar_checker: checked }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active Plan</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePlan} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Plan'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Plans ({plans.length})</CardTitle>
          <CardDescription>
            Manage subscription plans and their features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No plans found"
              description="Create your first subscription plan to get started"
              action={{
                label: 'Add Plan',
                onClick: () => setIsCreateDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              data={plans}
              columns={planColumns}
              searchable={false}
              filterable={false}
              pagination={undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update plan information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Plan Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Pro Plan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="29.99"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Plan description..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-billing_cycle">Billing Cycle</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, billing_cycle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_storage">Max Storage (GB)</Label>
                <Input
                  id="edit-max_storage"
                  type="number"
                  value={formData.max_storage}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_storage: e.target.value }))}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max_agents">Max Agents</Label>
                <Input
                  id="edit-max_agents"
                  type="number"
                  value={formData.max_agents}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_agents: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_brands">Max Brands</Label>
                <Input
                  id="edit-max_brands"
                  type="number"
                  value={formData.max_brands}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_brands: e.target.value }))}
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_departments">Max Departments</Label>
                <Input
                  id="edit-max_departments"
                  type="number"
                  value={formData.max_departments}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_departments: e.target.value }))}
                  placeholder="5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max_ai_messages">Max AI Messages</Label>
                <Input
                  id="edit-max_ai_messages"
                  type="number"
                  value={formData.max_ai_messages}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_ai_messages: e.target.value }))}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stripe_price_id">Stripe Price ID</Label>
                <Input
                  id="edit-stripe_price_id"
                  value={formData.stripe_price_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, stripe_price_id: e.target.value }))}
                  placeholder="price_1234567890"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Plan Features</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-ai_enabled" className="text-base font-medium">AI Enabled</Label>
                    <p className="text-sm text-muted-foreground">Enable AI chatbot functionality</p>
                  </div>
                  <Switch
                    id="edit-ai_enabled"
                    checked={formData.ai_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ai_enabled: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-ai_training" className="text-base font-medium">AI Training</Label>
                    <p className="text-sm text-muted-foreground">Allow AI training with custom documents</p>
                  </div>
                  <Switch
                    id="edit-ai_training"
                    checked={formData.ai_training}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ai_training: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">AI Messages Limit</Label>
                    <p className="text-sm text-muted-foreground">Maximum AI messages allowed per billing cycle</p>
                  </div>
                  <div className="text-sm font-medium text-right">
                    {formData.max_ai_messages || 0}<br/>
                    <span className="text-xs text-muted-foreground">messages</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-custom_branding" className="text-base font-medium">Custom Branding</Label>
                    <p className="text-sm text-muted-foreground">Allow custom branding and white-labeling</p>
                  </div>
                  <Switch
                    id="edit-custom_branding"
                    checked={formData.custom_branding}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, custom_branding: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-grammar_checker" className="text-base font-medium">Grammar Checker</Label>
                    <p className="text-sm text-muted-foreground">Enable grammar checking for messages</p>
                  </div>
                  <Switch
                    id="edit-grammar_checker"
                    checked={formData.grammar_checker}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, grammar_checker: checked }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="edit-is_active">Active Plan</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlan} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, plan: null })}
        title="Delete Plan"
        description={`Are you sure you want to delete "${deleteDialog.plan?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeletePlan}
      />
    </div>
  );
}
