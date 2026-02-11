import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCreateErasureRequest, useErasureRequests } from '@hooks/useErasureRequests';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { toast } from 'sonner';

const ERASURE_REASONS = [
  { value: 'NO_LONGER_NEED_DATA', label: 'I no longer need the service' },
  { value: 'DATA_INACCURATE', label: 'My data is inaccurate or incomplete' },
  { value: 'PRIVACY_CONCERNS', label: 'Privacy concerns' },
  { value: 'WITHDRAW_CONSENT', label: 'I want to withdraw all consent' },
  { value: 'LEGAL_REQUIREMENT', label: 'Legal requirement' },
  { value: 'OTHER', label: 'Other' },
];

export function ErasureRequestPage() {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: existingRequests, isLoading: isLoadingRequests } = useErasureRequests();
  const createMutation = useCreateErasureRequest();

  const hasPendingRequest = existingRequests?.some(
    (req) => req.status === 'PENDING' || req.status === 'IN_PROGRESS'
  );

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !hasAgreed) {
      toast.error('Please select a reason and agree to the terms');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    createMutation.mutate(
      {
        reason,
        additionalNotes: additionalNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Erasure request submitted successfully');
          navigate('/dashboard');
        },
        onError: (error: any) => {
          toast.error('Failed to submit erasure request', {
            description: error.response?.data?.error || error.message,
          });
        },
      }
    );
    setShowConfirmDialog(false);
  };

  if (isLoadingRequests) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Request Data Erasure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Exercise your right to erasure under DPDP Act Section 12(1)
          </p>
        </div>
        <Link to="/dashboard" className="btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Pending Request Warning */}
      {hasPendingRequest && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                You have a pending erasure request
              </h3>
              <p className="text-sm text-gray-700">
                You already have an active erasure request being processed. Please wait for it to be
                completed before submitting a new request.
              </p>
              <Link to="/erasure-requests" className="text-primary hover:text-primary-hover text-sm font-medium mt-2 inline-block">
                View your requests →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Warning Section */}
      <div className="card bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-error mb-2">Important: Understand the Consequences</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>All your personal data will be permanently deleted</li>
              <li>You will lose access to all services and features</li>
              <li>Your account will be closed and cannot be recovered</li>
              <li>Some data may be retained for legal compliance (e.g., 7-year audit records)</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Request Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Submit Erasure Request</h2>
        
        <form onSubmit={handleSubmitForm} className="space-y-6">
          {/* Reason Selection */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Request <span className="text-error">*</span>
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              disabled={hasPendingRequest}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- Select a reason --</option>
              {ERASURE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              disabled={hasPendingRequest}
              rows={4}
              placeholder="Provide any additional context for your request..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This information helps us process your request more efficiently.
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="border-t pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                disabled={hasPendingRequest}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-700">
                I understand that submitting this request will result in the permanent deletion of all my
                personal data, and I acknowledge the consequences outlined above. *
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Link to="/dashboard" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!reason || !hasAgreed || hasPendingRequest || createMutation.isPending}
              className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Erasure Request'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Requests Section */}
      {existingRequests && existingRequests.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Your Previous Requests</h2>
          <Link to="/erasure-requests" className="text-primary hover:text-primary-hover font-medium">
            View all erasure requests →
          </Link>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛑</span>
              <h3 className="text-xl font-semibold text-gray-900">Final Confirmation</h3>
            </div>
            <p className="text-gray-700">
              Are you absolutely sure you want to proceed with this erasure request? This action is irreversible.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={createMutation.isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={createMutation.isPending}
                className="btn-danger"
              >
                {createMutation.isPending ? 'Submitting...' : 'Yes, Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
