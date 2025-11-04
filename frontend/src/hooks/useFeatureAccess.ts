'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';

interface FeatureAccess {
  ai_enabled: boolean;
  ai_training: boolean;
  ai_messages_limit: number;
  custom_branding: boolean;
  grammar_checker: boolean;
}

export const useFeatureAccess = () => {
  const { user } = useAuthStore();
  const [featureAccess, setFeatureAccess] = useState<FeatureAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatureAccess = async () => {
      if (!user || user.role !== 'company_admin') {
        setFeatureAccess(null);
        setLoading(false);
        return;
      }

      try {
        // Try to get company info, fallback to default if it fails
        const response = await apiClient.getCompanyInfo();
        if (response.success && response.data?.plan) {
          const plan = response.data.plan;
          const features = plan.features as Record<string, boolean> || {};
          
          setFeatureAccess({
            ai_enabled: plan.ai_enabled || false,
            ai_training: features.ai_training || false,
            ai_messages_limit: plan.max_ai_messages || 0,
            custom_branding: features.custom_branding || false,
            grammar_checker: features.grammar_checker || false,
          });
        } else {
          throw new Error('No plan data available');
        }
      } catch (error) {
        console.error('Failed to fetch feature access:', error);
        // Set default access for Free plan (most restrictive)
        setFeatureAccess({
          ai_enabled: false,
          ai_training: false,
          ai_messages_limit: 0,
          custom_branding: false,
          grammar_checker: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFeatureAccess();
  }, [user]);

  const hasAccess = (feature: keyof FeatureAccess): boolean => {
    if (!featureAccess) return false;
    return featureAccess[feature];
  };

  const hasAnyAccess = (features: (keyof FeatureAccess)[]): boolean => {
    if (!featureAccess) return false;
    return features.some(feature => featureAccess[feature]);
  };

  return {
    featureAccess,
    loading,
    hasAccess,
    hasAnyAccess,
  };
};
