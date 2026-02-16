import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface ApiKey {
  keyId: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

const AVAILABLE_SCOPES = [
  'consent:read', 'consent:write', 'consent:revoke',
  'processing:validate',
  'audit:read',
  'erasure:read', 'erasure:manage',
  'correction:read', 'correction:manage',
  'purpose:read', 'purpose:manage',
  'processor:read', 'processor:manage',
  'webhook:manage',
  'notice:read', 'notice:manage',
];

export function DfApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['consent:read', 'consent:write']);
  const [rateLimit, setRateLimit] = useState(1000);
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('');

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/v1/api-keys');
      setKeys(data.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scopes.length === 0) {
      toast.error('Select at least one scope');
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = { name, scopes, rateLimit };
      if (expiresInDays) {
        const exp = new Date();
        exp.setDate(exp.getDate() + Number(expiresInDays));
        body.expiresAt = exp.toISOString();
      }
      const { data } = await apiClient.post('/api/v1/api-keys', body);
      setNewRawKey(data.data?.rawKey || null);
      toast.success('API key created — copy it now, it won\'t be shown again!');
      setShowForm(false);
      setName('');
      setScopes(['consent:read', 'consent:write']);
      setRateLimit(1000);
      setExpiresInDays('');
      fetchKeys();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Revoke this API key? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/api/v1/api-keys/${keyId}`);
      toast.success('API key revoked');
      fetchKeys();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to revoke API key');
    }
  };

  const toggleScope = (scope: string) => {
    setScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  const copyKey = () => {
    if (newRawKey) {
      navigator.clipboard.writeText(newRawKey);
      toast.success('API key copied to clipboard');
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading API keys..." />;
  if (error) return <ErrorMessage error={error} retry={fetchKeys} fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys for SDK and programmatic access
          </p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setNewRawKey(null); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          {showForm ? 'Cancel' : '+ New API Key'}
        </button>
      </div>

      {/* Raw key display banner */}
      {newRawKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-800 font-semibold text-sm">⚠️ Copy your API key now!</span>
            <span className="text-yellow-600 text-xs">It will not be shown again.</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-yellow-100 px-3 py-2 rounded text-xs font-mono break-all">{newRawKey}</code>
            <button onClick={copyKey}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-xs font-medium whitespace-nowrap">
              Copy
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Create API Key</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Production SDK Key" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (req/hr)</label>
                <input type="number" value={rateLimit} onChange={e => setRateLimit(Number(e.target.value))}
                  min={10} max={100000} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires In (days)</label>
                <input type="number" value={expiresInDays} onChange={e => setExpiresInDays(e.target.value ? Number(e.target.value) : '')}
                  min={1} max={365} placeholder="Never" className="input w-full" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {AVAILABLE_SCOPES.map(scope => (
                  <label key={scope} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <code className="text-gray-700">{scope}</code>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {creating ? 'Creating...' : 'Create API Key'}
              </button>
            </div>
          </form>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🔑</div>
          <h3 className="text-lg font-medium text-gray-900">No API keys</h3>
          <p className="text-sm text-gray-500 mt-1">Create an API key to enable SDK integration.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Prefix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scopes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {keys.map((key) => (
                <tr key={key.keyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{key.name}</div>
                    <div className="text-xs text-gray-500">{key.rateLimit} req/hr</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{key.keyPrefix}...</code>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {key.scopes.slice(0, 3).map(s => (
                        <span key={s} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{s}</span>
                      ))}
                      {key.scopes.length > 3 && (
                        <span className="text-gray-400 text-[10px]">+{key.scopes.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {key.isActive ? 'Active' : 'Revoked'}
                    </span>
                    {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                      <span className="ml-1 text-xs text-red-500">Expired</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {key.isActive && (
                      <button onClick={() => handleRevoke(key.keyId)}
                        className="text-red-600 hover:text-red-800 font-medium">Revoke</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
