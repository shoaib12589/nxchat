'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Key, Users, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Brand, User, WidgetKey } from '@/types';
import AssignAgentsDialog from './AssignAgentsDialog';

interface BrandDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
}

export default function BrandDetailsDialog({ open, onOpenChange, brand }: BrandDetailsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [brandDetails, setBrandDetails] = useState<Brand | null>(null);
  const [availableAgents, setAvailableAgents] = useState<User[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  useEffect(() => {
    if (open && brand) {
      fetchBrandDetails();
      fetchAvailableAgents();
    }
  }, [open, brand]);

  const fetchBrandDetails = async () => {
    if (!brand) return;

    try {
      setLoading(true);
      const response = await apiClient.getBrand(brand.id);
      
      if (response.success) {
        setBrandDetails(response.data);
      } else {
        toast.error(response.message || 'Failed to fetch brand details');
      }
    } catch (error) {
      console.error('Error fetching brand details:', error);
      toast.error('Failed to fetch brand details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAgents = async () => {
    try {
      const response = await apiClient.getAvailableAgents();
      
      if (response.success) {
        setAvailableAgents(response.data || []);
      } else {
        toast.error(response.message || 'Failed to fetch available agents');
      }
    } catch (error) {
      console.error('Error fetching available agents:', error);
      toast.error('Failed to fetch available agents');
    }
  };

  const handleGenerateWidgetKey = async () => {
    if (!brandDetails) return;

    try {
      const response = await apiClient.generateBrandWidgetKey(brandDetails.id);
      
      if (response.success) {
        toast.success('New widget key generated successfully');
        fetchBrandDetails();
      } else {
        toast.error(response.message || 'Failed to generate widget key');
      }
    } catch (error) {
      console.error('Error generating widget key:', error);
      toast.error('Failed to generate widget key');
    }
  };

  const handleCopyWidgetCode = (widgetKey: WidgetKey) => {
    const widgetCode = `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${window.location.origin}/widget/snippet.js?key=${widgetKey.key}';
  document.head.appendChild(script);
})();
</script>`;
    
    navigator.clipboard.writeText(widgetCode).then(() => {
      toast.success('Widget code copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy widget code');
    });
  };

  const handleAssignAgents = () => {
    setAssignDialogOpen(true);
  };

  const handleAgentsAssigned = () => {
    fetchBrandDetails();
    setAssignDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!brand || !brandDetails) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {brandDetails.logo ? (
                <img
                  src={brandDetails.logo}
                  alt={brandDetails.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: brandDetails.primary_color }}
                >
                  {brandDetails.name.charAt(0).toUpperCase()}
                </div>
              )}
              {brandDetails.name}
              <Badge className={getStatusColor(brandDetails.status)}>
                {brandDetails.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {brandDetails.description || 'No description provided'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="widget-keys">Widget Keys</TabsTrigger>
              <TabsTrigger value="agents">Assigned Agents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Primary Color</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: brandDetails.primary_color }}
                      ></div>
                      <span className="text-sm font-mono">{brandDetails.primary_color}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Secondary Color</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: brandDetails.secondary_color }}
                      ></div>
                      <span className="text-sm font-mono">{brandDetails.secondary_color}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Brand Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{brandDetails.widgetKeys?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Widget Keys</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{brandDetails.agents?.length || 0}</div>
                      <div className="text-sm text-muted-foreground">Assigned Agents</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="widget-keys" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Widget Keys</h3>
                <Button onClick={handleGenerateWidgetKey} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Key
                </Button>
              </div>

              {brandDetails.widgetKeys && brandDetails.widgetKeys.length > 0 ? (
                <div className="space-y-3">
                  {brandDetails.widgetKeys.map((widgetKey) => (
                    <Card key={widgetKey.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-mono text-sm">{widgetKey.key}</div>
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(widgetKey.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={widgetKey.is_active ? 'default' : 'secondary'}>
                              {widgetKey.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyWidgetCode(widgetKey)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Code
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Widget Keys</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate your first widget key to start using this brand.
                    </p>
                    <Button onClick={handleGenerateWidgetKey}>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Widget Key
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="agents" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Assigned Agents</h3>
                <Button onClick={handleAssignAgents} size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Assign Agents
                </Button>
              </div>

              {brandDetails.agents && brandDetails.agents.length > 0 ? (
                <div className="space-y-3">
                  {brandDetails.agents.map((agent) => (
                    <Card key={agent.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {agent.avatar ? (
                              <img
                                src={agent.avatar}
                                alt={agent.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-semibold">
                                  {agent.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-semibold">{agent.name}</div>
                              <div className="text-sm text-muted-foreground">{agent.email}</div>
                            </div>
                          </div>
                          <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                            {agent.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Assigned Agents</h3>
                    <p className="text-muted-foreground mb-4">
                      Assign agents to this brand to handle incoming chats.
                    </p>
                    <Button onClick={handleAssignAgents}>
                      <Users className="h-4 w-4 mr-2" />
                      Assign Agents
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AssignAgentsDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        brand={brandDetails}
        availableAgents={availableAgents}
        onAgentsAssigned={handleAgentsAssigned}
      />
    </>
  );
}
