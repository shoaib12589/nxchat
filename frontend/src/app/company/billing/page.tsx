'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { 
  Crown, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Users, 
  HardDrive, 
  MessageSquare, 
  Zap,
  ArrowUpRight,
  Star,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { Plan } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import PaymentPopup from '@/components/payment/PaymentPopup';

interface BillingPageProps {}

export default function BillingPage({}: BillingPageProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<number | null>(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const plansResponse = await apiClient.getCompanyPlans();
      if (plansResponse.success) {
        setPlans(plansResponse.data || []);
      } else {
        setError(plansResponse.message || 'Failed to fetch plans');
        return;
      }

      // Try to fetch current company info
      try {
        const companyResponse = await apiClient.getCompanyInfo();
        if (companyResponse.success && companyResponse.data?.plan) {
          setCurrentPlan(companyResponse.data.plan);
        }
      } catch (companyError) {
        console.warn('Could not fetch current plan:', companyError);
      }
    } catch (error: any) {
      console.error('Billing page error:', error);
      setError(error.message || 'Failed to fetch billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    // Check if it's a free plan
    const price = typeof plan.price === 'string' ? parseFloat(plan.price) : Number(plan.price);
    if (isNaN(price) || price <= 0) {
      // Free plan - upgrade directly
      try {
        setUpgrading(plan.id);
        const response = await apiClient.updateCompanyPlan(plan.id);
        
        if (response.success) {
          await fetchPlans();
          alert('Plan upgraded successfully!');
        } else {
          throw new Error(response.message || 'Failed to upgrade plan');
        }
      } catch (error: any) {
        console.error('Upgrade error:', error);
        alert(error.message || 'Failed to upgrade plan');
      } finally {
        setUpgrading(null);
      }
    } else {
      // Paid plan - show payment popup
      setSelectedPlan(plan);
      setShowPaymentPopup(true);
    }
  };

  const handlePaymentSuccess = async () => {
    // Refresh plans and current plan after successful payment
    await fetchPlans();
    setShowPaymentPopup(false);
    setSelectedPlan(null);
  };

  // Safe formatting functions with proper type checking
  const formatPrice = (price: unknown): string => {
    try {
      if (price === null || price === undefined) return 'Free';
      
      // Convert to number safely
      let numPrice: number;
      if (typeof price === 'string') {
        numPrice = parseFloat(price);
      } else if (typeof price === 'number') {
        numPrice = price;
      } else {
        return 'Free';
      }
      
      // Check if it's a valid number
      if (isNaN(numPrice) || !isFinite(numPrice) || numPrice <= 0) {
        return 'Free';
      }
      
      // Ensure it's a number before calling toFixed
      if (typeof numPrice !== 'number') {
        return 'Free';
      }
      
      // Final safety check before toFixed
      if (typeof numPrice.toFixed !== 'function') {
        return 'Free';
      }
      
      return `$${numPrice.toFixed(2)}`;
    } catch (error) {
      return 'Free';
    }
  };

  const formatStorage = (bytes: unknown): string => {
    try {
      if (bytes === null || bytes === undefined) return 'Unlimited';
      
      // Convert to number safely
      let numBytes: number;
      if (typeof bytes === 'string') {
        numBytes = parseFloat(bytes);
      } else if (typeof bytes === 'number') {
        numBytes = bytes;
      } else {
        return 'Unlimited';
      }
      
      // Check if it's a valid number
      if (isNaN(numBytes) || !isFinite(numBytes) || numBytes <= 0) {
        return 'Unlimited';
      }
      
      const gb = numBytes / (1024 * 1024 * 1024);
      
      // Check if gb is a valid number
      if (isNaN(gb) || !isFinite(gb)) {
        return 'Unlimited';
      }
      
      // Ensure Math.round is available and gb is a number
      if (typeof Math.round !== 'function' || typeof gb !== 'number') {
        return 'Unlimited';
      }
      
      return `${Math.round(gb)}GB`;
    } catch (error) {
      return 'Unlimited';
    }
  };

  const formatLimit = (limit: unknown): string => {
    try {
      if (limit === null || limit === undefined) return 'Unlimited';
      
      // Convert to number safely
      let numLimit: number;
      if (typeof limit === 'string') {
        numLimit = parseFloat(limit);
      } else if (typeof limit === 'number') {
        numLimit = limit;
      } else {
        return 'Unlimited';
      }
      
      // Check if it's a valid number
      if (isNaN(numLimit) || !isFinite(numLimit) || numLimit <= 0) {
        return 'Unlimited';
      }
      
      // Ensure it's a number before calling toLocaleString
      if (typeof numLimit !== 'number') {
        return 'Unlimited';
      }
      
      // Final safety check before toLocaleString
      if (typeof numLimit.toLocaleString !== 'function') {
        return 'Unlimited';
      }
      
      return numLimit.toLocaleString();
    } catch (error) {
      return 'Unlimited';
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return <Shield className="w-6 h-6" />;
      case 'starter':
        return <Star className="w-6 h-6" />;
      case 'pro':
        return <Crown className="w-6 h-6" />;
      case 'enterprise':
        return <Crown className="w-6 h-6" />;
      default:
        return <Crown className="w-6 h-6" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return 'bg-gray-100 text-gray-600';
      case 'starter':
        return 'bg-blue-100 text-blue-600';
      case 'pro':
        return 'bg-purple-100 text-purple-600';
      case 'enterprise':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getPlanBadgeVariant = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return 'secondary' as const;
      case 'starter':
        return 'default' as const;
      case 'pro':
        return 'default' as const;
      case 'enterprise':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon={XCircle}
          title="Error Loading Plans"
          description={error}
          action={{
            label: 'Try Again',
            onClick: fetchPlans,
          }}
        />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <EmptyState
          icon={CreditCard}
          title="No Plans Available"
          description="There are no subscription plans available at the moment."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your business needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Current Plan Status */}
        {currentPlan && (
          <div className="mb-8">
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getPlanColor(currentPlan.name)}`}>
                      {getPlanIcon(currentPlan.name)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Current Plan: {currentPlan.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatPrice(currentPlan.price)} / {currentPlan.billing_cycle}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getPlanBadgeVariant(currentPlan.name)}>
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const isCurrentPlan = currentPlan?.id === plan.id;
            const isPopular = plan.name.toLowerCase() === 'pro';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative ${isPopular ? 'lg:scale-105' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <Card className={`h-full ${isPopular ? 'border-purple-200 shadow-lg' : ''}`}>
                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center ${getPlanColor(plan.name)}`}>
                      {getPlanIcon(plan.name)}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {plan.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-600 ml-2">
                        / {plan.billing_cycle}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Features */}
                    <div className="space-y-4 mb-6">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {formatLimit(plan.max_agents)} Agents
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {formatStorage(plan.max_storage)} Storage
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {formatLimit(plan.max_ai_messages)} AI Messages
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Zap className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">
                            {formatLimit(plan.max_departments)} Departments
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="text-center">
                      {isCurrentPlan ? (
                        <Button disabled className="w-full">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan)}
                          disabled={upgrading === plan.id}
                          className={`w-full ${
                            isPopular ? 'bg-purple-600 hover:bg-purple-700' : ''
                          }`}
                        >
                          {upgrading === plan.id ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-4 h-4 mr-2" />
                              {formatPrice(plan.price) === 'Free' ? 'Select Plan' : 'Upgrade Now'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Additional Information */}
        <div className="mt-16 text-center">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Why Choose Our Plans?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Secure & Reliable
                  </h4>
                  <p className="text-gray-600">
                    Enterprise-grade security with 99.9% uptime guarantee
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Easy to Use
                  </h4>
                  <p className="text-gray-600">
                    Intuitive interface that your team will love
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Great Value
                  </h4>
                  <p className="text-gray-600">
                    Competitive pricing with no hidden fees
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Popup */}
      <PaymentPopup
        isOpen={showPaymentPopup}
        onClose={() => {
          setShowPaymentPopup(false);
          setSelectedPlan(null);
        }}
        plan={selectedPlan}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
