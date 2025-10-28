'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft,
  Save, 
  Palette,
  Settings,
  MessageSquare,
  Loader2,
  Copy,
  Check,
  Bot,
  Users,
  Tag,
  Code
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import { Brand, User, WidgetSetting } from '@/types';

export default function BrandSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.id as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSetting | null>(null);
  const [availableAgents, setAvailableAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (brandId) {
      fetchBrandData();
    }
  }, [brandId]);

  const fetchBrandData = async () => {
    try {
      setLoading(true);
      
      // Fetch brand details
      const brandResponse = await apiClient.getBrand(parseInt(brandId));
      if (brandResponse.success) {
        setBrand(brandResponse.data);
      }

      // Fetch widget settings for this brand
      const settingsResponse = await apiClient.getWidgetSettings();
      if (settingsResponse.success) {
        setWidgetSettings(settingsResponse.data);
      }

      // Fetch available agents
      const agentsResponse = await apiClient.getAvailableAgents();
      if (agentsResponse.success) {
        setAvailableAgents(agentsResponse.data);
      }

    } catch (error) {
      console.error('Error fetching brand data:', error);
      toast.error('Failed to load brand data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!brand) return;

    try {
      setSaving(true);
      const response = await apiClient.updateBrand(brand.id, {
        name: brand.name,
        description: brand.description,
        logo: brand.logo,
        primary_color: brand.primary_color,
        secondary_color: brand.secondary_color,
        status: brand.status
      });
      
      if (response.success) {
        toast.success('Brand updated successfully');
      } else {
        toast.error(response.message || 'Failed to update brand');
      }
    } catch (error) {
      console.error('Error updating brand:', error);
      toast.error('Failed to update brand');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWidgetSettings = async () => {
    if (!widgetSettings) return;

    try {
      setSaving(true);
      const response = await apiClient.updateWidgetSettings(widgetSettings);
      
      if (response.success) {
        toast.success('Widget settings saved successfully');
      } else {
        toast.error(response.message || 'Failed to save widget settings');
      }
    } catch (error) {
      console.error('Error saving widget settings:', error);
      toast.error('Failed to save widget settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignAgents = async (agentIds: number[]) => {
    if (!brand) return;

    try {
      const response = await apiClient.assignAgentsToBrand(brand.id, agentIds);
      
      if (response.success) {
        toast.success('Agents assigned successfully');
        fetchBrandData(); // Refresh brand data
      } else {
        toast.error(response.message || 'Failed to assign agents');
      }
    } catch (error) {
      console.error('Error assigning agents:', error);
      toast.error('Failed to assign agents');
    }
  };

  const updateBrandSetting = (key: keyof Brand, value: any) => {
    if (!brand) return;
    setBrand(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const updateWidgetSetting = (key: keyof WidgetSetting, value: any) => {
    if (!widgetSettings) return;
    setWidgetSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const copyEmbedCode = () => {
    if (!brand) return;
    
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const brandKey = brand.widgetKeys?.[0]?.key;
    
    if (!brandKey) {
      toast.error('No widget key found for this brand');
      return;
    }
    
    const embedCode = `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${backendUrl}/widget/snippet.js?key=${brandKey}';
  document.head.appendChild(script);
})();
</script>`;
    
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Embed code copied to clipboard');
    });
  };

  const formatRole = (role: string | undefined | null): string => {
    if (!role || typeof role !== 'string') return 'Unknown';
    return role.replace('_', ' ');
  };

  if (loading) {
    return <LoadingSpinner text="Loading brand settings..." />;
  }

  if (!brand) {
    return (
      <EmptyState
        icon={Tag}
        title="Brand not found"
        description="The requested brand could not be found"
        action={{
          label: 'Back to Brands',
          onClick: () => router.push('/company/brands'),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/company/brands')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Brands
          </Button>
          <div className="flex items-center gap-3">
            {brand.logo ? (
              <img
                src={brand.logo}
                alt={brand.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                style={{ backgroundColor: brand.primary_color }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{brand.name}</h1>
              <p className="text-muted-foreground">
                Brand settings and widget configuration
              </p>
            </div>
            <Badge className={brand.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {brand.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
          <Button onClick={handleSaveBrand} disabled={saving}>
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
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Brand Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="w-5 h-5" />
                  <span>Brand Information</span>
                </CardTitle>
                <CardDescription>
                  Basic brand information and visual identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="brand_name">Brand Name</Label>
                  <Input
                    id="brand_name"
                    value={brand.name}
                    onChange={(e) => updateBrandSetting('name', e.target.value)}
                    placeholder="Enter brand name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_description">Description</Label>
                  <Textarea
                    id="brand_description"
                    value={brand.description || ''}
                    onChange={(e) => updateBrandSetting('description', e.target.value)}
                    placeholder="Enter brand description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_logo">Logo URL</Label>
                  <Input
                    id="brand_logo"
                    value={brand.logo || ''}
                    onChange={(e) => updateBrandSetting('logo', e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={brand.primary_color}
                        onChange={(e) => updateBrandSetting('primary_color', e.target.value)}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={brand.primary_color}
                        onChange={(e) => updateBrandSetting('primary_color', e.target.value)}
                        placeholder="#007bff"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={brand.secondary_color}
                        onChange={(e) => updateBrandSetting('secondary_color', e.target.value)}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={brand.secondary_color}
                        onChange={(e) => updateBrandSetting('secondary_color', e.target.value)}
                        placeholder="#6c757d"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_status">Status</Label>
                  <Select
                    value={brand.status}
                    onValueChange={(value: 'active' | 'inactive') => updateBrandSetting('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Widget Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Widget Appearance</span>
                </CardTitle>
                <CardDescription>
                  Customize the visual appearance of your chat widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {widgetSettings && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="theme_color">Theme Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="theme_color"
                          type="color"
                          value={widgetSettings.theme_color}
                          onChange={(e) => updateWidgetSetting('theme_color', e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={widgetSettings.theme_color}
                          onChange={(e) => updateWidgetSetting('theme_color', e.target.value)}
                          placeholder="#007bff"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Select
                        value={widgetSettings.position}
                        onValueChange={(value) => updateWidgetSetting('position', value)}
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
                      <Label htmlFor="logo_url">Widget Logo URL</Label>
                      <Input
                        id="logo_url"
                        value={widgetSettings.logo_url || ''}
                        onChange={(e) => updateWidgetSetting('logo_url', e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Behavior Settings */}
        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {widgetSettings && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="welcome_message">Welcome Message</Label>
                      <Textarea
                        id="welcome_message"
                        value={widgetSettings.welcome_message}
                        onChange={(e) => updateWidgetSetting('welcome_message', e.target.value)}
                        placeholder="Hello! How can we help you today?"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="offline_message">Offline Message</Label>
                      <Textarea
                        id="offline_message"
                        value={widgetSettings.offline_message}
                        onChange={(e) => updateWidgetSetting('offline_message', e.target.value)}
                        placeholder="We are currently offline. Please leave a message and we will get back to you soon."
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Features</span>
                </CardTitle>
                <CardDescription>
                  Enable or disable widget features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {widgetSettings && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Audio</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow voice messages and calls
                        </p>
                      </div>
                      <Switch
                        checked={widgetSettings.enable_audio}
                        onCheckedChange={(checked) => updateWidgetSetting('enable_audio', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Video</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow video calls
                        </p>
                      </div>
                      <Switch
                        checked={widgetSettings.enable_video}
                        onCheckedChange={(checked) => updateWidgetSetting('enable_video', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable File Upload</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow customers to upload files
                        </p>
                      </div>
                      <Switch
                        checked={widgetSettings.enable_file_upload}
                        onCheckedChange={(checked) => updateWidgetSetting('enable_file_upload', checked)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Settings */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <span>AI Assistant Settings</span>
              </CardTitle>
              <CardDescription>
                Configure AI behavior and responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {widgetSettings && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable AI</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable AI assistant for automatic responses
                      </p>
                    </div>
                    <Switch
                      checked={widgetSettings.ai_enabled}
                      onCheckedChange={(checked) => updateWidgetSetting('ai_enabled', checked)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ai_personality">AI Personality</Label>
                    <Textarea
                      id="ai_personality"
                      value={widgetSettings.ai_personality}
                      onChange={(e) => updateWidgetSetting('ai_personality', e.target.value)}
                      placeholder="You are a helpful customer service assistant..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auto_transfer_keywords">Auto Transfer Keywords</Label>
                    <Textarea
                      id="auto_transfer_keywords"
                      value={widgetSettings.auto_transfer_keywords?.join(', ') || ''}
                      onChange={(e) => updateWidgetSetting('auto_transfer_keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                      placeholder="urgent, billing, complaint"
                      rows={2}
                    />
                    <p className="text-sm text-muted-foreground">
                      Keywords that trigger automatic transfer to human agents
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents */}
        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Assigned Agents</span>
              </CardTitle>
              <CardDescription>
                Select which agents should handle chats from this brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableAgents.map((agent) => (
                  <div key={agent.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`agent-${agent.id}`}
                      checked={brand.agents?.some(a => a.id === agent.id) || false}
                      onCheckedChange={(checked) => {
                        const currentAgentIds = brand.agents?.map(a => a.id) || [];
                        const newAgentIds = checked 
                          ? [...currentAgentIds, agent.id]
                          : currentAgentIds.filter(id => id !== agent.id);
                        handleAssignAgents(newAgentIds);
                      }}
                    />
                    <div className="flex items-center gap-3 flex-1">
                      {agent.avatar ? (
                        <img
                          src={agent.avatar}
                          alt={agent.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-semibold">
                            {agent.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">{agent.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {formatRole(agent.role)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Embed Code */}
        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="w-5 h-5" />
                <span>Widget Embed Code</span>
              </CardTitle>
              <CardDescription>
                Copy and paste this code into your website to display the chat widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <Textarea
                  value={brand.widgetKeys?.[0]?.key ? `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/widget/snippet.js?key=${brand.widgetKeys[0].key}';
  document.head.appendChild(script);
})();
</script>` : 'No widget key available'}
                  readOnly
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Place this code before the closing &lt;/body&gt; tag on your website
                </p>
                <Button onClick={copyEmbedCode}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
