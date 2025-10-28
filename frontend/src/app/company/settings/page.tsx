'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Save, 
  Building2,
  Users,
  Bot,
  Zap,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface SettingsData {
  [key: string]: string;
}

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCompanySettings();
      
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const response = await apiClient.updateCompanySettings(settings);
      
      if (response.success) {
        toast.success('Settings saved successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
          <p className="text-muted-foreground">
            Configure your company settings and preferences
          </p>
        </div>
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

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="widget">Widget</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Company Information</span>
              </CardTitle>
              <CardDescription>
                Basic company details and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={getSettingValue('company_name', '')}
                    onChange={(e) => updateSetting('company_name', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomain</Label>
                  <div className="flex">
                    <Input
                      id="subdomain"
                      value={getSettingValue('subdomain', '')}
                      onChange={(e) => updateSetting('subdomain', e.target.value)}
                      placeholder="yourcompany"
                      className="rounded-r-none"
                    />
                    <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                      .nxchat.com
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company_description">Company Description</Label>
                <Textarea
                  id="company_description"
                  value={getSettingValue('company_description', '')}
                  onChange={(e) => updateSetting('company_description', e.target.value)}
                  placeholder="Describe your company..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={getSettingValue('support_email', '')}
                    onChange={(e) => updateSetting('support_email', e.target.value)}
                    placeholder="support@yourcompany.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={getSettingValue('website_url', '')}
                    onChange={(e) => updateSetting('website_url', e.target.value)}
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Settings */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Team Management</span>
              </CardTitle>
              <CardDescription>
                Configure team settings and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Allow Agent Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow agents to self-register for your company
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('allow_agent_registration', false)}
                    onCheckedChange={(checked) => updateSetting('allow_agent_registration', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Require Agent Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Require admin approval for new agent accounts
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('require_agent_approval', true)}
                    onCheckedChange={(checked) => updateSetting('require_agent_approval', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="max_agents">Maximum Agents</Label>
                    <Input
                      id="max_agents"
                      type="number"
                      value={getSettingValue('max_agents', '10')}
                      onChange={(e) => updateSetting('max_agents', e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_departments">Maximum Departments</Label>
                    <Input
                      id="max_departments"
                      type="number"
                      value={getSettingValue('max_departments', '5')}
                      onChange={(e) => updateSetting('max_departments', e.target.value)}
                      placeholder="5"
                    />
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
                Configure security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for your company users
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
                      Select which two-factor authentication methods your users can use:
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
                      value={getSettingValue('session_timeout', '60')}
                      onChange={(e) => updateSetting('session_timeout', e.target.value)}
                      placeholder="60"
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

        {/* Widget Settings */}
        <TabsContent value="widget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <span>Chat Widget Settings</span>
              </CardTitle>
              <CardDescription>
                Customize your chat widget appearance and behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Chat Widget</Label>
                    <p className="text-sm text-muted-foreground">
                      Show chat widget on your website
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('widget_enabled', true)}
                    onCheckedChange={(checked) => updateSetting('widget_enabled', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Offline Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to leave messages when offline
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('widget_offline_messages', true)}
                    onCheckedChange={(checked) => updateSetting('widget_offline_messages', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="widget_title">Widget Title</Label>
                    <Input
                      id="widget_title"
                      value={getSettingValue('widget_title', 'Chat with us')}
                      onChange={(e) => updateSetting('widget_title', e.target.value)}
                      placeholder="Chat with us"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="widget_color">Widget Color</Label>
                    <Input
                      id="widget_color"
                      type="color"
                      value={getSettingValue('widget_color', '#3b82f6')}
                      onChange={(e) => updateSetting('widget_color', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Settings */}
        <TabsContent value="triggers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5" />
                <span>Automation Triggers</span>
              </CardTitle>
              <CardDescription>
                Configure automated responses and actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Auto-Assignment</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign chats to available agents
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('auto_assignment_enabled', true)}
                    onCheckedChange={(checked) => updateSetting('auto_assignment_enabled', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Welcome Message</Label>
                    <p className="text-sm text-muted-foreground">
                      Send automatic welcome message to new chats
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('welcome_message_enabled', true)}
                    onCheckedChange={(checked) => updateSetting('welcome_message_enabled', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="welcome_message">Welcome Message</Label>
                  <Textarea
                    id="welcome_message"
                    value={getSettingValue('welcome_message', 'Hello! How can we help you today?')}
                    onChange={(e) => updateSetting('welcome_message', e.target.value)}
                    placeholder="Hello! How can we help you today?"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
