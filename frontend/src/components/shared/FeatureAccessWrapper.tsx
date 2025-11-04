'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface FeatureAccessWrapperProps {
  feature: string;
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  upgradeMessage?: string;
}

export const FeatureAccessWrapper: React.FC<FeatureAccessWrapperProps> = ({
  feature,
  children,
  fallbackTitle = 'Feature Not Available',
  fallbackDescription = 'This feature is not included in your current plan.',
  upgradeMessage = 'Upgrade your plan to access this feature.'
}) => {
  const { hasAccess, loading } = useFeatureAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Type-safe feature access check
  // hasAccess expects a key of FeatureAccess interface
  type FeatureAccessKey = 'ai_enabled' | 'ai_training' | 'ai_messages_limit' | 'custom_branding' | 'grammar_checker';
  const featureKey = feature as FeatureAccessKey;
  if (!hasAccess(featureKey)) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              {fallbackTitle}
            </CardTitle>
            <CardDescription>
              {fallbackDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Badge variant="outline" className="text-sm">
              Premium Feature
            </Badge>
            <p className="text-sm text-muted-foreground">
              {upgradeMessage}
            </p>
            <Link href="/superadmin/plans">
              <Button className="w-full">
                <ArrowUp className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
