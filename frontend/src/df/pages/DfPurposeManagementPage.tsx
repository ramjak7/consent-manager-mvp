import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface Purpose {
  purposeId: string;
  code: string;
  version: number;
  name: string;
  description: string;
  legalBasis: string;
  dataCategories: string[];
  isActive: boolean;
  retentionDays: number;
  createdAt: string;
}

export function DfPurposeManagementPage() {
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('CONSENT');
  const [dataCategories, setDataCategories] = useState('');
  const [retentionDays, setRetentionDays] = useState(2555);

  const fetchPurposes = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/v1/admin/purposes');
      setPurposes(data.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurposes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiClient.post('/api/v1/admin/purposes', {
        code,
        name,
        description,
        legalBasis,
        dataCategories: dataCategories
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        retentionDays,
      });
      toast.success('Purpose created');
      setShowForm(false);
      setCode('');
      setName('');
      setDescription('');
      fetchPurposes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create purpose');
    } finally {
      setCreating(false);
    }
  };

  const handleNewVersion = async (purposeCode: string) => {
    const desc = prompt('Enter updated description for the new version:');
    if (!desc) return;

    try {
      await apiClient.post(`/api/v1/admin/purposes/${purposeCode}/versions`, {
        description: desc,
      });
      toast.success('New version created');
      fetchPurposes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create version');
    }
  };

  if (loading) return <LoadingSpinner message="Loading purposes..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purpose Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            DPDP §6 — Manage consent purpose definitions with version tracking
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + New Purpose
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Purpose</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., marketing"
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marketing Communications"
                  className="input w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full"
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Legal Basis
                </label>
                <select
                  value={legalBasis}
                  onChange={(e) => setLegalBasis(e.target.value)}
                  className="input w-full"
                >
                  <option value="CONSENT">Consent</option>
                  <option value="LEGITIMATE_USE">Legitimate Use</option>
                  <option value="EMPLOYMENT">Employment</option>
                  <option value="STATE_FUNCTION">State Function</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Categories (comma-separated)
                </label>
                <input
                  type="text"
                  value={dataCategories}
                  onChange={(e) => setDataCategories(e.target.value)}
                  placeholder="email, name, phone"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retention (days)
                </label>
                <input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create Purpose'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Purposes List */}
      {purposes.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">📋</p>
          <p>No purposes defined yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {purposes.map((p) => (
            <div key={p.purposeId} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">
                      {p.code}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      v{p.version}
                    </span>
                    {p.isActive && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Legal: {p.legalBasis}</span>
                    <span>Retention: {p.retentionDays} days</span>
                    <span>
                      Categories: {(p.dataCategories || []).join(', ') || 'None'}
                    </span>
                  </div>
                </div>
                {p.isActive && (
                  <button
                    onClick={() => handleNewVersion(p.code)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                  >
                    + New Version
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
