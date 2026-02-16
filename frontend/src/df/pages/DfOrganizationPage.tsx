import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface Organization {
  orgId: string;
  name: string;
  slug: string;
  displayName: string | null;
  domain: string | null;
  plan: string;
  status: string;
  settings: Record<string, unknown>;
  maxApiKeys: number;
  maxUsers: number;
  createdAt: string;
  updatedAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800',
  starter: 'bg-blue-100 text-blue-800',
  professional: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-indigo-100 text-indigo-800',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  deactivated: 'bg-red-100 text-red-800',
};

export function DfOrganizationPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState('free');

  const fetchOrgs = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/v1/admin/organizations');
      setOrgs(data.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiClient.post('/api/v1/admin/organizations', {
        name,
        slug,
        displayName: displayName || undefined,
        domain: domain || undefined,
        plan,
      });
      toast.success('Organization created successfully');
      setShowForm(false);
      setName('');
      setSlug('');
      setDisplayName('');
      setDomain('');
      setPlan('free');
      fetchOrgs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusToggle = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiClient.patch(`/api/v1/admin/organizations/${orgId}`, { status: newStatus });
      toast.success(`Organization ${newStatus}`);
      fetchOrgs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update organization');
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading organizations..." />;
  if (error) return <ErrorMessage error={error} retry={fetchOrgs} fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage tenant organizations and their settings
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Organization'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Create Organization</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Acme Corporation" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input type="text" value={slug} onChange={e => setSlug(e.target.value)} required
                  placeholder="acme-corp" pattern="[a-z0-9]+(-[a-z0-9]+)*" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Acme Corp" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
                  placeholder="acme.com" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={plan} onChange={e => setPlan(e.target.value)} className="input w-full">
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🏢</div>
          <h3 className="text-lg font-medium text-gray-900">No organizations</h3>
          <p className="text-sm text-gray-500 mt-1">Create your first organization to enable multi-tenancy.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orgs.map((org) => (
                <tr key={org.orgId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{org.name}</div>
                    {org.domain && <div className="text-xs text-gray-500">{org.domain}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{org.slug}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[org.plan]}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[org.status]}`}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {org.maxApiKeys} keys / {org.maxUsers} users
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button onClick={() => handleStatusToggle(org.orgId, org.status)}
                      className={`font-medium ${org.status === 'active' ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}>
                      {org.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
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
