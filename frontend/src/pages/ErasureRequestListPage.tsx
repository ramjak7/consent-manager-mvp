import { Link } from 'react-router-dom';
import { useErasureRequests } from '@hooks/useErasureRequests';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { formatDate } from '@utils/date.utils';
import { type ErasureRequestStatus } from '../types/erasureRequest.types';

const STATUS_CONFIG: Record<
  ErasureRequestStatus,
  { icon: string; className: string; label: string }
> = {
  PENDING: {
    icon: '🕐',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    label: 'Pending Review',
  },
  IN_PROGRESS: {
    icon: '⏳',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    label: 'In Progress',
  },
  COMPLETED: {
    icon: '✅',
    className: 'bg-green-100 text-green-800 border-green-200',
    label: 'Completed',
  },
  REJECTED: {
    icon: '❌',
    className: 'bg-red-100 text-red-800 border-red-200',
    label: 'Rejected',
  },
};

const REASON_LABELS: Record<string, string> = {
  NO_LONGER_NEED_DATA: 'No longer need the service',
  DATA_INACCURATE: 'Data is inaccurate or incomplete',
  PRIVACY_CONCERNS: 'Privacy concerns',
  WITHDRAW_CONSENT: 'Withdraw all consent',
  LEGAL_REQUIREMENT: 'Legal requirement',
  OTHER: 'Other',
};

export function ErasureRequestListPage() {
  const { data: requests, isLoading, error, refetch } = useErasureRequests();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading erasure requests..." />;
  }

  if (error) {
    return <ErrorMessage error={error} retry={() => refetch()} fullScreen />;
  }

  const sortedRequests = requests ? [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Erasure Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            View the status of your data erasure requests
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/erasure-request" className="btn-danger">
            + New Request
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            ← Back
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {sortedRequests.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Erasure Requests</h3>
          <p className="text-gray-600 mb-6">
            You haven't submitted any data erasure requests yet.
          </p>
          <Link to="/erasure-request" className="btn-primary">
            Submit Your First Request
          </Link>
        </div>
      )}

      {/* Requests List */}
      {sortedRequests.length > 0 && (
        <div className="space-y-4">
          {sortedRequests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status];
            return (
              <div key={request.requestId} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.className}`}
                      >
                        <span>{statusConfig.icon}</span>
                        <span>{statusConfig.label}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        Request ID: {request.requestId.slice(0, 8)}...
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {REASON_LABELS[request.reason] || request.reason}
                    </h3>
                    {request.additionalNotes && (
                      <p className="text-sm text-gray-600 mb-3">
                        <strong>Notes:</strong> {request.additionalNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Submitted</span>
                    <span className="text-gray-900 font-medium">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>

                  {request.reviewedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Reviewed</span>
                      <span className="text-gray-900 font-medium">
                        {formatDate(request.reviewedAt)}
                      </span>
                    </div>
                  )}

                  {request.completedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Completed</span>
                      <span className="text-gray-900 font-medium">
                        {formatDate(request.completedAt)}
                      </span>
                    </div>
                  )}

                  {request.reviewNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-1">
                        Review Notes:
                      </p>
                      <p className="text-sm text-gray-900">{request.reviewNotes}</p>
                    </div>
                  )}
                </div>

                {/* Status-specific Info */}
                {request.status === 'PENDING' && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      ⏳ Your request is awaiting review by our team. We typically process requests
                      within 30 days as required by the DPDP Act.
                    </p>
                  </div>
                )}

                {request.status === 'IN_PROGRESS' && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      🔄 Your request is currently being processed. Please allow some time for
                      completion.
                    </p>
                  </div>
                )}

                {request.status === 'REJECTED' && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      ❌ Your request was rejected. Please review the notes above for more information.
                      You may contact support if you have questions.
                    </p>
                  </div>
                )}

                {request.status === 'COMPLETED' && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      ✅ Your erasure request has been completed. All your personal data has been
                      deleted as requested.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Section */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          About Data Erasure Requests
        </h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• Requests are processed within 30 days as required by the DPDP Act Section 12(1)</li>
          <li>• Some data may be retained for legal compliance (e.g., 7-year audit records)</li>
          <li>• You can submit a new request only if no pending requests exist</li>
          <li>• Once completed, your account and all data will be permanently deleted</li>
        </ul>
      </div>
    </div>
  );
}
