'use client';

import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';

interface FeatureAccess {
  ai_chat: boolean;
  audio_calls: boolean;
  video_calls: boolean;
  analytics: boolean;
  ai_training: boolean;
  file_sharing: boolean;
  screen_sharing: boolean;
  live_chat: boolean;
  email_support: boolean;
  phone_support: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  api_access: boolean;
  webhooks: boolean;
  integrations: boolean;
  advanced_analytics: boolean;
  user_management: boolean;
  role_based_access: boolean;
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
            ai_chat: plan.ai_enabled || false,
            audio_calls: plan.allows_calls || false,
            video_calls: features.video_calls || false,
            analytics: plan.analytics_enabled || false,
            ai_training: features.ai_training || plan.ai_enabled || false,
            file_sharing: features.file_sharing || false,
            screen_sharing: features.screen_sharing || false,
            live_chat: features.live_chat || true, // Basic feature
            email_support: features.email_support || true, // Basic feature
            phone_support: features.phone_support || false,
            priority_support: features.priority_support || false,
            custom_branding: features.custom_branding || false,
            api_access: features.api_access || false,
            webhooks: features.webhooks || false,
            integrations: features.integrations || false,
            advanced_analytics: features.advanced_analytics || false,
            user_management: features.user_management || true, // Basic feature
            role_based_access: features.role_based_access || false,
          });
        } else {
          throw new Error('No plan data available');
        }
      } catch (error) {
        console.error('Failed to fetch feature access:', error);
        // Set default access for Free plan (most restrictive)
        setFeatureAccess({
          ai_chat: false,
          audio_calls: false,
          video_calls: false,
          analytics: false,
          ai_training: false,
          file_sharing: false,
          screen_sharing: false,
          live_chat: true,
          email_support: true,
          phone_support: false,
          priority_support: false,
          custom_branding: false,
          api_access: false,
          webhooks: false,
          integrations: false,
          advanced_analytics: false,
          user_management: true,
          role_based_access: false,
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
