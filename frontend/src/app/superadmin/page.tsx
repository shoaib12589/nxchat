'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatsCard } from '@/components/shared/StatsCard';
import { DataTable } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  MessageSquare, 
  DollarSign, 
  TrendingUp,
  Plus,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { Company, DashboardStats } from '@/types';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, companiesResponse] = await Promise.all([
        apiClient.getSuperAdminDashboard(),
        apiClient.getCompanies({ page: 1, limit: 5 })
      ]);

      if (dashboardResponse.success) {
        setStats(dashboardResponse.data);
      }

      if (companiesResponse.success) {
        setRecentCompanies(companiesResponse.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
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
            <div className="text-sm text-muted-foreground">{company.subdomain}.nxchat.com</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge 
          variant={value === 'active' ? 'default' : value === 'pending' ? 'secondary' : 'destructive'}
        >
          {value}
        </Badge>
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
          <Link href={`/superadmin/companies/${company.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Failed to load dashboard"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchDashboardData,
        }}
      />
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[#EEF4ED] -z-10" />
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between backdrop-blur-xl bg-white/50 dark:bg-gray-900/50 rounded-2xl p-6 border border-white/20 shadow-lg"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of your NxChat platform
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/superadmin/companies">
            <Button variant="outline" className="backdrop-blur-sm bg-white/70 dark:bg-gray-800/70 border-white/20 hover:bg-white/90">
              <Eye className="w-4 h-4 mr-2" />
              View All Companies
            </Button>
          </Link>
          <Link href="/superadmin/companies/new">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Companies"
          value={stats?.totalCompanies || 0}
          icon={Building2}
          trend={{
            value: 12,
            label: 'from last month',
            isPositive: true,
          }}
          delay={0}
        />
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          trend={{
            value: 8,
            label: 'from last month',
            isPositive: true,
          }}
          delay={0.1}
        />
        <StatsCard
          title="Active Chats"
          value={stats?.activeChats || 0}
          icon={MessageSquare}
          trend={{
            value: -3,
            label: 'from last hour',
            isPositive: false,
          }}
          delay={0.2}
        />
        <StatsCard
          title="Total Messages"
          value={stats?.totalMessages || 0}
          icon={TrendingUp}
          trend={{
            value: 15,
            label: 'from last month',
            isPositive: true,
          }}
          delay={0.3}
        />
      </div>

      {/* Recent Companies */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-2xl">Recent Companies</CardTitle>
            <CardDescription>
              Latest companies that have joined the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCompanies.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No companies yet"
                description="Companies will appear here once they register"
                action={{
                  label: 'Add Company',
                  onClick: () => router.push('/superadmin/companies/new'),
                }}
              />
            ) : (
              <DataTable
                data={recentCompanies}
                columns={companyColumns}
                searchable={false}
                filterable={false}
                pagination={undefined}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Building2 className="w-5 h-5 text-blue-600" />
                </motion.div>
                <span>Manage Companies</span>
              </CardTitle>
              <CardDescription>
                View and manage all companies on the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Link href="/superadmin/companies">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Eye className="w-4 h-4 mr-2" />
                  View Companies
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <DollarSign className="w-5 h-5 text-green-600" />
                </motion.div>
                <span>Subscription Plans</span>
              </CardTitle>
              <CardDescription>
                Manage subscription plans and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Link href="/superadmin/plans">
                <Button className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Eye className="w-4 h-4 mr-2" />
                  Manage Plans
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ scale: 1.01 }}
        >
          <Card className="backdrop-blur-xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-700/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 group overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </motion.div>
                <span>Analytics</span>
              </CardTitle>
              <CardDescription>
                View detailed analytics and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Link href="/superadmin/analytics">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300">
                  <Eye className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
