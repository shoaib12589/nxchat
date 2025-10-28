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
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { Company, Plan } from '@/types';
import { toast } from 'sonner';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    company: Company | null;
  }>({ open: false, company: null });
  const [formData, setFormData] = useState({
    name: '',
    plan_id: '',
    status: 'pending',
    admin_email: '',
    admin_password: '',
    admin_name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      const response = await apiClient.getCompanies(params);
      
      if (response.success) {
        setCompanies(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || 0,
        }));
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await apiClient.getPlans();
      if (response.success) {
        setPlans(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleCreateCompany = async () => {
    try {
      setSubmitting(true);
      const response = await apiClient.createCompany({
        ...formData,
        plan_id: parseInt(formData.plan_id),
      });

      if (response.success) {
        toast.success('Company created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchCompanies();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!editingCompany) return;

    try {
      setSubmitting(true);
      const response = await apiClient.updateCompany(editingCompany.id, {
        ...formData,
        plan_id: parseInt(formData.plan_id),
      });

      if (response.success) {
        toast.success('Company updated successfully');
        setIsEditDialogOpen(false);
        setEditingCompany(null);
        resetForm();
        fetchCompanies();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteDialog.company) return;

    try {
      const response = await apiClient.deleteCompany(deleteDialog.company.id);
      
      if (response.success) {
        toast.success('Company deleted successfully');
        setDeleteDialog({ open: false, company: null });
        fetchCompanies();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete company');
    }
  };

  const handleStatusChange = async (company: Company, newStatus: string) => {
    try {
      const response = await apiClient.updateCompanyStatus(company.id, newStatus);
      
      if (response.success) {
        toast.success(`Company status updated to ${newStatus}`);
        fetchCompanies();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update company status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      plan_id: '',
      status: 'pending',
      admin_email: '',
      admin_password: '',
      admin_name: '',
    });
  };

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    // Find the company admin user
    const adminUser = company.users?.find(user => user.role === 'company_admin');
    setFormData({
      name: company.name,
      plan_id: company.plan_id?.toString() || '',
      status: company.status,
      admin_email: adminUser?.email || '',
      admin_password: '', // Don't show existing password
      admin_name: adminUser?.name || '',
    });
    setIsEditDialogOpen(true);
  };

  const companyColumns = [
    {
      key: 'name',
      title: 'Company',
      render: (value: string, company: Company) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">ID: {company.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string, company: Company) => (
        <Select
          value={value}
          onValueChange={(newStatus) => handleStatusChange(company, newStatus)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'plan',
      title: 'Plan',
      render: (value: any) => value?.name || 'No Plan',
    },
    {
      key: 'created_at',
      title: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, company: Company) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(company)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteDialog({ open: true, company })}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading && companies.length === 0) {
    return <LoadingSpinner text="Loading companies..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage all companies on the platform
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Add a new company to the platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin_name">Admin Name</Label>
                <Input
                  id="admin_name"
                  value={formData.admin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                  placeholder="Enter admin full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={formData.admin_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                  placeholder="Enter admin email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="admin_password">Admin Password</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                  placeholder="Enter admin password"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={formData.plan_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, plan_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id.toString()}>
                        {plan.name} - ${plan.price}/{plan.billing_cycle}
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
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCompany} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Company'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies ({pagination.total})</CardTitle>
          <CardDescription>
            Manage all companies and their settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies found"
              description="No companies match your current filters"
              action={{
                label: 'Add Company',
                onClick: () => setIsCreateDialogOpen(true),
              }}
            />
          ) : (
            <DataTable
              data={companies}
              columns={companyColumns}
              searchable={false}
              filterable={false}
              pagination={{
                ...pagination,
                onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
                onLimitChange: (limit) => setPagination(prev => ({ ...prev, limit, page: 1 })),
              }}
              loading={loading}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-admin-name">Admin Name</Label>
              <Input
                id="edit-admin-name"
                value={formData.admin_name}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                placeholder="Enter admin full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-admin-email">Admin Email</Label>
              <Input
                id="edit-admin-email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                placeholder="Enter admin email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-admin-password">Admin Password</Label>
              <Input
                id="edit-admin-password"
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                placeholder="Enter new password (leave blank to keep current)"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep current password, or enter new password (minimum 8 characters)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">Plan</Label>
              <Select
                value={formData.plan_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, plan_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - ${plan.price}/{plan.billing_cycle}
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCompany} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Company'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, company: null })}
        title="Delete Company"
        description={`Are you sure you want to delete "${deleteDialog.company?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteCompany}
      />
    </div>
  );
}
