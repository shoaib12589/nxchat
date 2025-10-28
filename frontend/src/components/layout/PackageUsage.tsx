'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Users, 
  HardDrive, 
  MessageSquare, 
  Zap,
  ArrowUpRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import apiClient from '@/lib/api';
import { Plan } from '@/types';

interface UsageStats {
  agents_used: number;
  agents_limit: number;
  storage_used: number;
  storage_limit: number;
  ai_messages_used: number;
  ai_messages_limit: number;
  departments_used: number;
  departments_limit: number;
}

interface PackageUsageProps {
  className?: string;
}

export const PackageUsage: React.FC<PackageUsageProps> = ({ className }) => {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackageInfo = async () => {
      try {
        setLoading(true);
        
        // Fetch company info with plan details
        const companyResponse = await apiClient.getCompanyInfo();
        if (companyResponse.success && companyResponse.data) {
          setPlan(companyResponse.data.plan);
        }

        // Fetch usage statistics
        const usageResponse = await apiClient.getUsageStats();
        if (usageResponse.success && usageResponse.data) {
          setUsageStats(usageResponse.data);
        }
      } catch (error) {
        console.error('Failed to fetch package info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackageInfo();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-2 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan || !usageStats) {
    return null;
  }

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const isNearLimit = (used: number, limit: number) => {
    if (limit === -1) return false; // Unlimited
    return (used / limit) >= 0.8;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num === -1) return 'Unlimited';
    return num.toLocaleString();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            {plan.name} Plan
          </CardTitle>
          <Badge variant={plan.name === 'Free' ? 'secondary' : 'default'}>
            {plan.name}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Agents Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>Agents</span>
            </div>
            <span className="text-muted-foreground">
              {usageStats.agents_used} / {formatNumber(usageStats.agents_limit)}
            </span>
          </div>
          <Progress 
            value={getUsagePercentage(usageStats.agents_used, usageStats.agents_limit)} 
            className="h-2"
          />
          {isNearLimit(usageStats.agents_used, usageStats.agents_limit) && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Near limit
            </p>
          )}
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              <span>Storage</span>
            </div>
            <span className="text-muted-foreground">
              {formatBytes(usageStats.storage_used)} / {formatBytes(usageStats.storage_limit)}
            </span>
          </div>
          <Progress 
            value={getUsagePercentage(usageStats.storage_used, usageStats.storage_limit)} 
            className="h-2"
          />
          {isNearLimit(usageStats.storage_used, usageStats.storage_limit) && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Near limit
            </p>
          )}
        </div>

        {/* AI Messages Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>AI Messages</span>
            </div>
            <span className="text-muted-foreground">
              {usageStats.ai_messages_used.toLocaleString()} / {formatNumber(usageStats.ai_messages_limit)}
            </span>
          </div>
          <Progress 
            value={getUsagePercentage(usageStats.ai_messages_used, usageStats.ai_messages_limit)} 
            className="h-2"
          />
          {isNearLimit(usageStats.ai_messages_used, usageStats.ai_messages_limit) && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Near limit
            </p>
          )}
        </div>

        {/* Departments Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>Departments</span>
            </div>
            <span className="text-muted-foreground">
              {usageStats.departments_used} / {formatNumber(usageStats.departments_limit)}
            </span>
          </div>
          <Progress 
            value={getUsagePercentage(usageStats.departments_used, usageStats.departments_limit)} 
            className="h-2"
          />
          {isNearLimit(usageStats.departments_used, usageStats.departments_limit) && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Near limit
            </p>
          )}
        </div>

        <Separator />

        {/* Plan Features */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Plan Features</h4>
          <div className="space-y-1">
            {plan.features && typeof plan.features === 'object' ? (
              Object.entries(plan.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center gap-2 text-xs">
                  {enabled ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="capitalize">
                    {feature.replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No features listed</p>
            )}
          </div>
        </div>

        {/* Upgrade Button */}
        {plan.name === 'Free' && (
          <>
            <Separator />
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => {
                // Navigate to billing page using client-side routing
                router.push('/company/billing');
              }}
            >
              <Crown className="h-3 w-3 mr-2" />
              Upgrade Plan
              <ArrowUpRight className="h-3 w-3 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
