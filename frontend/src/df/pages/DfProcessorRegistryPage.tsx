import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface Processor {
  processorId: string;
  name: string;
  entityType: string;
  contactEmail?: string;
  contactPhone?: string;
  country: string;
  dpaSigned: boolean;
  dpaExpiryDate?: string;
  authorizedPurposes: string[];
  crossBorderTransfer: boolean;
  transferCountries: string[];
  status: string;
  createdAt: string;
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  TERMINATED: 'bg-red-100 text-red-800',
  PENDING_REVIEW: 'bg-blue-100 text-blue-800',
};

export function DfProcessorRegistryPage() {
  const [processors, setProcessors] = useState<Processor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState('COMPANY');
  const [contactEmail, setContactEmail] = useState('');
  const [country, setCountry] = useState('IN');
  const [dpaSigned, setDpaSigned] = useState(false);
  const [crossBorder, setCrossBorder] = useState(false);
  const [purposes, setPurposes] = useState('');
  const [notes, setNotes] = useState('');

  const fetchProcessors = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/v1/admin/processors');
      setProcessors(data.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcessors();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiClient.post('/api/v1/admin/processors', {
        name,
        entityType,
        contactEmail: contactEmail || undefined,
        country,
        dpaSigned,
        crossBorderTransfer: crossBorder,
        authorizedPurposes: purposes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        notes: notes || undefined,
      });
      toast.success('Processor registered');
      setShowForm(false);
      setName('');
      setContactEmail('');
      setPurposes('');
      setNotes('');
      fetchProcessors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create processor');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (processorId: string, status: string) => {
    try {
      await apiClient.patch(`/api/v1/admin/processors/${processorId}`, { status });
      toast.success(`Processor ${status.toLowerCase()}`);
      fetchProcessors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  if (loading) return <LoadingSpinner message="Loading processors..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Processor Registry</h2>
          <p className="text-sm text-gray-600 mt-1">
            DPDP §8(2) — Track third-party data processors and vendors
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Register Processor
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Register New Processor</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="input w-full"
                >
                  <option value="COMPANY">Company</option>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="NGO">NGO</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="input w-full"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authorized Purposes
                </label>
                <input
                  type="text"
                  value={purposes}
                  onChange={(e) => setPurposes(e.target.value)}
                  placeholder="marketing, analytics"
                  className="input w-full"
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dpaSigned}
                  onChange={(e) => setDpaSigned(e.target.checked)}
                />
                DPA Signed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={crossBorder}
                  onChange={(e) => setCrossBorder(e.target.checked)}
                />
                Cross-border Transfer
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input w-full"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Registering...' : 'Register Processor'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Processors List */}
      {processors.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">🏭</p>
          <p>No processors registered yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {processors.map((p) => (
            <div key={p.processorId} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {p.entityType}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[p.status] || ''}`}
                    >
                      {p.status}
                    </span>
                    {!p.dpaSigned && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        ⚠️ No DPA
                      </span>
                    )}
                    {p.crossBorderTransfer && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                        🌐 Cross-border
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    {p.contactEmail && <span>📧 {p.contactEmail}</span>}
                    <span>🌍 {p.country}</span>
                    <span>
                      Purposes: {(p.authorizedPurposes || []).join(', ') || 'None'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {p.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusChange(p.processorId, 'SUSPENDED')}
                      className="text-xs text-yellow-600 hover:text-yellow-800 px-2 py-1"
                    >
                      Suspend
                    </button>
                  )}
                  {p.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleStatusChange(p.processorId, 'ACTIVE')}
                      className="text-xs text-green-600 hover:text-green-800 px-2 py-1"
                    >
                      Reactivate
                    </button>
                  )}
                  {p.status !== 'TERMINATED' && (
                    <button
                      onClick={() => handleStatusChange(p.processorId, 'TERMINATED')}
                      className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
                    >
                      Terminate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
