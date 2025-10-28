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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bot, 
  Save, 
  Eye,
  Palette,
  Settings,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  Upload,
  Image,
  Code,
  Monitor,
  Smartphone,
  Globe,
  Zap,
  Shield,
  Clock,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api';
import { WidgetSetting } from '@/types';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

export default function WidgetSettingsPage() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<WidgetSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('appearance');
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    fetchWidgetSettings();
  }, []);

  const fetchWidgetSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getWidgetSettings();
      
      if (response.success) {
        setSettings(response.data);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch widget settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await apiClient.updateWidgetSettings(settings);
      
      if (response.success) {
        toast.success('Widget settings saved successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save widget settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof WidgetSetting, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? ({
      ...prev,
      [key]: value,
    }) : null);
  };

  const copyEmbedCode = () => {
    const tenantId = user?.tenant_id || 'YOUR_TENANT_ID';
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${backendUrl}/widget/nxchat-widget.js';
    script.setAttribute('data-tenant-id', '${tenantId}');
    document.head.appendChild(script);
  })();
</script>`;
    
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Embed code copied to clipboard');
    });
  };

  if (loading) {
    return <LoadingSpinner text="Loading widget settings..." />;
  }

  if (error) {
    return (
      <EmptyState
        icon={Bot}
        title="Failed to load widget settings"
        description={error}
        action={{
          label: 'Retry',
          onClick: fetchWidgetSettings,
        }}
      />
    );
  }

  if (!settings) {
    return (
      <EmptyState
        icon={Bot}
        title="No widget settings found"
        description="Widget settings could not be loaded"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widget Settings</h1>
          <p className="text-muted-foreground">
            Customize your chat widget appearance and behavior
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/public/widget-test.html`, '_blank')}>
            <Eye className="w-4 h-4 mr-2" />
            Test Widget
          </Button>
          <Button variant="outline" onClick={copyEmbedCode}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Embed Code
              </>
            )}
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="custom">Custom Code</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Appearance Settings</span>
                </CardTitle>
                <CardDescription>
                  Customize the visual appearance of your chat widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme_color">Theme Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="theme_color"
                      type="color"
                      value={settings.theme_color}
                      onChange={(e) => updateSetting('theme_color', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={settings.theme_color}
                      onChange={(e) => updateSetting('theme_color', e.target.value)}
                      placeholder="#007bff"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={settings.position}
                    onValueChange={(value) => updateSetting('position', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL (Optional)</Label>
                  <Input
                    id="logo_url"
                    value={settings.logo_url || ''}
                    onChange={(e) => updateSetting('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-sm text-muted-foreground">
                    Add your company logo to the widget
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Messages</span>
                </CardTitle>
                <CardDescription>
                  Customize the messages shown to your customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="welcome_message">Welcome Message</Label>
                  <Textarea
                    id="welcome_message"
                    value={settings.welcome_message}
                    onChange={(e) => updateSetting('welcome_message', e.target.value)}
                    placeholder="Hello! How can we help you today?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offline_message">Offline Message</Label>
                  <Textarea
                    id="offline_message"
                    value={settings.offline_message}
                    onChange={(e) => updateSetting('offline_message', e.target.value)}
                    placeholder="We are currently offline. Please leave a message and we will get back to you soon."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Live Preview</span>
              </CardTitle>
              <CardDescription>
                See how your widget will look on different devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Desktop
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    Mobile
                  </Button>
                </div>
                <div className={`border rounded-lg p-4 bg-muted/50 ${previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''}`}>
                  <div className="text-center text-sm text-muted-foreground mb-4">
                    Widget Preview ({previewMode})
                  </div>
                  <div className="relative">
                    <div 
                      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-white shadow-lg`}
                      style={{ backgroundColor: settings.theme_color }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-sm font-medium">Chat with us</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      Position: {settings.position}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behavior Settings */}
        <TabsContent value="behavior" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Behavior Settings</span>
              </CardTitle>
              <CardDescription>
                Configure how the widget behaves and what features are enabled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Audio</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow voice messages and audio calls
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_audio}
                    onCheckedChange={(checked) => updateSetting('enable_audio', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable Video</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow video calls and screen sharing
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_video}
                    onCheckedChange={(checked) => updateSetting('enable_video', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Enable File Upload</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow customers to upload files and images
                    </p>
                  </div>
                  <Switch
                    checked={settings.enable_file_upload}
                    onCheckedChange={(checked) => updateSetting('enable_file_upload', checked)}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="auto_transfer_keywords">Auto Transfer Keywords</Label>
                  <Input
                    id="auto_transfer_keywords"
                    value={settings.auto_transfer_keywords.join(', ')}
                    onChange={(e) => updateSetting('auto_transfer_keywords', e.target.value.split(',').map(k => k.trim()))}
                    placeholder="speak to human, agent, representative"
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated keywords that trigger automatic transfer to human agents
                  </p>
                </div>
              </div>
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
                Configure AI chatbot behavior and personality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>AI Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable AI chatbot for automated responses
                    </p>
                  </div>
                  <Switch
                    checked={settings.ai_enabled}
                    onCheckedChange={(checked) => updateSetting('ai_enabled', checked)}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="ai_personality">AI Personality</Label>
                  <Select
                    value={settings.ai_personality}
                    onValueChange={(value) => updateSetting('ai_personality', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Code */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>Custom Code</span>
              </CardTitle>
              <CardDescription>
                Add custom CSS and JavaScript to further customize your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_css">Custom CSS</Label>
                  <Textarea
                    id="custom_css"
                    value={settings.custom_css || ''}
                    onChange={(e) => updateSetting('custom_css', e.target.value)}
                    placeholder="/* Add your custom CSS here */
.nxchat-widget {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}"
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    Add custom CSS to style your widget. Use <code className="bg-muted px-1 rounded">.nxchat-widget</code> as the main selector.
                  </p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="custom_js">Custom JavaScript</Label>
                  <Textarea
                    id="custom_js"
                    value={settings.custom_js || ''}
                    onChange={(e) => updateSetting('custom_js', e.target.value)}
                    placeholder="// Add your custom JavaScript here
document.addEventListener('nxchat-widget-loaded', function() {
  console.log('Widget loaded successfully');
});"
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-muted-foreground">
                    Add custom JavaScript for advanced functionality. The widget will fire events you can listen to.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Embed Code */}
        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Embed Code</span>
              </CardTitle>
              <CardDescription>
                Add this code to your website to display the chat widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>JavaScript Embed Code</Label>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{`<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/widget/nxchat-widget.js';
    script.setAttribute('data-tenant-id', '${user?.tenant_id || 'YOUR_TENANT_ID'}');
    document.head.appendChild(script);
  })();
</script>`}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={copyEmbedCode}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>HTML Embed Code</Label>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{`<div id="nxchat-widget" data-tenant-id="${user?.tenant_id || 'YOUR_TENANT_ID'}"></div>
<script src="${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/widget/nxchat-widget.js"></script>`}</code>
                    </pre>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Instructions:</h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Copy the embed code above (your tenant ID is already included)</li>
                    <li>Add the code to your website's HTML, preferably before the closing <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">&lt;/body&gt;</code> tag</li>
                    <li>The widget will automatically appear on your website</li>
                    <li>Customize the appearance and behavior using the settings above</li>
                    <li>Test the widget on your live website to ensure it's working correctly</li>
                    <li><strong>Note:</strong> The widget JavaScript is served from your backend server (port 3001), not the frontend</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
