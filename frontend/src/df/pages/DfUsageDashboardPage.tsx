import { useState, useEffect } from 'react';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface UsageStats {
  totalApiCalls: number;
  totalConsentsCollected: number;
  totalConsentsRevoked: number;
  totalErasureRequests: number;
  avgResponseTimeMs: number;
}

interface DailySummary {
  day: string;
  eventType: string;
  eventCount: number;
  avgResponseMs: number;
  maxResponseMs: number;
}

interface RecentEvent {
  eventId: string;
  eventType: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  createdAt: string;
}

const STAT_CARDS = [
  { key: 'totalApiCalls', label: 'Total API Calls', icon: '📡', color: 'bg-blue-50 text-blue-700' },
  { key: 'totalConsentsCollected', label: 'Consents Collected', icon: '✅', color: 'bg-green-50 text-green-700' },
  { key: 'totalConsentsRevoked', label: 'Consents Revoked', icon: '❌', color: 'bg-red-50 text-red-700' },
  { key: 'totalErasureRequests', label: 'Erasure Requests', icon: '🗑️', color: 'bg-orange-50 text-orange-700' },
] as const;

export function DfUsageDashboardPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [days, setDays] = useState(30);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, summaryRes, eventsRes] = await Promise.all([
        apiClient.get(`/api/v1/admin/usage/stats?days=${days}`),
        apiClient.get(`/api/v1/admin/usage/summary`),
        apiClient.get(`/api/v1/admin/usage/events?limit=20`),
      ]);
      setStats(statsRes.data.data || null);
      setDailySummary(summaryRes.data.data || []);
      setRecentEvents(eventsRes.data.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  };

  const statusColor = (code: number) => {
    if (code < 300) return 'text-green-600';
    if (code < 400) return 'text-yellow-600';
    return 'text-red-600';
  };

  const methodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-100 text-blue-700',
      POST: 'bg-green-100 text-green-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      PATCH: 'bg-orange-100 text-orange-700',
      DELETE: 'bg-red-100 text-red-700',
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading usage analytics..." />;
  if (error) return <ErrorMessage error={error} retry={fetchData} fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage & Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor API usage, performance, and billing metrics</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="input text-sm">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon, color }) => (
            <div key={key} className="card p-4">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-2 ${color}`}>
                {icon} {label}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber((stats[key as keyof UsageStats] as number) ?? 0)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Avg Response Time</h3>
            <div className="text-3xl font-bold text-gray-900">
              {stats.avgResponseTimeMs ? `${Math.round(stats.avgResponseTimeMs)}ms` : 'N/A'}
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(((stats.avgResponseTimeMs || 0) / 1000) * 100, 100)}%`,
                    backgroundColor: (stats.avgResponseTimeMs || 0) < 200 ? '#10B981' : (stats.avgResponseTimeMs || 0) < 500 ? '#F59E0B' : '#EF4444',
                  }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0ms</span><span>1000ms</span>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Total Events</h3>
            <div className="text-3xl font-bold text-blue-600">
              {formatNumber(stats.totalApiCalls)}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              API calls tracked in the selected period
            </p>
          </div>
        </div>
      )}

      {/* Daily Summary Table */}
      {dailySummary.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Daily Summary</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Response</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Response</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailySummary.slice(0, 20).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-900">{new Date(row.day).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{row.eventType}</code>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">{row.eventCount}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{Math.round(row.avgResponseMs)}ms</td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {Math.round(row.maxResponseMs)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Events */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Recent API Events</h3>
        </div>
        {recentEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No events recorded yet</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentEvents.map((event) => (
                <tr key={event.eventId} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(event.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${methodColor(event.method)}`}>
                      {event.method}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-700 font-mono max-w-xs truncate">{event.endpoint}</td>
                  <td className={`px-6 py-3 text-sm font-medium ${statusColor(event.statusCode)}`}>
                    {event.statusCode}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{event.responseTimeMs}ms</td>
                  <td className="px-6 py-3">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-[10px]">{event.eventType}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
