import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface ErasureRequest {
  requestId: string;
  userId: string;
  reason: string;
  additionalNotes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNotes?: string;
  completedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function DfErasureRequestsPage() {
  const [requests, setRequests] = useState<ErasureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = filter
        ? `/api/v1/admin/erasure-requests?status=${filter}`
        : '/api/v1/admin/erasure-requests';
      const { data } = await apiClient.get(url);
      setRequests(data.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleStatusUpdate = async (requestId: string, status: string) => {
    try {
      await apiClient.patch(`/api/v1/admin/erasure-requests/${requestId}/status`, {
        status,
        reviewNotes: reviewNotes || undefined,
      });
      toast.success(`Request ${status.toLowerCase()}`);
      setUpdating(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  if (loading) return <LoadingSpinner message="Loading erasure requests..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Erasure Requests</h2>
        <p className="text-sm text-gray-600 mt-1">
          DPDP Act §12(1) — Manage Data Principal erasure requests
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {requests.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">📋</p>
          <p>No erasure requests found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">User ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Submitted</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.requestId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{req.userId.slice(0, 12)}...</td>
                  <td className="px-4 py-3">{req.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || ''}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'PENDING' && (
                      <div className="flex gap-2">
                        {updating === req.requestId ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="Notes..."
                              className="input text-xs w-32"
                            />
                            <button
                              onClick={() => handleStatusUpdate(req.requestId, 'IN_PROGRESS')}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(req.requestId, 'REJECTED')}
                              className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => { setUpdating(null); setReviewNotes(''); }}
                              className="text-xs text-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setUpdating(req.requestId)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    )}
                    {req.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStatusUpdate(req.requestId, 'COMPLETED')}
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Complete
                      </button>
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
