'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Save, 
  RotateCcw,
  Mail,
  Shield,
  Database,
  CreditCard,
  Bot,
  Loader2,
  CheckCircle,
  AlertCircle,
  Monitor,
  Server,
  Activity,
  FileText,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Image,
  X,
  HardDrive,
  Network
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { SystemSetting } from '@/types';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

interface SettingsData {
  [key: string]: string;
}

interface RedisConfig {
  host: string;
  port: string;
  password: string;
  db: string;
  enabled: boolean;
  url: string;
  cloudProvider: string;
  connectionType: 'self-hosted' | 'cloud';
}

interface SystemStatus {
  timestamp: string;
  responseTime: string;
  overall: 'healthy' | 'warning' | 'error';
  database: {
    status: string;
    responseTime: string;
    connectionPool: {
      total: number;
      used: number;
      waiting: number;
      idle: number;
    };
    dialect: string;
    version: string;
  };
  redis: {
    status: string;
    responseTime: string;
    memory: {
      used: string;
      peak: string;
      max: string;
    };
    databaseSize: number;
    connectedClients: number;
  };
  server: {
    status: string;
    uptime: string;
    uptimeSeconds: number;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
      arrayBuffers: string;
    };
    nodeVersion: string;
    platform: string;
    pid: number;
    cpuUsage: {
      percent: number;
      user: number;
      system: number;
    };
  };
  system: {
    memory: {
      total: string;
      totalBytes?: number;
      free: string;
      freeBytes?: number;
      used: string;
      usedBytes?: number;
      usagePercent: number;
      available?: string;
    };
    cpu: {
      cores: number;
      model: string;
      speed: string;
      speedMHz?: number;
      loadAverage: number[];
      usagePercent?: number;
      details?: Array<{
        core: number;
        usage: number;
        model: string;
        speed: number;
      }>;
    };
    disk?: {
      total: string;
      used: string;
      free: string;
      usagePercent: number;
      path: string;
      filesystem?: string;
    };
    network?: {
      interfaces: Array<{
        name: string;
        address: string;
        netmask: string;
        mac: string;
        family: string;
      }>;
      hostname: string;
      primary: {
        name: string;
        address: string;
        netmask: string;
        mac: string;
        family: string;
      } | null;
    };
    os: {
      platform: string;
      release: string;
      arch: string;
      hostname: string;
      type?: string;
      version?: string;
    };
    uptime: string;
    uptimeSeconds?: number;
  };
  services: {
    mysql: { status: string; port: number };
    redis: { status: string; port: number };
    nodejs: { status: string; pid: number; version: string };
  };
  logs: Array<{
    name: string;
    size: string;
    modified: string;
    path: string;
  }>;
}

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logLoading, setLogLoading] = useState(false);
  const [redisConfig, setRedisConfig] = useState<RedisConfig>({
    host: 'localhost',
    port: '6379',
    password: '',
    db: '0',
    enabled: false,
    url: '',
    cloudProvider: 'redis-cloud',
    connectionType: 'self-hosted'
  });
  const [redisTestLoading, setRedisTestLoading] = useState(false);
  const [redisTestResult, setRedisTestResult] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);
  const [r2TestLoading, setR2TestLoading] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);

  // Check authentication before fetching settings
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user || user.role !== 'super_admin') {
        router.push('/login');
        return;
      }
      // Only fetch if authenticated and has super_admin role
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user, router]);

  // Auto-load system status when status tab is selected
  useEffect(() => {
    if (activeTab === 'status' && !systemStatus) {
      fetchSystemStatus();
    }
  }, [activeTab]);

  // Auto-refresh system status every 30 seconds when on status tab
  useEffect(() => {
    if (activeTab !== 'status') return;
    
    const interval = setInterval(() => {
      fetchSystemStatus();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // System Status Functions
  const fetchSystemStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await apiClient.get('/system-status/status');
      
      // Handle both direct data and nested data structure
      const statusData = response.data || response;
      setSystemStatus(statusData);
    } catch (error: any) {
      console.error('Failed to fetch system status:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch system status');
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchLogContent = async (filename: string) => {
    setLogLoading(true);
    setSelectedLog(filename);
    try {
      const response = await apiClient.get(`/system-status/logs/${filename}?lines=100`);
      setLogContent(response.data.content);
    } catch (error) {
      console.error('Failed to fetch log content:', error);
      toast.error('Failed to fetch log content');
      setLogContent('Error loading log file');
    } finally {
      setLogLoading(false);
    }
  };

  const clearLogFile = async (filename: string) => {
    try {
      await apiClient.post('/system-status/logs/clear', { filename });
      toast.success('Log file cleared successfully');
      fetchSystemStatus(); // Refresh status to update log file info
    } catch (error) {
      console.error('Failed to clear log file:', error);
      toast.error('Failed to clear log file');
    }
  };

  const downloadLogFile = async (filename: string) => {
    try {
      const response = await apiClient.get(`/system-status/logs/${filename}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Log file downloaded successfully');
    } catch (error) {
      console.error('Failed to download log file:', error);
      toast.error('Failed to download log file');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
      case 'stopped':
        return 'text-red-600';
      case 'not_configured':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error':
      case 'stopped':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'not_configured':
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching settings...');
      const response = await apiClient.getSystemSettings();
      console.log('📡 Fetch response:', response);
      
      if (response.success) {
        setSettings(response.data);
        console.log('✅ Settings loaded:', response.data);
        
        // Load Redis configuration from settings
        if (response.data) {
          setRedisConfig({
            host: response.data.redis_host || 'localhost',
            port: response.data.redis_port || '6379',
            password: response.data.redis_password || '',
            db: response.data.redis_db || '0',
            enabled: response.data.redis_enabled === 'true',
            url: response.data.redis_url || '',
            cloudProvider: response.data.redis_cloud_provider || 'redis-cloud',
            connectionType: response.data.redis_url ? 'cloud' : 'self-hosted'
          });
        }
      } else {
        console.error('❌ Fetch returned success: false', response);
        setError(response.message || 'Failed to fetch settings');
      }
    } catch (error: any) {
      console.error('❌ Error fetching settings:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      // Handle 401 Unauthorized - redirect to login
      if (error.response?.status === 401) {
        console.warn('⚠️ Unauthorized access - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        toast.error('Session expired. Please login again.');
        router.push('/login');
        return;
      }
      
      // Handle 403 Forbidden - user doesn't have permission
      if (error.response?.status === 403) {
        console.warn('⚠️ Forbidden - user does not have super admin access');
        toast.error('You do not have permission to access this page.');
        router.push('/login');
        return;
      }
      
      setError(error.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving settings:', settings);
      const response = await apiClient.updateSystemSettings(settings);
      console.log('📡 API response:', response);
      
      if (response.success) {
        toast.success('Settings saved successfully');
        console.log('✅ Settings saved successfully');
      } else {
        console.error('❌ API returned success: false', response);
        toast.error(response.message || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('❌ Error saving settings:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = async () => {
    try {
      setSaving(true);
      const response = await apiClient.updateSystemSettings({});
      
      if (response.success) {
        toast.success('Settings reset to defaults');
        fetchSettings();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const getSettingValue = (key: string, defaultValue: string = '') => {
    return settings[key] || defaultValue;
  };

  const getBooleanValue = (key: string, defaultValue: boolean = false) => {
    const value = settings[key];
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return value === 'true';
  };

  // Redis Configuration Functions
  const updateRedisConfig = (field: keyof RedisConfig, value: string | boolean) => {
    setRedisConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testRedisConnection = async () => {
    setRedisTestLoading(true);
    setRedisTestResult(null);
    
    try {
      const response = await apiClient.post('/system-status/redis/test', redisConfig);
      
      if (response.success) {
        setRedisTestResult('success');
        toast.success('Redis connection successful!');
      } else {
        setRedisTestResult('error');
        toast.error(response.message || 'Redis connection failed');
      }
    } catch (error: any) {
      console.error('Redis test error:', error);
      setRedisTestResult('error');
      toast.error(error.response?.data?.message || 'Redis connection failed');
    } finally {
      setRedisTestLoading(false);
    }
  };

  const testEmailConfiguration = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to test');
      return;
    }

    setEmailTestLoading(true);
    setEmailTestResult(null);
    
    try {
      const response = await apiClient.post('/superadmin/test-email', { email: testEmail });
      
      if (response.success) {
        setEmailTestResult('success');
        toast.success('Test email sent successfully!');
      } else {
        setEmailTestResult('error');
        toast.error(response.message || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Email test error:', error);
      setEmailTestResult('error');
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setEmailTestLoading(false);
    }
  };

  const testR2Connection = async () => {
    setR2TestLoading(true);
    setR2TestResult(null);
    
    try {
      const response = await apiClient.post('/superadmin/test-r2', {});
      
      if (response.success) {
        setR2TestResult('success');
        toast.success('R2 connection test successful!');
      } else {
        setR2TestResult('error');
        toast.error(response.message || 'Failed to test R2 connection');
      }
    } catch (error: any) {
      console.error('R2 test error:', error);
      setR2TestResult('error');
      toast.error(error.response?.data?.message || 'Failed to test R2 connection');
    } finally {
      setR2TestLoading(false);
    }
  };

  const saveRedisConfig = async () => {
    try {
      setSaving(true);
      
      // Save Redis configuration as system settings
      const redisSettings = {
        redis_host: redisConfig.host,
        redis_port: redisConfig.port,
        redis_password: redisConfig.password,
        redis_db: redisConfig.db,
        redis_enabled: redisConfig.enabled.toString(),
        redis_url: redisConfig.url,
        redis_cloud_provider: redisConfig.cloudProvider
      };
      
      const response = await apiClient.updateSystemSettings(redisSettings);
      
      if (response.success) {
        toast.success('Redis configuration saved successfully!');
        // Test connection after saving
        if (redisConfig.enabled) {
          await testRedisConnection();
        }
      } else {
        toast.error(response.message || 'Failed to save Redis configuration');
      }
    } catch (error: any) {
      console.error('Save Redis config error:', error);
      toast.error(error.response?.data?.message || 'Failed to save Redis configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading settings..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Settings}
        title="Failed to load settings"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchSettings,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure global system settings and preferences
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleResetSettings} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>General Settings</span>
              </CardTitle>
              <CardDescription>
                Basic application settings and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Site Name</Label>
                  <Input
                    id="site_name"
                    value={getSettingValue('site_name', 'NxChat')}
                    onChange={(e) => updateSetting('site_name', e.target.value)}
                    placeholder="NxChat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_url">Site URL</Label>
                  <Input
                    id="site_url"
                    value={getSettingValue('site_url', process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000')}
                    onChange={(e) => updateSetting('site_url', e.target.value)}
                    placeholder="https://your-domain.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_description">Site Description</Label>
                <Textarea
                  id="site_description"
                  value={getSettingValue('site_description', 'Modern customer support platform')}
                  onChange={(e) => updateSetting('site_description', e.target.value)}
                  placeholder="Description of your application"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={getSettingValue('support_email', 'support@nxchat.com')}
                    onChange={(e) => updateSetting('support_email', e.target.value)}
                    placeholder="support@your-domain.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_email">Admin Email</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={getSettingValue('admin_email', 'admin@nxchat.com')}
                    onChange={(e) => updateSetting('admin_email', e.target.value)}
                    placeholder="admin@your-domain.com"
                  />
                </div>
              </div>
              
              <Separator />
              
              {/* App Logo and Favicon Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* App Logo Upload */}
                  <div className="space-y-4">
                    <Label>Application Logo</Label>
                    <div className="space-y-3">
                      {getSettingValue('app_logo') && (
                        <div className="relative inline-block">
                          <img
                            src={getSettingValue('app_logo')}
                            alt="App Logo"
                            className="h-20 w-auto object-contain border border-gray-200 rounded-lg p-2 bg-white"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 bg-red-500 hover:bg-red-600 text-white"
                            onClick={async () => {
                              try {
                                await updateSetting('app_logo', '');
                                toast.success('Logo removed');
                              } catch (error) {
                                toast.error('Failed to remove logo');
                              }
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="logo-upload"
                          className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {getSettingValue('app_logo') ? 'Change Logo' : 'Upload Logo'}
                          </span>
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              // Validate file size (5MB limit)
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('File size must be less than 5MB');
                                return;
                              }
                              
                              setLogoUploading(true);
                              try {
                                const formData = new FormData();
                                formData.append('logo', file);
                                
                                const response = await apiClient.post('/superadmin/upload-logo', formData);
                                
                                if (response.success) {
                                  await updateSetting('app_logo', response.data.url);
                                  toast.success('Logo uploaded successfully');
                                  // Refresh settings to show the new logo
                                  fetchSettings();
                                } else {
                                  toast.error(response.message || 'Failed to upload logo');
                                }
                              } catch (error: any) {
                                console.error('Logo upload error:', error);
                                toast.error(error.response?.data?.message || 'Failed to upload logo');
                              } finally {
                                setLogoUploading(false);
                                e.target.value = ''; // Reset input
                              }
                            }}
                            disabled={logoUploading}
                          />
                        </label>
                        {logoUploading && (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended: PNG or SVG, max 5MB. Logo will be displayed in the application header.
                      </p>
                    </div>
                  </div>
                  
                  {/* App Favicon Upload */}
                  <div className="space-y-4">
                    <Label>Application Favicon</Label>
                    <div className="space-y-3">
                      {getSettingValue('app_favicon') && (
                        <div className="relative inline-block">
                          <img
                            src={getSettingValue('app_favicon')}
                            alt="App Favicon"
                            className="h-16 w-16 object-contain border border-gray-200 rounded-lg p-2 bg-white"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 bg-red-500 hover:bg-red-600 text-white"
                            onClick={async () => {
                              try {
                                await updateSetting('app_favicon', '');
                                toast.success('Favicon removed');
                              } catch (error) {
                                toast.error('Failed to remove favicon');
                              }
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="favicon-upload"
                          className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {getSettingValue('app_favicon') ? 'Change Favicon' : 'Upload Favicon'}
                          </span>
                          <input
                            id="favicon-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              // Validate file size (5MB limit)
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('File size must be less than 5MB');
                                return;
                              }
                              
                              setFaviconUploading(true);
                              try {
                                const formData = new FormData();
                                formData.append('favicon', file);
                                
                                const response = await apiClient.post('/superadmin/upload-favicon', formData);
                                
                                if (response.success) {
                                  await updateSetting('app_favicon', response.data.url);
                                  toast.success('Favicon uploaded successfully');
                                  // Refresh settings to show the new favicon
                                  fetchSettings();
                                } else {
                                  toast.error(response.message || 'Failed to upload favicon');
                                }
                              } catch (error: any) {
                                console.error('Favicon upload error:', error);
                                toast.error(error.response?.data?.message || 'Failed to upload favicon');
                              } finally {
                                setFaviconUploading(false);
                                e.target.value = ''; // Reset input
                              }
                            }}
                            disabled={faviconUploading}
                          />
                        </label>
                        {faviconUploading && (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended: ICO or PNG (16x16 or 32x32), max 5MB. Favicon appears in browser tabs.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Notification Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable notification sounds for new messages
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('notification_sound_enabled', true)}
                    onCheckedChange={(checked) => updateSetting('notification_sound_enabled', checked.toString())}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="notification_sound_file">Notification Sound File</Label>
                    <Select
                      value={getSettingValue('notification_sound_file', 'default')}
                      onValueChange={(value) => updateSetting('notification_sound_file', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select notification sound" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="chime">Chime</SelectItem>
                        <SelectItem value="ding">Ding</SelectItem>
                        <SelectItem value="pop">Pop</SelectItem>
                        <SelectItem value="bell">Bell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notification_volume">Notification Volume</Label>
                    <Input
                      id="notification_volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={getSettingValue('notification_volume', '0.5')}
                      onChange={(e) => updateSetting('notification_volume', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Volume: {Math.round(parseFloat(getSettingValue('notification_volume', '0.5')) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Configure security policies and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register accounts
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('enable_registration', true)}
                    onCheckedChange={(checked) => updateSetting('enable_registration', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must verify their email before accessing the platform
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('require_email_verification', false)}
                    onCheckedChange={(checked) => updateSetting('require_email_verification', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all user accounts
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('enable_two_factor', false)}
                    onCheckedChange={(checked) => updateSetting('enable_two_factor', checked.toString())}
                  />
                </div>
                <Separator />
                {/* 2FA Method Options - shown when 2FA is enabled */}
                {getBooleanValue('enable_two_factor', false) && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium">2FA Authentication Methods</h4>
                    <p className="text-sm text-muted-foreground">
                      Select which two-factor authentication methods users can use:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Email Verification</Label>
                          <p className="text-sm text-muted-foreground">
                            Send verification codes via email
                          </p>
                        </div>
                        <Switch
                          checked={getBooleanValue('two_factor_method_email', true)}
                          onCheckedChange={(checked) => updateSetting('two_factor_method_email', checked.toString())}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Google Authenticator</Label>
                          <p className="text-sm text-muted-foreground">
                            Use Google Authenticator app for verification codes
                          </p>
                        </div>
                        <Switch
                          checked={getBooleanValue('two_factor_method_google_authenticator', true)}
                          onCheckedChange={(checked) => updateSetting('two_factor_method_google_authenticator', checked.toString())}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                    <Input
                      id="session_timeout"
                      type="number"
                      value={getSettingValue('session_timeout', '3600')}
                      onChange={(e) => updateSetting('session_timeout', e.target.value)}
                      placeholder="3600"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
                    <Input
                      id="max_login_attempts"
                      type="number"
                      value={getSettingValue('max_login_attempts', '5')}
                      onChange={(e) => updateSetting('max_login_attempts', e.target.value)}
                      placeholder="5"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Email Settings</span>
              </CardTitle>
              <CardDescription>
                Configure SMTP settings for email delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={getSettingValue('smtp_host', '')}
                    onChange={(e) => updateSetting('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={getSettingValue('smtp_port', '587')}
                    onChange={(e) => updateSetting('smtp_port', e.target.value)}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">SMTP Username</Label>
                  <Input
                    id="smtp_user"
                    value={getSettingValue('smtp_user', '')}
                    onChange={(e) => updateSetting('smtp_user', e.target.value)}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">SMTP Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={getSettingValue('smtp_password', '')}
                    onChange={(e) => updateSetting('smtp_password', e.target.value)}
                    placeholder="App password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">From Name</Label>
                  <Input
                    id="smtp_from_name"
                    value={getSettingValue('smtp_from_name', '')}
                    onChange={(e) => updateSetting('smtp_from_name', e.target.value)}
                    placeholder="NxChat Support"
                  />
                  <p className="text-sm text-muted-foreground">
                    The name that will appear as the sender of emails
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Use Secure Connection</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable SSL/TLS for SMTP connection
                  </p>
                </div>
                <Switch
                  checked={getBooleanValue('smtp_secure', true)}
                  onCheckedChange={(checked) => updateSetting('smtp_secure', checked.toString())}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test_email">Test Email Address</Label>
                  <Input
                    id="test_email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your-email@example.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter an email address to test your SMTP configuration
                  </p>
                </div>
                
                <Button
                  onClick={testEmailConfiguration}
                  disabled={emailTestLoading || !testEmail}
                  className="flex items-center space-x-2"
                >
                  {emailTestLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sending Test Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Test Email</span>
                    </>
                  )}
                </Button>

                {emailTestResult && (
                  <div className={`p-3 rounded-md ${
                    emailTestResult === 'success' 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {emailTestResult === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {emailTestResult === 'success' 
                          ? 'Test email sent successfully! Please check your inbox.' 
                          : 'Failed to send test email. Please check your SMTP settings.'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>System Settings</span>
              </CardTitle>
              <CardDescription>
                Configure system behavior and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable the platform for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('maintenance_mode', false)}
                    onCheckedChange={(checked) => updateSetting('maintenance_mode', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Debug Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable detailed error logging and debugging
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('debug_mode', false)}
                    onCheckedChange={(checked) => updateSetting('debug_mode', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="max_file_size">Max File Size (MB)</Label>
                    <Input
                      id="max_file_size"
                      type="number"
                      value={Math.round(parseInt(getSettingValue('max_file_size', '10485760')) / 1024 / 1024)}
                      onChange={(e) => updateSetting('max_file_size', (parseInt(e.target.value) * 1024 * 1024).toString())}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="log_level">Log Level</Label>
                    <Select
                      value={getSettingValue('log_level', 'info')}
                      onValueChange={(value) => updateSetting('log_level', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowed_file_types">Allowed File Types</Label>
                  <Input
                    id="allowed_file_types"
                    value={getSettingValue('allowed_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx,txt')}
                    onChange={(e) => updateSetting('allowed_file_types', e.target.value)}
                    placeholder="jpg,jpeg,png,gif,pdf,doc,docx,txt"
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of allowed file extensions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Storage Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Storage Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure storage provider settings and select default storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default_storage_provider">Default Storage Provider</Label>
                  <Select
                    value={getSettingValue('default_storage_provider', 'r2')}
                    onValueChange={(value) => updateSetting('default_storage_provider', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select storage provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="r2">Cloudflare R2</SelectItem>
                      <SelectItem value="wasabi">Wasabi</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Select the default storage provider for file uploads. Make sure the selected provider is properly configured below.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Cloudflare R2 Configuration</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure Cloudflare R2 storage provider credentials
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="r2_access_key_id">Access Key ID</Label>
                    <Input
                      id="r2_access_key_id"
                      type="password"
                      value={getSettingValue('r2_access_key_id', '')}
                      onChange={(e) => updateSetting('r2_access_key_id', e.target.value)}
                      placeholder="Your R2 Access Key ID"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your Cloudflare R2 Access Key ID
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r2_secret_access_key">Secret Access Key</Label>
                    <Input
                      id="r2_secret_access_key"
                      type="password"
                      value={getSettingValue('r2_secret_access_key', '')}
                      onChange={(e) => updateSetting('r2_secret_access_key', e.target.value)}
                      placeholder="Your R2 Secret Access Key"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your Cloudflare R2 Secret Access Key
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="r2_bucket_name">Bucket Name</Label>
                    <Input
                      id="r2_bucket_name"
                      value={getSettingValue('r2_bucket_name', '')}
                      onChange={(e) => updateSetting('r2_bucket_name', e.target.value)}
                      placeholder="nxchat"
                    />
                    <p className="text-sm text-muted-foreground">
                      Your R2 bucket name
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="r2_region">Region</Label>
                    <Input
                      id="r2_region"
                      value={getSettingValue('r2_region', 'auto')}
                      onChange={(e) => updateSetting('r2_region', e.target.value)}
                      placeholder="auto"
                    />
                    <p className="text-sm text-muted-foreground">
                      R2 region (usually "auto")
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="r2_endpoint">Endpoint URL</Label>
                  <Input
                    id="r2_endpoint"
                    type="url"
                    value={getSettingValue('r2_endpoint', '')}
                    onChange={(e) => updateSetting('r2_endpoint', e.target.value)}
                    placeholder="https://083a25b0ffff459d01abf072fa86fb5b.r2.cloudflarestorage.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    Your R2 endpoint URL from Cloudflare dashboard
                    <br />
                    Format: https://xxx.r2.cloudflarestorage.com
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="r2_public_url">Public URL (CDN)</Label>
                  <Input
                    id="r2_public_url"
                    type="url"
                    value={getSettingValue('r2_public_url', '')}
                    onChange={(e) => updateSetting('r2_public_url', e.target.value)}
                    placeholder="https://pub-c858b39707e84202a98190bd7fa92be4.r2.dev"
                  />
                  <p className="text-sm text-muted-foreground">
                    The public URL for your Cloudflare R2 bucket. This URL will be used to serve uploaded files.
                    <br />
                    Example: https://pub-c858b39707e84202a98190bd7fa92be4.r2.dev
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Button
                    onClick={testR2Connection}
                    disabled={r2TestLoading}
                    className="flex items-center space-x-2"
                  >
                    {r2TestLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Testing Connection...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        <span>Test R2 Connection</span>
                      </>
                    )}
                  </Button>

                  {r2TestResult && (
                    <div className={`p-3 rounded-md ${
                      r2TestResult === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {r2TestResult === 'success' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {r2TestResult === 'success' 
                            ? 'R2 connection test successful! All operations (upload, download, delete) completed successfully.' 
                            : 'R2 connection test failed. Please check your configuration and credentials.'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-blue-900 mb-1">How to get R2 credentials:</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                        <li>Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens</li>
                        <li>Create API Token with Object Read & Write permissions</li>
                        <li>Copy the Access Key ID and Secret Access Key</li>
                        <li>Get your bucket endpoint from R2 → Your Bucket → Settings</li>
                        <li>Set up a public domain for your bucket to get the Public URL</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Redis Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>Redis Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure Redis connection for caching and session management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Redis</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable Redis for improved performance and caching
                  </p>
                </div>
                <Switch
                  checked={redisConfig.enabled}
                  onCheckedChange={(checked) => updateRedisConfig('enabled', checked)}
                />
              </div>

              {redisConfig.enabled && (
                <>
                  <Separator />
                  
                  {/* Connection Type Selection */}
                  <div className="space-y-2">
                    <Label>Connection Type</Label>
                    <Select
                      value={redisConfig.connectionType}
                      onValueChange={(value) => updateRedisConfig('connectionType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self-hosted">Self-Hosted Redis</SelectItem>
                        <SelectItem value="cloud">Redis Cloud</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {redisConfig.connectionType === 'cloud' ? (
                    <>
                      {/* Cloud Configuration */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="redis_url">Redis Cloud URL</Label>
                          <Input
                            id="redis_url"
                            value={redisConfig.url}
                            onChange={(e) => updateRedisConfig('url', e.target.value)}
                            placeholder="redis://username:password@host:port"
                          />
                          <p className="text-sm text-muted-foreground">
                            Enter your Redis Cloud connection URL. Format: redis://username:password@host:port
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="redis_cloud_provider">Cloud Provider</Label>
                          <Select
                            value={redisConfig.cloudProvider}
                            onValueChange={(value) => updateRedisConfig('cloudProvider', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="redis-cloud">Redis Cloud</SelectItem>
                              <SelectItem value="aws-elasticache">AWS ElastiCache</SelectItem>
                              <SelectItem value="azure-cache">Azure Cache for Redis</SelectItem>
                              <SelectItem value="google-cloud-memorystore">Google Cloud Memorystore</SelectItem>
                              <SelectItem value="digitalocean">DigitalOcean Managed Redis</SelectItem>
                              <SelectItem value="custom">Custom Cloud Provider</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Self-Hosted Configuration */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="redis_host">Host</Label>
                          <Input
                            id="redis_host"
                            value={redisConfig.host}
                            onChange={(e) => updateRedisConfig('host', e.target.value)}
                            placeholder="localhost"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="redis_port">Port</Label>
                          <Input
                            id="redis_port"
                            type="number"
                            value={redisConfig.port}
                            onChange={(e) => updateRedisConfig('port', e.target.value)}
                            placeholder="6379"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="redis_password">Password</Label>
                          <Input
                            id="redis_password"
                            type="password"
                            value={redisConfig.password}
                            onChange={(e) => updateRedisConfig('password', e.target.value)}
                            placeholder="Leave empty if no password"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="redis_db">Database Number</Label>
                          <Input
                            id="redis_db"
                            type="number"
                            value={redisConfig.db}
                            onChange={(e) => updateRedisConfig('db', e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={testRedisConnection}
                      disabled={redisTestLoading}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      {redisTestLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                      <span>Test Connection</span>
                    </Button>
                    
                    <Button
                      onClick={saveRedisConfig}
                      disabled={saving}
                      className="flex items-center space-x-2"
                    >
                      {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save Configuration</span>
                    </Button>
                  </div>

                  {redisTestResult && (
                    <div className={`p-3 rounded-md ${
                      redisTestResult === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {redisTestResult === 'success' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {redisTestResult === 'success' 
                            ? 'Redis connection successful!' 
                            : 'Redis connection failed. Please check your configuration.'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Status */}
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5" />
                  <span>System Status</span>
                </div>
                <Button 
                  onClick={fetchSystemStatus} 
                  disabled={statusLoading}
                  size="sm"
                >
                  {statusLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Monitor system health, services status, and view logs
                {systemStatus && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Last updated: {new Date(systemStatus.timestamp).toLocaleString()}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {systemStatus ? (
                <>
                  {/* Overall Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(systemStatus.overall)}
                          <div>
                            <p className="text-sm font-medium">Overall Status</p>
                            <p className={`text-lg font-bold ${getStatusColor(systemStatus.overall)}`}>
                              {systemStatus.overall.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">Response Time</p>
                            <p className="text-lg font-bold text-blue-600">
                              {systemStatus.responseTime}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Server className="w-4 h-4 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium">Server Uptime</p>
                            <p className="text-lg font-bold text-purple-600">
                              {systemStatus.server.uptime}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Services Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Server className="w-5 h-5" />
                        <span>Services Status</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Database className="w-4 h-4" />
                            <span className="font-medium">MySQL</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(systemStatus.services.mysql.status)}
                            <span className={`text-sm ${getStatusColor(systemStatus.services.mysql.status)}`}>
                              {systemStatus.services.mysql.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4" />
                            <span className="font-medium">Redis</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(systemStatus.services.redis.status)}
                            <span className={`text-sm ${getStatusColor(systemStatus.services.redis.status)}`}>
                              {systemStatus.services.redis.status}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Server className="w-4 h-4" />
                            <span className="font-medium">Node.js</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(systemStatus.services.nodejs.status)}
                            <span className={`text-sm ${getStatusColor(systemStatus.services.nodejs.status)}`}>
                              {systemStatus.services.nodejs.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Resources */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Activity className="w-5 h-5" />
                          <span>Memory Usage</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">System Memory</span>
                            <span className="text-sm font-medium">
                              {systemStatus.system.memory.used} / {systemStatus.system.memory.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all ${
                                systemStatus.system.memory.usagePercent > 80 ? 'bg-red-600' :
                                systemStatus.system.memory.usagePercent > 60 ? 'bg-yellow-600' :
                                'bg-blue-600'
                              }`}
                              style={{ width: `${systemStatus.system.memory.usagePercent}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{systemStatus.system.memory.usagePercent}% used</span>
                            <span>{systemStatus.system.memory.free} free</span>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Node.js Heap</span>
                            <span className="text-sm font-medium">
                              {systemStatus.server.memory.heapUsed} / {systemStatus.server.memory.heapTotal}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">RSS:</span> {systemStatus.server.memory.rss}
                            </div>
                            <div>
                              <span className="font-medium">External:</span> {systemStatus.server.memory.external}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Monitor className="w-5 h-5" />
                          <span>CPU Usage</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Overall CPU Usage</span>
                            <span className="text-sm font-medium">
                              {systemStatus.system.cpu.usagePercent ?? systemStatus.server.cpuUsage.percent}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all ${
                                (systemStatus.system.cpu.usagePercent ?? systemStatus.server.cpuUsage.percent) > 80 ? 'bg-red-600' :
                                (systemStatus.system.cpu.usagePercent ?? systemStatus.server.cpuUsage.percent) > 60 ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(systemStatus.system.cpu.usagePercent ?? systemStatus.server.cpuUsage.percent, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">CPU Model:</span>
                            <span className="font-medium text-xs">{systemStatus.system.cpu.model}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">CPU Cores:</span>
                            <span className="font-medium">{systemStatus.system.cpu.cores} cores</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">CPU Speed:</span>
                            <span className="font-medium">{systemStatus.system.cpu.speed}</span>
                          </div>
                          {systemStatus.system.cpu.loadAverage && systemStatus.system.cpu.loadAverage.length > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Load Average:</span>
                              <span className="font-medium">{systemStatus.system.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}</span>
                            </div>
                          )}
                        </div>
                        {systemStatus.system.cpu.details && systemStatus.system.cpu.details.length > 0 && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Per-Core Usage:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {systemStatus.system.cpu.details.slice(0, 4).map((core) => (
                                  <div key={core.core} className="flex justify-between text-xs">
                                    <span>Core {core.core}:</span>
                                    <span className="font-medium">{core.usage}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Disk & Network Information */}
                  {(systemStatus.system.disk || systemStatus.system.network) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {systemStatus.system.disk && systemStatus.system.disk.total !== 'N/A' && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <HardDrive className="w-5 h-5" />
                              <span>Disk Usage</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">Disk Space</span>
                                <span className="text-sm font-medium">
                                  {systemStatus.system.disk.used} / {systemStatus.system.disk.total}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all ${
                                    systemStatus.system.disk.usagePercent > 90 ? 'bg-red-600' :
                                    systemStatus.system.disk.usagePercent > 70 ? 'bg-yellow-600' :
                                    'bg-green-600'
                                  }`}
                                  style={{ width: `${systemStatus.system.disk.usagePercent}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{systemStatus.system.disk.usagePercent}% used</span>
                                <span>{systemStatus.system.disk.free} free</span>
                              </div>
                            </div>
                            {systemStatus.system.disk.filesystem && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Filesystem:</span> {systemStatus.system.disk.filesystem}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Path:</span> {systemStatus.system.disk.path}
                            </div>
                            {(systemStatus.system.disk as any).note && (
                              <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                {(systemStatus.system.disk as any).note}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {systemStatus.system.network && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Network className="w-5 h-5" />
                              <span>Network Information</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {systemStatus.system.network.primary && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Primary IP:</span>
                                  <span className="font-medium">{systemStatus.system.network.primary.address}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Interface:</span>
                                  <span className="font-medium">{systemStatus.system.network.primary.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Netmask:</span>
                                  <span className="font-medium">{systemStatus.system.network.primary.netmask}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">MAC Address:</span>
                                  <span className="font-medium text-xs">{systemStatus.system.network.primary.mac}</span>
                                </div>
                              </div>
                            )}
                            {systemStatus.system.network.interfaces.length > 1 && (
                              <>
                                <Separator />
                                <div className="text-xs text-muted-foreground">
                                  <span className="font-medium">Total Interfaces:</span> {systemStatus.system.network.interfaces.length}
                                </div>
                              </>
                            )}
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Hostname:</span> {systemStatus.system.network.hostname}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Operating System Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Server className="w-5 h-5" />
                        <span>Operating System</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Platform</p>
                          <p className="text-sm font-medium">{systemStatus.system.os.platform}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Version</p>
                          <p className="text-sm font-medium">{systemStatus.system.os.release}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Architecture</p>
                          <p className="text-sm font-medium">{systemStatus.system.os.arch}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Hostname</p>
                          <p className="text-sm font-medium">{systemStatus.system.os.hostname}</p>
                        </div>
                        {systemStatus.system.os.type && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Type</p>
                            <p className="text-sm font-medium">{systemStatus.system.os.type}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">System Uptime</p>
                          <p className="text-sm font-medium">{systemStatus.system.uptime}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Node.js Version</p>
                          <p className="text-sm font-medium">{systemStatus.server.nodeVersion}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Process ID</p>
                          <p className="text-sm font-medium">{systemStatus.server.pid}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Database & Redis Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Database className="w-5 h-5" />
                          <span>Database Status</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Status</span>
                          <Badge variant={systemStatus.database.status === 'healthy' ? 'default' : 'destructive'}>
                            {systemStatus.database.status}
                          </Badge>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Response Time</span>
                            <span className="font-medium">{systemStatus.database.responseTime}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Database Type</span>
                            <span className="font-medium">{systemStatus.database.dialect?.toUpperCase() || 'MySQL'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Version</span>
                            <span className="font-medium">{systemStatus.database.version}</span>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">Connection Pool</span>
                            <span className="text-sm font-medium">
                              {systemStatus.database.connectionPool.used}/{systemStatus.database.connectionPool.total}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (systemStatus.database.connectionPool.used / systemStatus.database.connectionPool.total) > 0.8 ? 'bg-red-600' :
                                (systemStatus.database.connectionPool.used / systemStatus.database.connectionPool.total) > 0.6 ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}
                              style={{ width: `${(systemStatus.database.connectionPool.used / systemStatus.database.connectionPool.total) * 100}%` }}
                            ></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mt-2">
                            <div>
                              <span className="font-medium">Used:</span> {systemStatus.database.connectionPool.used}
                            </div>
                            <div>
                              <span className="font-medium">Idle:</span> {systemStatus.database.connectionPool.idle}
                            </div>
                            <div>
                              <span className="font-medium">Waiting:</span> {systemStatus.database.connectionPool.waiting}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Activity className="w-5 h-5" />
                          <span>Redis Status</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Status</span>
                          <Badge variant={
                            systemStatus.redis.status === 'healthy' ? 'default' : 
                            systemStatus.redis.status === 'not_configured' ? 'secondary' : 
                            'destructive'
                          }>
                            {systemStatus.redis.status}
                          </Badge>
                        </div>
                        {systemStatus.redis.status !== 'not_configured' && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Response Time</span>
                                <span className="font-medium">{systemStatus.redis.responseTime}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Memory Used</span>
                                <span className="font-medium">
                                  {systemStatus.redis.memory?.used || 'N/A'}
                                </span>
                              </div>
                              {systemStatus.redis.memory?.max && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Memory Limit</span>
                                  <span className="font-medium">{systemStatus.redis.memory.max}</span>
                                </div>
                              )}
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Keys Stored</span>
                                <span className="font-medium">
                                  {systemStatus.redis.databaseSize?.toLocaleString() || 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Connected Clients</span>
                                <span className="font-medium">
                                  {systemStatus.redis.connectedClients || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Log Files */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Log Files</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {systemStatus.logs.map((log) => (
                            <div key={log.name} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4" />
                                <div>
                                  <p className="font-medium">{log.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {log.size} • {new Date(log.modified).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fetchLogContent(log.name)}
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadLogFile(log.name)}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => clearLogFile(log.name)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Log Content Viewer */}
                        {selectedLog && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span>Log: {selectedLog}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedLog(null)}
                                >
                                  Close
                                </Button>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {logLoading ? (
                                <div className="flex items-center justify-center p-8">
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                              ) : (
                                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                                  {logContent}
                                </pre>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <Button onClick={fetchSystemStatus} disabled={statusLoading}>
                    {statusLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Load System Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <span>AI Settings</span>
              </CardTitle>
              <CardDescription>
                Configure AI and machine learning features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ai_agent_name">AI Agent Name</Label>
                <Input
                  id="ai_agent_name"
                  value={getSettingValue('ai_agent_name', 'NxChat Assistant')}
                  onChange={(e) => updateSetting('ai_agent_name', e.target.value)}
                  placeholder="NxChat Assistant"
                />
                <p className="text-sm text-muted-foreground">
                  The name that will be displayed for the AI agent in chat conversations
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ai_agent_logo">AI Agent Logo URL</Label>
                <Input
                  id="ai_agent_logo"
                  value={getSettingValue('ai_agent_logo', '')}
                  onChange={(e) => updateSetting('ai_agent_logo', e.target.value)}
                  placeholder="https://example.com/ai-logo.png"
                />
                <p className="text-sm text-muted-foreground">
                  URL of the logo image for the AI agent (optional)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ai_system_message">System Message</Label>
                <Textarea
                  id="ai_system_message"
                  value={getSettingValue('ai_system_message', 'You are a helpful AI assistant for NxChat customer support. Be friendly, professional, and helpful. Always follow the super admin commands and guidelines.')}
                  onChange={(e) => updateSetting('ai_system_message', e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  System message that defines the AI's behavior and personality. This will be sent to the AI model to establish its role and guidelines.
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                <Input
                  id="openai_api_key"
                  type="password"
                  value={getSettingValue('openai_api_key', '')}
                  onChange={(e) => updateSetting('openai_api_key', e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ai_model">AI Model</Label>
                  <Select
                    value={getSettingValue('ai_model', 'gpt-3.5-turbo')}
                    onValueChange={(value) => updateSetting('ai_model', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai_temperature">Temperature</Label>
                  <Input
                    id="ai_temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={getSettingValue('ai_temperature', '0.7')}
                    onChange={(e) => updateSetting('ai_temperature', e.target.value)}
                    placeholder="0.7"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai_max_tokens">Max Tokens</Label>
                  <Input
                    id="ai_max_tokens"
                    type="number"
                    value={getSettingValue('ai_max_tokens', '1000')}
                    onChange={(e) => updateSetting('ai_max_tokens', e.target.value)}
                    placeholder="1000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Payment Settings</span>
              </CardTitle>
              <CardDescription>
                Configure Stripe payment processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="stripe_secret_key">Stripe Secret Key</Label>
                <Input
                  id="stripe_secret_key"
                  type="password"
                  value={getSettingValue('stripe_secret_key', '')}
                  onChange={(e) => updateSetting('stripe_secret_key', e.target.value)}
                  placeholder="sk_test_..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe_publishable_key">Stripe Publishable Key</Label>
                <Input
                  id="stripe_publishable_key"
                  value={getSettingValue('stripe_publishable_key', '')}
                  onChange={(e) => updateSetting('stripe_publishable_key', e.target.value)}
                  placeholder="pk_test_..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe_webhook_secret">Stripe Webhook Secret</Label>
                <Input
                  id="stripe_webhook_secret"
                  type="password"
                  value={getSettingValue('stripe_webhook_secret', '')}
                  onChange={(e) => updateSetting('stripe_webhook_secret', e.target.value)}
                  placeholder="whsec_..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
