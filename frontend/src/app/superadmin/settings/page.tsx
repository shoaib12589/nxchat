'use client';

import React, { useEffect, useState } from 'react';
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
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { SystemSetting } from '@/types';
import { toast } from 'sonner';

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
      free: string;
      used: string;
      usagePercent: number;
    };
    cpu: {
      cores: number;
      model: string;
      speed: string;
      loadAverage: number[];
    };
    os: {
      platform: string;
      release: string;
      arch: string;
      hostname: string;
    };
    uptime: string;
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

  useEffect(() => {
    fetchSettings();
  }, []);

  // Auto-load system status when status tab is selected
  useEffect(() => {
    if (activeTab === 'status' && !systemStatus) {
      fetchSystemStatus();
    }
  }, [activeTab]);

  // System Status Functions
  const fetchSystemStatus = async () => {
    setStatusLoading(true);
    try {
      console.log('Fetching system status...');
      const response = await apiClient.get('/system-status/status');
      console.log('System status response:', response);
      console.log('System status data:', response.data);
      
      // Handle both direct data and nested data structure
      const statusData = response.data || response;
      console.log('Setting system status to:', statusData);
      setSystemStatus(statusData);
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      toast.error('Failed to fetch system status');
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
    return settings[key] === 'true' || defaultValue;
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
                    value={getSettingValue('site_url', 'http://localhost:3000')}
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
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">System Memory</span>
                          <span className="text-sm font-medium">
                            {systemStatus.system.memory.used} / {systemStatus.system.memory.total}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${systemStatus.system.memory.usagePercent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Node.js Memory</span>
                          <span className="text-sm font-medium">
                            {systemStatus.server.memory.heapUsed} / {systemStatus.server.memory.heapTotal}
                          </span>
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
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">CPU Usage</span>
                          <span className="text-sm font-medium">
                            {systemStatus.server.cpuUsage.percent}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(systemStatus.server.cpuUsage.percent, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">CPU Cores</span>
                          <span className="text-sm font-medium">
                            {systemStatus.system.cpu.cores} cores
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Database & Redis Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Database className="w-5 h-5" />
                          <span>Database Status</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Status</span>
                          <Badge variant={systemStatus.database.status === 'healthy' ? 'default' : 'destructive'}>
                            {systemStatus.database.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Response Time</span>
                          <span className="text-sm font-medium">{systemStatus.database.responseTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Version</span>
                          <span className="text-sm font-medium">{systemStatus.database.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Connections</span>
                          <span className="text-sm font-medium">
                            {systemStatus.database.connectionPool.used}/{systemStatus.database.connectionPool.total}
                          </span>
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
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Status</span>
                          <Badge variant={
                            systemStatus.redis.status === 'healthy' ? 'default' : 
                            systemStatus.redis.status === 'not_configured' ? 'secondary' : 
                            'destructive'
                          }>
                            {systemStatus.redis.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Response Time</span>
                          <span className="text-sm font-medium">{systemStatus.redis.responseTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Memory Used</span>
                          <span className="text-sm font-medium">
                            {systemStatus.redis.memory?.used || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Keys</span>
                          <span className="text-sm font-medium">
                            {systemStatus.redis.databaseSize || 'N/A'}
                          </span>
                        </div>
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
