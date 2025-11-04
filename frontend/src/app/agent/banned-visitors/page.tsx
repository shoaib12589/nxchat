'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ShieldOff, 
  Search, 
  RefreshCw,
  MapPin,
  Calendar, 
  Clock, 
  User,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

interface BannedIP {
  id: number;
  ip_address: string;
  tenant_id: number;
  banned_by: number;
  bannedBy?: {
    id: number;
    name: string;
    email: string;
  };
  reason?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const BannedVisitorsPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unbanningId, setUnbanningId] = useState<number | null>(null);

  const fetchBannedIPs = useCallback(async () => {
    try {
      if (refreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiClient.getBannedIPs();
      
      if (response.success) {
        setBannedIPs(response.data || []);
      } else {
        toast.error(response.message || 'Failed to fetch banned visitors');
      }
    } catch (error: any) {
      console.error('Error fetching banned IPs:', error);
      toast.error(error.message || 'Failed to fetch banned visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchBannedIPs();
  }, [fetchBannedIPs]);

  const handleRefresh = () => {
    fetchBannedIPs();
  };

  const handleUnban = async (bannedIP: BannedIP) => {
    try {
      const confirmed = window.confirm(
        `Are you sure you want to unban IP address ${bannedIP.ip_address}?\n\nThis will restore access to the chat widget for visitors from this IP address.`
      );
      
      if (!confirmed) return;

      setUnbanningId(bannedIP.id);
      
      const response = await apiClient.unbanIP(bannedIP.id);
      
      if (response.success) {
        toast.success('IP address unbanned successfully');
        // Remove from list
        setBannedIPs(prev => prev.filter(bip => bip.id !== bannedIP.id));
      } else {
        toast.error(response.message || 'Failed to unban IP address');
      }
    } catch (error: any) {
      console.error('Error unbanning IP:', error);
      toast.error(error.response?.data?.message || 'Failed to unban IP address');
    } finally {
      setUnbanningId(null);
    }
  };

  // Filter banned IPs based on search term
  const filteredBannedIPs = bannedIPs.filter(bip => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      bip.ip_address.toLowerCase().includes(search) ||
      bip.reason?.toLowerCase().includes(search) ||
      bip.bannedBy?.name.toLowerCase().includes(search) ||
      bip.bannedBy?.email.toLowerCase().includes(search)
    );
  });

  if (loading && !refreshing) {
    return <LoadingSpinner text="Loading banned visitors..." />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldOff className="w-8 h-8 text-red-600" />
            Banned Visitors
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage IP addresses that have been banned from accessing the chat widget
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by IP address, reason, or agent name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Banned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bannedIPs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active bans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Filtered Results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredBannedIPs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Matching search</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Bans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bannedIPs.filter(bip => bip.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently enforced</p>
          </CardContent>
        </Card>
      </div>

      {/* Banned IPs List */}
      {filteredBannedIPs.length === 0 ? (
        <EmptyState
          icon={ShieldOff}
          title="No banned visitors found"
          description={
            searchTerm
              ? "No banned IP addresses match your search criteria."
              : "No IP addresses have been banned yet."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredBannedIPs.map((bannedIP) => (
            <Card key={bannedIP.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <ShieldOff className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{bannedIP.ip_address}</h3>
                          {bannedIP.is_active && (
                            <Badge variant="destructive">Active</Badge>
                          )}
                        </div>
                        {bannedIP.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {bannedIP.reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>
                          Banned by: <strong>{bannedIP.bannedBy?.name || 'Unknown'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Banned on: <strong>{new Date(bannedIP.created_at).toLocaleDateString()}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(bannedIP.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    <Button
                      onClick={() => handleUnban(bannedIP)}
                      variant="outline"
                      disabled={unbanningId === bannedIP.id}
                      className="flex items-center gap-2"
                    >
                      {unbanningId === bannedIP.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Unbanning...
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4" />
                          Unban
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BannedVisitorsPage;

