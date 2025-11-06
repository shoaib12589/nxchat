'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { PackageUsage } from './PackageUsage';
import apiClient from '@/lib/api';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  Ticket,
  Settings,
  BarChart3,
  CreditCard,
  Zap,
  ChevronRight,
  Tag,
  History,
  Brain,
  Mail,
  ChevronDown,
  FileText,
  ShieldOff
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  features?: string[]; // Required features for this item
}

const emailTemplateSubmenu: NavItem[] = [
  {
    title: 'All Templates',
    href: '/superadmin/email-templates',
    icon: FileText,
    roles: ['super_admin'],
  },
  {
    title: 'Verification',
    href: '/superadmin/email-templates?type=verification',
    icon: Mail,
    roles: ['super_admin'],
  },
  {
    title: 'Password Reset',
    href: '/superadmin/email-templates?type=password_reset',
    icon: Mail,
    roles: ['super_admin'],
  },
  {
    title: 'Welcome',
    href: '/superadmin/email-templates?type=welcome',
    icon: Mail,
    roles: ['super_admin'],
  },
  {
    title: 'Agent Invitation',
    href: '/superadmin/email-templates?type=agent_invitation',
    icon: Mail,
    roles: ['super_admin'],
  },
  {
    title: 'Notifications',
    href: '/superadmin/email-templates?type=notification',
    icon: Mail,
    roles: ['super_admin'],
  },
  {
    title: 'Chat Assignment',
    href: '/superadmin/email-templates?type=chat_assignment',
    icon: Mail,
    roles: ['super_admin'],
  },
  {
    title: 'Custom Templates',
    href: '/superadmin/email-templates?type=custom',
    icon: Mail,
    roles: ['super_admin'],
  },
];

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/superadmin',
    icon: LayoutDashboard,
    roles: ['super_admin'],
  },
  {
    title: 'Dashboard',
    href: '/company',
    icon: LayoutDashboard,
    roles: ['company_admin'],
  },
  {
    title: 'Dashboard',
    href: '/agent',
    icon: LayoutDashboard,
    roles: ['agent'],
  },
  {
    title: 'Companies',
    href: '/superadmin/companies',
    icon: Building2,
    roles: ['super_admin'],
  },
  {
    title: 'Plans',
    href: '/superadmin/plans',
    icon: CreditCard,
    roles: ['super_admin'],
  },
  {
    title: 'Analytics',
    href: '/superadmin/analytics',
    icon: BarChart3,
    roles: ['super_admin'],
  },
  {
    title: 'Email Templates',
    href: '/superadmin/email-templates',
    icon: Mail,
    roles: ['super_admin'],
  },
  {
    title: 'System Settings',
    href: '/superadmin/settings',
    icon: Settings,
    roles: ['super_admin'],
  },
  {
    title: 'Agents',
    href: '/company/agents',
    icon: Users,
    roles: ['company_admin'],
  },
  {
    title: 'Departments',
    href: '/company/departments',
    icon: Building2,
    roles: ['company_admin'],
  },
  {
    title: 'Brands',
    href: '/company/brands',
    icon: Tag,
    roles: ['company_admin'],
  },
  {
    title: 'AI Training',
    href: '/company/ai-training',
    icon: Brain,
    roles: ['company_admin'],
    features: ['ai_enabled'], // Only show if AI is enabled
  },
  {
    title: 'Company Analytics',
    href: '/company/analytics',
    icon: BarChart3,
    roles: ['company_admin'],
    features: ['analytics'],
  },
  {
    title: 'Home',
    href: '/agent',
    icon: LayoutDashboard,
    roles: ['agent'],
  },
  {
    title: 'Visitors',
    href: '/agent/visitors',
    icon: Users,
    roles: ['agent'],
  },
  {
    title: 'History',
    href: '/agent/history',
    icon: History,
    roles: ['agent'],
  },
  {
    title: 'Banned Visitors',
    href: '/agent/banned-visitors',
    icon: ShieldOff,
    roles: ['agent'],
  },
  {
    title: 'Tickets',
    href: '/agent/tickets',
    icon: Ticket,
    roles: ['agent'],
  },
  {
    title: 'Triggers',
    href: '/agent/triggers',
    icon: Zap,
    roles: ['agent'],
  },
  {
    title: 'Agent Settings',
    href: '/agent/settings',
    icon: Settings,
    roles: ['agent'],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { hasAccess, loading: featureLoading } = useFeatureAccess();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Email Templates']); // Default to expanded

  if (!user) {
    return null;
  }

  // Filter navigation items based on user role and feature access
  const filteredItems = navigationItems.filter(item => {
    // Check role access
    if (!item.roles.includes(user.role)) {
      return false;
    }
    
    // Check feature access for company_admin
    if (user.role === 'company_admin' && item.features) {
      return item.features.some(feature => hasAccess(feature as any));
    }
    
    return true;
  });

  // Group items by role for better organization
  const getRoleBasedItems = () => {
    switch (user.role) {
      case 'super_admin':
        return [
          { title: 'Overview', items: filteredItems.filter(item => 
            ['Dashboard', 'Companies', 'Plans'].includes(item.title)
          )},
          { title: 'Communication', items: filteredItems.filter(item => 
            ['Email Templates'].includes(item.title)
          )},
          { title: 'Analytics & Settings', items: filteredItems.filter(item => 
            ['Analytics', 'System Settings'].includes(item.title)
          )},
        ];
      case 'company_admin':
        return [
          { title: 'Overview', items: filteredItems.filter(item => 
            ['Dashboard'].includes(item.title)
          )},
          { title: 'Team Management', items: filteredItems.filter(item => 
            ['Agents', 'Departments', 'Brands'].includes(item.title)
          )},
          { title: 'Configuration', items: filteredItems.filter(item => 
            ['AI Training'].includes(item.title)
          )},
          { title: 'Analytics', items: filteredItems.filter(item => 
            ['Company Analytics'].includes(item.title)
          )},
        ];
      case 'agent':
        return [
          { title: 'Work', items: filteredItems.filter(item => 
            ['Home', 'Chats', 'Visitors', 'History', 'Banned Visitors', 'Tickets', 'Triggers'].includes(item.title)
          )},
          { title: 'Settings', items: filteredItems.filter(item => 
            ['Agent Settings'].includes(item.title)
          )},
        ];
      default:
        return [{ title: 'Navigation', items: filteredItems }];
    }
  };

  const roleBasedItems = getRoleBasedItems();

  // Fetch app logo from system settings
  useEffect(() => {
    const fetchAppLogo = async () => {
      try {
        const response = await apiClient.getSystemSettings();
        if (response.success && response.data?.app_logo) {
          setAppLogo(response.data.app_logo);
        }
      } catch (error: any) {
        // Silently fail if:
        // 1. Backend is offline (network error)
        // 2. User is not authenticated (401 unauthorized)
        // 3. User doesn't have permission (403 forbidden)
        // These are expected behaviors and shouldn't be logged
        const isExpectedError = 
          error.code === 'ERR_NETWORK' || 
          error.message === 'Network Error' ||
          error.response?.status === 401 ||
          error.response?.status === 403;
        
        if (!isExpectedError) {
          console.error('Failed to fetch app logo:', error);
        }
      }
    };
    fetchAppLogo();
  }, []);

  // Show loading state while checking feature access
  if (featureLoading && user.role === 'company_admin') {
    return (
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:bg-[#0B2545] lg:border-r lg:border-[#13315C]/30">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-[#EEF4ED]/60">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-[#0B2545]">
      {/* Logo Section */}
      <div className="px-8 pt-8 pb-12">
        <div className="flex items-center gap-3">
          {appLogo ? (
            <>
              <img
                src={appLogo}
                alt="App Logo"
                className="h-8 w-auto object-contain max-w-[200px]"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="flex items-center gap-3 hidden">
                <MessageSquare className="w-8 h-8 text-white" />
                <span className="text-2xl font-bold text-white">NxChat</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-white" />
              <span className="text-2xl font-bold text-white">NxChat</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar px-4">
        <nav className="space-y-1">
          {/* Agent Status Indicator - Only show for agents */}
          {user.role === 'agent' && (
            <div className="mb-6 px-3">
              <AgentStatusIndicator />
            </div>
          )}
          
          {/* Navigation Items */}
          {roleBasedItems
            .filter(group => group.items.length > 0)
            .map((group) => (
              <div key={group.title} className="mb-6">
                {group.items.map((item) => {
                      // Check if this is Email Templates with submenu
                      const isEmailTemplates = item.title === 'Email Templates';
                      const submenuItems = isEmailTemplates ? emailTemplateSubmenu : [];
                      const isExpanded = expandedMenus.includes(item.title);
                      const type = searchParams?.get('type');
                      
                      // For dashboard/home pages, only match exact path
                      // For other pages, match exact path or sub-paths
                      const isDashboardRoute = item.href === '/company' || item.href === '/agent' || item.href === '/superadmin';
                      const isActive = pathname === item.href || 
                        (!isDashboardRoute && pathname.startsWith(item.href));
                      
                      return (
                        <div key={item.href}>
                          <Link href={item.href} prefetch={true}>
                            <Button
                              variant={isActive ? 'secondary' : 'ghost'}
                              className={cn(
                                "w-full justify-between items-center text-left rounded-xl transition-all duration-200 h-10 relative",
                                isActive 
                                  ? "bg-[#1e4a73] text-white hover:bg-[#1e4a73]/90 shadow-xl"
                                  : "text-[#EEF4ED]/80 hover:bg-[#13315C]/30 hover:text-[#EEF4ED]"
                              )}
                              onClick={(e) => {
                                  if (submenuItems.length > 0) {
                                    e.preventDefault();
                                    setExpandedMenus(prev => 
                                      prev.includes(item.title)
                                        ? prev.filter(m => m !== item.title)
                                        : [...prev, item.title]
                                    );
                                  }
                                }}
                              >
                                <div className="flex items-center flex-1 gap-3">
                                  <item.icon className={cn(
                                    "h-5 w-5 flex-shrink-0 transition-colors",
                                    isActive ? "text-white" : "text-[#EEF4ED]/70"
                                  )} />
                                  <span className="flex-1 font-medium text-sm">{item.title}</span>
                                </div>
                                {submenuItems.length > 0 ? (
                                  <ChevronDown className={cn(
                                    "h-4 w-4 transition-all duration-200",
                                    isActive ? "text-white" : "text-[#EEF4ED]/60",
                                    isExpanded && "rotate-180"
                                  )} />
                                ) : isActive && (
                                  <ChevronRight className="h-4 w-4 ml-auto text-white" />
                                )}
                            </Button>
                          </Link>
                            
                          {/* Render submenu items if expanded */}
                          {isEmailTemplates && isExpanded && submenuItems.length > 0 && (
                            <div className="ml-4 mt-1 space-y-0.5 pt-2">
                                {submenuItems.map((subItem) => {
                                  const subIsActive = pathname === subItem.href.split('?')[0] && 
                                    (subItem.href.includes('type=') ? searchParams?.get('type') === subItem.href.split('type=')[1] : !type);
                                  
                                  return (
                                    <Link key={subItem.href} href={subItem.href}>
                                      <div
                                        className={cn(
                                          "flex items-center pl-8 py-2 text-sm rounded transition-all duration-200 relative cursor-pointer",
                                          subIsActive 
                                            ? "text-white" 
                                            : "text-[#EEF4ED]/70 hover:text-[#EEF4ED] hover:bg-[#13315C]/20"
                                        )}
                                      >
                                        {subIsActive && (
                                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#EEF4ED] rounded-r-full" />
                                        )}
                                        <span>{subItem.title}</span>
                                      </div>
                                    </Link>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
              </div>
            ))}
        </nav>

        {/* Package Usage - Only show for company_admin */}
        {user.role === 'company_admin' && (
          <div className="mt-6 mb-6">
            <PackageUsage />
          </div>
        )}
      </div>

      {/* User Info Footer - Fixed at bottom */}
      <div className="p-4 border-t border-[#13315C]/30 bg-[#0B2545] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#13315C] to-[#0B2545] flex items-center justify-center border-2 border-[#EEF4ED]/20 flex-shrink-0">
            <span className="text-white font-semibold text-sm">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {user.name}
            </p>
            <p className="text-xs text-[#EEF4ED]/60 truncate leading-tight">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
