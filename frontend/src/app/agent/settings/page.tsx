'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Save, 
  User,
  Bell,
  MessageSquare,
  Shield,
  Clock,
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

export default function AgentSettingsPage() {
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
      const response = await apiClient.getAgentSettings();
      
      if (response.success) {
        setSettings(response.data);
        
        // Load notification sound settings into localStorage for immediate use
        localStorage.setItem('agent_notification_sound_enabled', response.data.notification_sound_enabled || 'true');
        localStorage.setItem('agent_notification_sound', response.data.notification_sound || 'default');
        localStorage.setItem('agent_notification_volume', response.data.notification_volume || '0.5');
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
      const response = await apiClient.updateAgentSettings(settings);
      
      if (response.success) {
        toast.success('Settings saved successfully');
        
        // Save notification sound settings to localStorage for immediate use
        localStorage.setItem('agent_notification_sound_enabled', settings.notification_sound_enabled || 'true');
        localStorage.setItem('agent_notification_sound', settings.notification_sound || 'default');
        localStorage.setItem('agent_notification_volume', settings.notification_volume || '0.5');
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
          <h1 className="text-3xl font-bold tracking-tight">Agent Settings</h1>
          <p className="text-muted-foreground">
            Configure your agent preferences and behavior
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>General Preferences</span>
              </CardTitle>
              <CardDescription>
                Basic agent settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Accept Chats</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically accept incoming chat requests
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('auto_accept_chats', true)}
                    onCheckedChange={(checked) => updateSetting('auto_accept_chats', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Typing Indicators</Label>
                    <p className="text-sm text-muted-foreground">
                      Show when you're typing to customers
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('show_typing_indicators', true)}
                    onCheckedChange={(checked) => updateSetting('show_typing_indicators', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Away Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow setting yourself as away from chats
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('enable_away_mode', true)}
                    onCheckedChange={(checked) => updateSetting('enable_away_mode', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="max_concurrent_chats">Max Concurrent Chats</Label>
                    <Input
                      id="max_concurrent_chats"
                      type="number"
                      value={getSettingValue('max_concurrent_chats', '5')}
                      onChange={(e) => updateSetting('max_concurrent_chats', e.target.value)}
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="response_timeout">Response Timeout (minutes)</Label>
                    <Input
                      id="response_timeout"
                      type="number"
                      value={getSettingValue('response_timeout', '5')}
                      onChange={(e) => updateSetting('response_timeout', e.target.value)}
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
                <span>Security & Authentication</span>
              </CardTitle>
              <CardDescription>
                Configure your security and authentication preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('enable_two_factor', false)}
                    onCheckedChange={(checked) => updateSetting('enable_two_factor', checked.toString())}
                  />
                </div>
                <Separator />
                {/* 2FA Method Selection - shown when 2FA is enabled */}
                {getBooleanValue('enable_two_factor', false) && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium">Choose 2FA Method</h4>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred two-factor authentication method:
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                           onClick={() => updateSetting('two_factor_method', 'email')}>
                        <div className="space-y-1 flex-1">
                          <Label className="cursor-pointer">Email Verification</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive verification codes via email
                          </p>
                        </div>
                        <div className="relative">
                          <div className={`w-4 h-4 border-2 rounded-full ${getSettingValue('two_factor_method', '') === 'email' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                            {getSettingValue('two_factor_method', '') === 'email' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                           onClick={() => updateSetting('two_factor_method', 'google_authenticator')}>
                        <div className="space-y-1 flex-1">
                          <Label className="cursor-pointer">Google Authenticator</Label>
                          <p className="text-sm text-muted-foreground">
                            Use Google Authenticator app for time-based verification codes
                          </p>
                        </div>
                        <div className="relative">
                          <div className={`w-4 h-4 border-2 rounded-full ${getSettingValue('two_factor_method', '') === 'google_authenticator' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                            {getSettingValue('two_factor_method', '') === 'google_authenticator' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />}
                          </div>
                        </div>
                      </div>
                    </div>
                    {getSettingValue('two_factor_method', '') === 'google_authenticator' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          To set up Google Authenticator, you'll need to scan a QR code that will be displayed after saving your settings.
                        </AlertDescription>
                      </Alert>
                    )}
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

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>New Chat Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new chats are assigned to you
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('new_chat_notifications', true)}
                    onCheckedChange={(checked) => updateSetting('new_chat_notifications', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Message Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when customers send messages
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('message_notifications', true)}
                    onCheckedChange={(checked) => updateSetting('message_notifications', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Notification Settings</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Sound Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound when receiving new messages
                      </p>
                    </div>
                    <Switch
                      checked={getBooleanValue('notification_sound_enabled', true)}
                      onCheckedChange={(checked) => updateSetting('notification_sound_enabled', checked.toString())}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="notification_sound">Notification Sound</Label>
                      <Select
                        value={getSettingValue('notification_sound', 'default')}
                        onValueChange={(value) => updateSetting('notification_sound', value)}
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
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Desktop Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show desktop notifications when away from the app
                      </p>
                    </div>
                    <Switch
                      checked={getBooleanValue('desktop_notifications', false)}
                      onCheckedChange={(checked) => updateSetting('desktop_notifications', checked.toString())}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Settings */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Chat Behavior</span>
              </CardTitle>
              <CardDescription>
                Configure how you interact with customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-Reply to Greetings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically respond to common greetings
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('auto_reply_greetings', false)}
                    onCheckedChange={(checked) => updateSetting('auto_reply_greetings', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Mark Messages as Read Automatically</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically mark messages as read when viewing
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('auto_mark_read', true)}
                    onCheckedChange={(checked) => updateSetting('auto_mark_read', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Customer Typing</Label>
                    <p className="text-sm text-muted-foreground">
                      Show when customers are typing messages
                    </p>
                  </div>
                  <Switch
                    checked={getBooleanValue('show_customer_typing', true)}
                    onCheckedChange={(checked) => updateSetting('show_customer_typing', checked.toString())}
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="default_greeting">Default Greeting</Label>
                    <Input
                      id="default_greeting"
                      value={getSettingValue('default_greeting', 'Hello! How can I help you today?')}
                      onChange={(e) => updateSetting('default_greeting', e.target.value)}
                      placeholder="Hello! How can I help you today?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="away_message">Away Message</Label>
                    <Input
                      id="away_message"
                      value={getSettingValue('away_message', 'I\'m currently away. I\'ll get back to you soon!')}
                      onChange={(e) => updateSetting('away_message', e.target.value)}
                      placeholder="I'm currently away. I'll get back to you soon!"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}