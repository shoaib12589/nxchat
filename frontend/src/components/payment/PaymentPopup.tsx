'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Lock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Shield,
  Star,
  Crown,
  Users,
  HardDrive,
  MessageSquare,
  Zap
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Plan } from '@/types';
import apiClient from '@/lib/api';

// Initialize Stripe
const getStripeKey = () => {
  // Try multiple ways to get the Stripe key
  const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const key = envKey || 'pk_test_51NXWwoARNYeIn6yO6kNmYK3JOhCmHPcsmCNDC4u6C1x7olE5e3q18KPoE3xpIRApldW6pg21AD6Lu3v8XkJUXnW6003yIz9LH2';
  
  // Debug logging (can be removed in production)
  // console.log('Stripe key resolution:', {
  //   envVar: envKey,
  //   resolved: key,
  //   length: key?.length,
  //   isEnvKey: !!envKey
  // });
  
  return key;
};

const stripePromise = loadStripe(getStripeKey());

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  onSuccess: () => void;
}

interface PaymentFormProps {
  plan: Plan;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ plan, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [billingInfo, setBillingInfo] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe is not loaded');
      return;
    }

    setIsProcessing(true);

    try {
      // Get card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        onError('Card element not found');
        return;
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: billingInfo.name,
          email: billingInfo.email,
          address: {
            line1: billingInfo.address,
            city: billingInfo.city,
            state: billingInfo.state,
            postal_code: billingInfo.zipCode,
            country: billingInfo.country,
          },
        },
      });

      if (pmError) {
        onError(pmError.message || 'Payment method creation failed');
        return;
      }

      // Create subscription
      const response = await apiClient.createSubscription({
        plan_id: plan.id,
        payment_method_id: paymentMethod.id
      });

      if (response.success) {
        // Confirm payment
        const { error: confirmError } = await stripe.confirmCardPayment(
          response.data.client_secret,
          {
            payment_method: paymentMethod.id,
          }
        );

        if (confirmError) {
          onError(confirmError.message || 'Payment confirmation failed');
        } else {
          onSuccess();
        }
      } else {
        onError(response.message || 'Subscription creation failed');
      }
    } catch (error: any) {
      onError(error.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
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

  const formatPrice = (price: unknown): string => {
    if (price === null || price === undefined) return 'Free';
    
    const numPrice = typeof price === 'string' ? parseFloat(price) : Number(price);
    
    if (isNaN(numPrice) || !isFinite(numPrice) || numPrice <= 0) {
      return 'Free';
    }
    
    return `$${numPrice.toFixed(2)}`;
  };

  const formatStorage = (bytes: unknown): string => {
    if (bytes === null || bytes === undefined) return 'Unlimited';
    
    const numBytes = typeof bytes === 'string' ? parseFloat(bytes) : Number(bytes);
    
    if (isNaN(numBytes) || !isFinite(numBytes) || numBytes <= 0) {
      return 'Unlimited';
    }
    
    const gb = numBytes / (1024 * 1024 * 1024);
    
    if (isNaN(gb) || !isFinite(gb)) {
      return 'Unlimited';
    }
    
    return `${Math.round(gb)}GB`;
  };

  const formatLimit = (limit: unknown): string => {
    if (limit === null || limit === undefined) return 'Unlimited';
    
    const numLimit = typeof limit === 'string' ? parseFloat(limit) : Number(limit);
    
    if (isNaN(numLimit) || !isFinite(numLimit) || numLimit <= 0) {
      return 'Unlimited';
    }
    
    return numLimit.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getPlanColor(plan.name)}`}>
              {getPlanIcon(plan.name)}
            </div>
            <div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-gray-900">
              {formatPrice(plan.price)}
            </span>
            <span className="text-gray-600 ml-2">
              / {plan.billing_cycle}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span>{formatLimit(plan.max_agents)} Agents</span>
            </div>
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-gray-500" />
              <span>{formatStorage(plan.max_storage)} Storage</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span>{formatLimit(plan.max_ai_messages)} AI Messages</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <span>{formatLimit(plan.max_departments)} Departments</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Billing Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Billing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={billingInfo.name}
              onChange={(e) => setBillingInfo({ ...billingInfo, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={billingInfo.email}
              onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Address *</Label>
          <Input
            id="address"
            value={billingInfo.address}
            onChange={(e) => setBillingInfo({ ...billingInfo, address: e.target.value })}
            placeholder="123 Main Street"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={billingInfo.city}
              onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
              placeholder="New York"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={billingInfo.state}
              onChange={(e) => setBillingInfo({ ...billingInfo, state: e.target.value })}
              placeholder="NY"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP Code *</Label>
            <Input
              id="zipCode"
              value={billingInfo.zipCode}
              onChange={(e) => setBillingInfo({ ...billingInfo, zipCode: e.target.value })}
              placeholder="10001"
              required
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Payment Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Payment Information</h3>
        <div className="space-y-2">
          <Label>Card Details *</Label>
          <div className="p-4 border rounded-lg bg-gray-50">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Lock className="w-4 h-4" />
          <span>Your payment information is secure and encrypted</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={!stripe || isProcessing}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay {formatPrice(plan.price)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const PaymentPopup: React.FC<PaymentPopupProps> = ({ isOpen, onClose, plan, onSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!plan) return null;

  // Check if Stripe is properly configured
  const stripeKey = getStripeKey();
  const isStripeConfigured = stripeKey && 
    stripeKey !== 'pk_test_your_stripe_publishable_key_here' &&
    stripeKey.length > 50; // More lenient check
  
  // Debug logging (can be removed in production)
  // console.log('Stripe configuration check:', {
  //   stripeKey: stripeKey ? `${stripeKey.substring(0, 20)}...` : 'Not found',
  //   isStripeConfigured,
  //   keyLength: stripeKey?.length,
  //   allEnvVars: Object.keys(process.env).filter(key => key.includes('STRIPE'))
  // });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-6 h-6" />
            <span>Complete Your Purchase</span>
          </DialogTitle>
          <DialogDescription>
            Enter your payment information to upgrade to the {plan.name} plan
          </DialogDescription>
        </DialogHeader>

        {!isStripeConfigured ? (
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Stripe Not Configured</h3>
            <p className="text-gray-600 mb-4">
              Please configure your Stripe publishable key in the environment variables.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        ) : success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
            <p className="text-gray-600">
              Your subscription to the {plan.name} plan has been activated.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-800 font-medium">Payment Error</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            <Elements stripe={stripePromise}>
              <PaymentForm
                plan={plan}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </Elements>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentPopup;
