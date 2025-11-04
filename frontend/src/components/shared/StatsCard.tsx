'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
  delay?: number;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}) => {
  return (
    <Card className={cn(
      'bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200',
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={trend.isPositive ? 'default' : 'secondary'}
                  className="text-xs h-5 px-2"
                >
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </Badge>
                <span className="text-xs text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 ml-3">
              <Icon className="w-5 h-5 text-gray-700" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
