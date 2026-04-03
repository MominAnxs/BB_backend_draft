'use client';
import { useState } from 'react';
import { 
  Search, 
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Settings,
  Zap,
  TrendingUp,
  Activity,
  ExternalLink,
  RefreshCw,
  Power,
  X,
  ChevronRight,
  Info,
  Calendar,
  BarChart3,
  Shield,
  Key,
  Download
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';
type IntegrationCategory = 'storage' | 'communication' | 'project-management' | 'analytics' | 'automation';

interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  status: IntegrationStatus;
  icon: string; // emoji or icon identifier
  connectedDate?: string;
  lastSync?: string;
  apiCallsToday: number;
  apiCallsLimit: number;
  errorCount: number;
  permissions: string[];
  webhookUrl?: string;
  isEnabled: boolean;
  connectionHealth: number; // 0-100
}

interface ActivityLog {
  id: string;
  integrationName: string;
  action: string;
  status: 'success' | 'error' | 'warning';
  timestamp: string;
  details: string;
}

export function Integrations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<IntegrationStatus | 'all'>('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActivityLogs, setShowActivityLogs] = useState(false);

  // Sample integrations data
  const [integrations] = useState<Integration[]>([
    {
      id: '3',
      name: 'Google Sheets',
      category: 'analytics',
      description: 'Spreadsheet data sync and analysis',
      status: 'connected',
      icon: '📊',
      connectedDate: '2025-09-20',
      lastSync: '2026-01-16T11:00:00',
      apiCallsToday: 2156,
      apiCallsLimit: 15000,
      errorCount: 0,
      permissions: ['Read spreadsheets', 'Write spreadsheets', 'Create sheets'],
      webhookUrl: 'https://api.brego.com/webhooks/google-sheets',
      isEnabled: true,
      connectionHealth: 100
    },
    {
      id: '5',
      name: 'Google Ads',
      category: 'analytics',
      description: 'Performance marketing campaign management',
      status: 'connected',
      icon: '🎯',
      connectedDate: '2025-09-01',
      lastSync: '2026-01-16T10:50:00',
      apiCallsToday: 1834,
      apiCallsLimit: 15000,
      errorCount: 0,
      permissions: ['Read campaigns', 'Read ads', 'Read metrics', 'Generate reports'],
      webhookUrl: 'https://api.brego.com/webhooks/google-ads',
      isEnabled: true,
      connectionHealth: 97
    },
    {
      id: '6',
      name: 'Meta Ads',
      category: 'analytics',
      description: 'Facebook and Instagram advertising platform',
      status: 'connected',
      icon: '📱',
      connectedDate: '2025-09-15',
      lastSync: '2026-01-16T11:10:00',
      apiCallsToday: 2567,
      apiCallsLimit: 20000,
      errorCount: 0,
      permissions: ['Read ad accounts', 'Read campaigns', 'Read insights', 'Create reports'],
      webhookUrl: 'https://api.brego.com/webhooks/meta-ads',
      isEnabled: true,
      connectionHealth: 94
    },
    {
      id: '7',
      name: 'Shopify',
      category: 'automation',
      description: 'E-commerce platform integration',
      status: 'connected',
      icon: '🛍️',
      connectedDate: '2025-10-20',
      lastSync: '2026-01-16T10:35:00',
      apiCallsToday: 892,
      apiCallsLimit: 10000,
      errorCount: 0,
      permissions: ['Read orders', 'Read products', 'Read customers', 'Manage webhooks'],
      webhookUrl: 'https://api.brego.com/webhooks/shopify',
      isEnabled: true,
      connectionHealth: 100
    },
    {
      id: '8',
      name: 'Google Analytics',
      category: 'analytics',
      description: 'Website and app analytics tracking',
      status: 'connected',
      icon: '📈',
      connectedDate: '2025-07-15',
      lastSync: '2026-01-16T10:45:00',
      apiCallsToday: 456,
      apiCallsLimit: 5000,
      errorCount: 0,
      permissions: ['Read analytics', 'Read reports'],
      isEnabled: true,
      connectionHealth: 100
    },
  ]);

  // Sample activity logs
  const [activityLogs] = useState<ActivityLog[]>([
    {
      id: '1',
      integrationName: 'Google Sheets',
      action: 'Data sync completed',
      status: 'success',
      timestamp: '2026-01-16T11:00:00',
      details: 'Synced 127 rows across 3 spreadsheets'
    },
    {
      id: '5',
      integrationName: 'Zapier',
      action: 'Workflow failed',
      status: 'error',
      timestamp: '2026-01-16T09:30:00',
      details: 'Rate limit exceeded - Retry scheduled'
    },
  ]);

  // Filter integrations
  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = 
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || integration.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats
  const stats = {
    totalIntegrations: integrations.length,
    connectedIntegrations: integrations.filter(i => i.status === 'connected').length,
    errorIntegrations: integrations.filter(i => i.status === 'error').length,
    totalApiCalls: integrations.reduce((sum, i) => sum + i.apiCallsToday, 0),
    avgHealth: Math.round(
      integrations.filter(i => i.status === 'connected').reduce((sum, i) => sum + i.connectionHealth, 0) / 
      integrations.filter(i => i.status === 'connected').length
    ) || 0,
    recentErrors: activityLogs.filter(log => log.status === 'error').length,
  };

  const getStatusColor = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'disconnected':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'disconnected':
        return <XCircle className="w-3 h-3" />;
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      case 'pending':
        return <Clock className="w-3 h-3" />;
    }
  };

  const getCategoryLabel = (category: IntegrationCategory) => {
    const labels = {
      'storage': 'Storage',
      'communication': 'Communication',
      'project-management': 'Project Management',
      'analytics': 'Analytics',
      'automation': 'Automation'
    };
    return labels[category];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-emerald-600';
    if (health >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-black/90">Integrations</h1>
          <p className="text-black/55 text-body mt-1">Manage API connections and monitor integration health</p>
        </div>
        <button 
          onClick={() => setShowActivityLogs(!showActivityLogs)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-black/10 text-black/70 text-caption font-medium rounded-lg hover:bg-black/5 transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          Activity Logs
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Total Integrations</span>
            <Zap className="w-4 h-4 text-black/20" />
          </div>
          <div className="text-h1 font-semibold text-black/90">{stats.totalIntegrations}</div>
          <div className="text-caption text-black/30 mt-1">Available services</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Connected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-h1 font-semibold text-emerald-600">{stats.connectedIntegrations}</div>
          <div className="text-caption text-black/30 mt-1">Active connections</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Errors</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-h1 font-semibold text-red-600">{stats.errorIntegrations}</div>
          <div className="text-caption text-black/30 mt-1">Need attention</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">API Calls Today</span>
            <TrendingUp className="w-4 h-4 text-[#204CC7]/40" />
          </div>
          <div className="text-h1 font-semibold text-[#204CC7]">{stats.totalApiCalls.toLocaleString()}</div>
          <div className="text-caption text-black/30 mt-1">Requests processed</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Avg Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={`text-h1 font-semibold ${getHealthColor(stats.avgHealth)}`}>
            {stats.avgHealth}%
          </div>
          <div className="text-caption text-black/30 mt-1">System uptime</div>
        </div>

        <div className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-black/50 text-caption">Recent Errors</span>
            <XCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-h1 font-semibold text-amber-600">{stats.recentErrors}</div>
          <div className="text-caption text-black/30 mt-1">Last 24 hours</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-black/5 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/55" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-96 pl-8 pr-7 py-2 bg-white border border-black/10 rounded-lg text-caption text-black placeholder-black/40 focus:outline-none focus:border-[#204CC7] focus:ring-2 focus:ring-[#204CC7]/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/55 hover:text-black/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as IntegrationCategory | 'all')}
            className="px-3 py-2 bg-white border border-black/10 text-black/70 text-caption font-medium rounded-lg hover:bg-black/5 transition-colors focus:outline-none focus:border-[#204CC7] focus:ring-2 focus:ring-[#204CC7]/10"
          >
            <option value="all">All Categories</option>
            <option value="storage">Storage</option>
            <option value="communication">Communication</option>
            <option value="project-management">Project Management</option>
            <option value="analytics">Analytics</option>
            <option value="automation">Automation</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as IntegrationStatus | 'all')}
            className="px-3 py-2 bg-white border border-black/10 text-black/70 text-caption font-medium rounded-lg hover:bg-black/5 transition-colors focus:outline-none focus:border-[#204CC7] focus:ring-2 focus:ring-[#204CC7]/10"
          >
            <option value="all">All Status</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected</option>
            <option value="error">Error</option>
            <option value="pending">Pending</option>
          </select>

          {/* Export */}
          <button className="px-3 py-2 bg-white border border-black/10 text-black/70 text-caption font-medium rounded-lg hover:bg-black/5 transition-colors flex items-center gap-1.5 ml-auto">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white border border-black/5 rounded-xl p-5 hover:border-[#204CC7]/20 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => {
              setSelectedIntegration(integration);
              setShowDetailModal(true);
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center text-h1">
                  {integration.icon}
                </div>
                <div>
                  <h3 className="text-body font-semibold text-black/90 group-hover:text-[#204CC7] transition-colors">
                    {integration.name}
                  </h3>
                  <p className="text-caption text-black/55 mt-0.5">{getCategoryLabel(integration.category)}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-black/20 group-hover:text-[#204CC7] transition-colors" />
            </div>

            {/* Description */}
            <p className="text-caption text-black/50 mb-4 line-clamp-2">{integration.description}</p>

            {/* Status Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-caption font-medium border ${getStatusColor(integration.status)}`}>
                {getStatusIcon(integration.status)}
                {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
              </span>
              {integration.status === 'connected' && (
                <div className="flex items-center gap-1">
                  <div className={`text-caption font-semibold ${getHealthColor(integration.connectionHealth)}`}>
                    {integration.connectionHealth}%
                  </div>
                  <Activity className={`w-3 h-3 ${getHealthColor(integration.connectionHealth)}`} />
                </div>
              )}
            </div>

            {/* Stats */}
            {integration.status === 'connected' && (
              <div className="space-y-2 pt-4 border-t border-black/5">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-black/55">Last Sync</span>
                  <span className="text-caption text-black/60">{formatDateTime(integration.lastSync!)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-caption text-black/55">API Calls</span>
                  <span className="text-caption text-black/60">
                    {integration.apiCallsToday.toLocaleString()} / {integration.apiCallsLimit.toLocaleString()}
                  </span>
                </div>
                {integration.errorCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-caption text-black/55">Errors</span>
                    <span className="text-caption text-red-600 font-medium">{integration.errorCount}</span>
                  </div>
                )}
              </div>
            )}

            {/* Disconnected State */}
            {integration.status === 'disconnected' && (
              <div className="pt-4 border-t border-black/5">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle connect logic
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#204CC7] text-white rounded-lg hover:bg-[#1a3da0] transition-all text-caption font-medium"
                >
                  <Power className="w-3.5 h-3.5" />
                  Connect
                </button>
              </div>
            )}

            {/* Error State */}
            {integration.status === 'error' && (
              <div className="pt-4 border-t border-black/5">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle reconnect logic
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-caption font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reconnect
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="bg-white border border-black/5 rounded-xl p-12 text-center">
          <Zap className="w-12 h-12 text-black/10 mx-auto mb-3" />
          <p className="text-black/55 text-body">No integrations found</p>
          <p className="text-black/30 text-caption mt-1">Try adjusting your filters or search query</p>
        </div>
      )}

      {/* Integration Detail Modal */}
      {selectedIntegration && (
        <IntegrationDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedIntegration(null);
          }}
          integration={selectedIntegration}
        />
      )}

      {/* Activity Logs Panel */}
      {showActivityLogs && (
        <ActivityLogsPanel
          logs={activityLogs}
          onClose={() => setShowActivityLogs(false)}
        />
      )}
    </div>
  );
}

