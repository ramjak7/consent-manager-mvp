import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActivityLogs } from '@hooks/useActivityLogs';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { formatDate } from '@utils/date.utils';

const EVENT_TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  CONSENT_REQUESTED: { icon: '📝', label: 'Consent Requested', color: 'text-blue-600' },
  CONSENT_APPROVED: { icon: '✅', label: 'Consent Approved', color: 'text-green-600' },
  CONSENT_REJECTED: { icon: '❌', label: 'Consent Rejected', color: 'text-red-600' },
  CONSENT_CREATED: { icon: '➕', label: 'Consent Created', color: 'text-blue-600' },
  CONSENT_REVOKED: { icon: '🚫', label: 'Consent Revoked', color: 'text-orange-600' },
  CONSENT_EXPIRED: { icon: '⏰', label: 'Consent Expired', color: 'text-yellow-600' },
  PROCESSING_ALLOWED: { icon: '🔓', label: 'Processing Allowed', color: 'text-green-600' },
  PROCESSING_DENIED: { icon: '🔒', label: 'Processing Denied', color: 'text-red-600' },
  ADMIN_EXPIRE_DENIED: { icon: '⛔', label: 'Expiry Denied', color: 'text-red-600' },
  NOTICE_SHOWN: { icon: '👁️', label: 'Notice Shown', color: 'text-blue-600' },
  RECEIPT_GENERATED: { icon: '🧾', label: 'Receipt Generated', color: 'text-gray-600' },
  ERASURE_REQUESTED: { icon: '🗑️', label: 'Erasure Requested', color: 'text-red-600' },
  ERASURE_REQUEST_UPDATED: { icon: '🔄', label: 'Erasure Request Updated', color: 'text-blue-600' },
};

export function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error, refetch } = useActivityLogs({ page, limit });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading activity log..." />;
  }

  if (error) {
    return <ErrorMessage error={error} retry={() => refetch()} fullScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            View all your consent and data processing activities
          </p>
        </div>
        <Link to="/dashboard" className="btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Empty State */}
      {logs.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activity Yet</h3>
          <p className="text-gray-600">
            Your activity log will appear here as you interact with the system.
          </p>
        </div>
      )}

      {/* Activity Timeline */}
      {logs.length > 0 && (
        <div className="card">
          <div className="space-y-4">
            {logs.map((log, index) => {
              const config = EVENT_TYPE_CONFIG[log.eventType] || {
                icon: '📌',
                label: log.eventType,
                color: 'text-gray-600',
              };

              return (
                <div key={log.auditId} className="relative">
                  {/* Timeline connector */}
                  {index < logs.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                  )}

                  {/* Event Card */}
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl z-10">
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className={`font-semibold ${config.color}`}>
                            {config.label}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(log.timestamp)} • {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-gray-400">
                          {log.auditId.slice(0, 8)}
                        </span>
                      </div>

                      {/* Event Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          <p className="font-semibold text-gray-700 mb-1">Details:</p>
                          <div className="space-y-1">
                            {Object.entries(log.details).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="text-gray-500">{key}:</span>
                                <span className="text-gray-900">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value)
                                    : String(value)
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Consent Reference */}
                      {log.consentId && log.consentId !== 'N/A' && (
                        <div className="mt-2 text-xs text-gray-500">
                          Consent ID: <span className="font-mono">{log.consentId.slice(0, 16)}...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {page} of {pagination.pages} ({pagination.total} events)
              </span>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About Activity Log</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• All events are cryptographically logged for compliance and audit purposes</li>
          <li>• Activity logs are immutable and cannot be modified or deleted</li>
          <li>• Logs are retained for 7 years as required by DPDP regulations</li>
          <li>• Each entry is hash-chained to prevent tampering</li>
        </ul>
      </div>
    </div>
  );
}
