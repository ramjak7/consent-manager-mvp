import { useState, useEffect } from 'react';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface CorrectionRequest {
  requestId: string;
  userId: string;
  fieldName: string;
  currentValue?: string;
  correctedValue: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewNotes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
};

export function DfCorrectionRequestsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = filter
        ? `/api/v1/admin/correction-requests?status=${filter}`
        : '/api/v1/admin/correction-requests';
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
      await apiClient.patch(`/api/v1/admin/correction-requests/${requestId}/status`, {
        status,
      });
      fetchRequests();
    } catch (err: any) {
      console.error('Update failed', err);
    }
  };

  if (loading) return <LoadingSpinner message="Loading correction requests..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Correction Requests</h2>
        <p className="text-sm text-gray-600 mt-1">
          DPDP §11 — Review Data Principal correction requests
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED'].map((s) => (
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
          <p className="text-4xl mb-2">✏️</p>
          <p>No correction requests found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">User ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Field</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Current</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Corrected</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requests.map((req) => (
                <tr key={req.requestId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">
                    {req.userId.slice(0, 12)}...
                  </td>
                  <td className="px-4 py-3 font-medium">{req.fieldName}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">
                    {req.currentValue || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-[120px] truncate">
                    {req.correctedValue}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{req.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[req.status] || ''
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(req.requestId, 'APPROVED')}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(req.requestId, 'REJECTED')}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === 'APPROVED' && (
                        <button
                          onClick={() => handleStatusUpdate(req.requestId, 'COMPLETED')}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          Complete
                        </button>
                      )}
                    </div>
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