// Integration Detail Modal Component
interface IntegrationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration;
}

function IntegrationDetailModal({ isOpen, onClose, integration }: IntegrationDetailModalProps) {
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center text-h1">
              {integration.icon}
            </div>
            <div>
              <DialogTitle>{integration.name}</DialogTitle>
              <DialogDescription>{integration.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Overview */}
          <div className="bg-black/5 rounded-xl p-4">
            <h3 className="text-body font-semibold text-black/90 mb-3">Status Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-caption text-black/50 mb-1">Connection Status</p>
                <p className="text-body font-medium text-black/90 capitalize">{integration.status}</p>
              </div>
              {integration.connectedDate && (
                <div>
                  <p className="text-caption text-black/50 mb-1">Connected Since</p>
                  <p className="text-body font-medium text-black/90">{formatDateTime(integration.connectedDate)}</p>
                </div>
              )}
              {integration.lastSync && (
                <div>
                  <p className="text-caption text-black/50 mb-1">Last Sync</p>
                  <p className="text-body font-medium text-black/90">{formatDateTime(integration.lastSync)}</p>
                </div>
              )}
              {integration.status === 'connected' && (
                <div>
                  <p className="text-caption text-black/50 mb-1">Health Score</p>
                  <p className="text-body font-medium text-emerald-600">{integration.connectionHealth}%</p>
                </div>
              )}
            </div>
          </div>

          {/* API Usage */}
          {integration.status === 'connected' && (
            <div>
              <h3 className="text-body font-semibold text-black/90 mb-3">API Usage (Today)</h3>
              <div className="bg-white border border-black/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-caption text-black/50">
                    {integration.apiCallsToday.toLocaleString()} / {integration.apiCallsLimit.toLocaleString()} calls
                  </span>
                  <span className="text-caption font-medium text-[#204CC7]">
                    {Math.round((integration.apiCallsToday / integration.apiCallsLimit) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-black/5 rounded-full h-2">
                  <div 
                    className="bg-[#204CC7] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((integration.apiCallsToday / integration.apiCallsLimit) * 100, 100)}%` }}
                  />
                </div>
                {integration.errorCount > 0 && (
                  <div className="mt-3 pt-3 border-t border-black/5">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-caption text-red-600 font-medium">
                        {integration.errorCount} errors detected in last 24 hours
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          {integration.permissions.length > 0 && (
            <div>
              <h3 className="text-body font-semibold text-black/90 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-black/55" />
                Permissions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {integration.permissions.map((permission, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-black/5 rounded-lg"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-caption text-black/70">{permission}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Webhook Configuration */}
          {integration.webhookUrl && (
            <div>
              <h3 className="text-body font-semibold text-black/90 mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-black/55" />
                Webhook Configuration
              </h3>
              <div className="bg-black/5 rounded-xl p-3 font-mono text-caption text-black/60 break-all">
                {integration.webhookUrl}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-black/5">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-black/10 text-black/70 rounded-xl hover:bg-black/5 transition-all text-caption font-medium">
              <RefreshCw className="w-3.5 h-3.5" />
              Test Connection
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-black/10 text-black/70 rounded-xl hover:bg-black/5 transition-all text-caption font-medium">
              <Settings className="w-3.5 h-3.5" />
              Configure
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-black/10 text-black/70 rounded-xl hover:bg-black/5 transition-all text-caption font-medium">
              <BarChart3 className="w-3.5 h-3.5" />
              View Analytics
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-4 border-t border-black/5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-black/60 hover:bg-black/5 rounded-xl transition-all"
          >
            Close
          </button>
          <div className="flex gap-3">
            {integration.status === 'connected' && (
              <button className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all flex items-center gap-2">
                <Power className="w-4 h-4" />
                Disconnect
              </button>
            )}
            {integration.status === 'disconnected' && (
              <button className="px-4 py-2.5 bg-[#204CC7] text-white rounded-xl hover:bg-[#1a3da0] transition-all flex items-center gap-2">
                <Power className="w-4 h-4" />
                Connect Now
              </button>
            )}
            {integration.status === 'error' && (
              <button className="px-4 py-2.5 bg-[#204CC7] text-white rounded-xl hover:bg-[#1a3da0] transition-all flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reconnect
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Activity Logs Panel Component
interface ActivityLogsPanelProps {
  logs: ActivityLog[];
  onClose: () => void;
}

function ActivityLogsPanel({ logs, onClose }: ActivityLogsPanelProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'error':
        return <XCircle className="w-3 h-3" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity Logs</DialogTitle>
          <DialogDescription>Recent integration activity and sync history</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {logs.map((log) => (
            <div 
              key={log.id}
              className="bg-white border border-black/5 rounded-xl p-4 hover:border-black/10 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-body font-semibold text-black/90">{log.integrationName}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-caption font-medium border ${getStatusColor(log.status)}`}>
                      {getStatusIcon(log.status)}
                      {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-caption text-black/60 mb-1">{log.action}</p>
                  <p className="text-caption text-black/55">{log.details}</p>
                </div>
                <div className="flex items-center gap-1.5 text-caption text-black/55">
                  <Calendar className="w-3 h-3" />
                  {formatDateTime(log.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-black/5">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-black/60 hover:bg-black/5 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}