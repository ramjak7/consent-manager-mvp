import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConsents } from '../hooks/useConsents';
import { ConsentStatusBadge } from '@components/consent/ConsentStatusBadge';
import { RevokeConsentModal } from '@components/consent/RevokeConsentModal';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { formatDate, getDaysRemaining } from '@utils/date.utils';
import type { ConsentStatus, Consent } from '../types/consent.types';

export function ConsentListPage() {
  const [filters, setFilters] = useState({
    status: undefined as ConsentStatus | undefined,
    purpose: '',
    page: 1,
    limit: 10,
  });
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useConsents(filters);

  const handleStatusFilter = (status: ConsentStatus | undefined) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleRevokeClick = (consent: Consent) => {
    setSelectedConsent(consent);
    setIsRevokeModalOpen(true);
  };

  const handleCloseRevokeModal = () => {
    setIsRevokeModalOpen(false);
    setSelectedConsent(null);
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading consents..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        retry={() => refetch()}
        fullScreen
      />
    );
  }

  const consents = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 0 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Consents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all your data processing consents
          </p>
        </div>
        <Link
          to="/dashboard"
          className="btn-secondary flex items-center gap-2"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search by purpose or organization
            </label>
            <div className="flex gap-2">
              <input
                id="search"
                type="text"
                value={filters.purpose}
                onChange={(e) => setFilters(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="e.g., Marketing, Analytics..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="submit" className="btn-primary">
                Search
              </button>
              {filters.purpose && (
                <button
                  type="button"
                  onClick={() => setFilters(prev => ({ ...prev, purpose: '', page: 1 }))}
                  className="btn-secondary"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by status
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStatusFilter(undefined)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  !filters.status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleStatusFilter('ACTIVE')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filters.status === 'ACTIVE'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => handleStatusFilter('EXPIRED')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filters.status === 'EXPIRED'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Expired
              </button>
              <button
                onClick={() => handleStatusFilter('REVOKED')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filters.status === 'REVOKED'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Revoked
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {consents.length} of {pagination.total} consent{pagination.total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Consents Table */}
      {consents.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">📋</p>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No consents found
          </h3>
          <p className="text-gray-600">
            {filters.status || filters.purpose
              ? 'Try adjusting your filters'
              : 'You have not granted any consents yet'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purpose
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Granted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consents.map((consent) => {
                  const daysRemaining = consent.status === 'ACTIVE' 
                    ? getDaysRemaining(consent.validUntil) 
                    : null;
                  
                  return (
                    <tr key={consent.consentId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {consent.purpose}
                        </div>
                        <div className="text-xs text-gray-500">
                          {consent.dataTypes.join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {consent.organization || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <ConsentStatusBadge status={consent.status} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {formatDate(consent.validUntil)}
                        </div>
                        {daysRemaining !== null && (
                          <div className={`text-xs ${daysRemaining < 7 ? 'text-warning' : 'text-gray-500'}`}>
                            {daysRemaining} days remaining
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(consent.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <button
                          onClick={() => navigate(`/consents/${consent.consentId}`)}
                          className="text-primary hover:text-primary-hover font-medium mr-3"
                        >
                          View
                        </button>
                        {consent.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevokeClick(consent)}
                            className="text-error hover:text-red-700 font-medium"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  page === pagination.page
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Revoke Consent Modal */}
      <RevokeConsentModal
        consent={selectedConsent}
        isOpen={isRevokeModalOpen}
        onClose={handleCloseRevokeModal}
      />
    </div>
  );
}
