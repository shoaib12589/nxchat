'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UpgradePlanMessageProps {
  featureName: string;
  className?: string;
}

export const UpgradePlanMessage: React.FC<UpgradePlanMessageProps> = ({ 
  featureName, 
  className = '' 
}) => {
  const router = useRouter();

  const handleUpgrade = () => {
    router.push('/company/billing');
  };

  return (
    <Alert className={`border-yellow-200 bg-yellow-50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Upgrade Plan Required</AlertTitle>
      <AlertDescription className="text-yellow-700 mt-2">
        <p className="mb-3">
          The <strong>{featureName}</strong> feature is not available in your current plan.
        </p>
        <Button
          onClick={handleUpgrade}
          variant="outline"
          size="sm"
          className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
        >
          Upgrade Plan
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};
