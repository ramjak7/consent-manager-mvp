import { useState } from 'react';
import { Modal } from '@components/common/Modal';
import { useRevokeConsent } from '../../hooks/useConsents';
import { toast } from 'sonner';
import type { Consent } from '../../types/consent.types';

interface RevokeConsentModalProps {
  consent: Consent | null;
  isOpen: boolean;
  onClose: () => void;
}

const REVOKE_REASONS = [
  { value: 'NO_LONGER_USING', label: 'No longer using the service' },
  { value: 'PRIVACY_CONCERNS', label: 'Privacy concerns' },
  { value: 'SWITCHING_SERVICE', label: 'Switching to another service' },
  { value: 'QUALITY_ISSUES', label: 'Service quality issues' },
  { value: 'OTHER', label: 'Other' },
];

export function RevokeConsentModal({ consent, isOpen, onClose }: RevokeConsentModalProps) {
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const { mutate: revokeConsent, isPending } = useRevokeConsent();

  const handleRevoke = () => {
    if (!consent || !reason) return;

    revokeConsent(consent.consentId, {
      onSuccess: () => {
        toast.success('Consent revoked successfully', {
          description: `${consent.purpose} consent has been permanently revoked.`,
        });
        handleClose();
      },
      onError: (error: Error) => {
        toast.error('Failed to revoke consent', {
          description: error.message || 'Please try again later.',
        });
      },
    });
  };

  const handleClose = () => {
    setReason('');
    setComments('');
    onClose();
  };

  if (!consent) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Revoke Consent</h2>
            <p className="text-sm text-gray-500 mt-1">
              This action cannot be undone
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isPending}
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Consent Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{consent.purpose}</h3>
          <p className="text-sm text-gray-600">
            Organization: {consent.organization || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            Data Types: {consent.dataTypes.join(', ')}
          </p>
        </div>

        {/* Warning */}
        <div className="bg-warning-light border border-warning/30 rounded-lg p-4">
          <p className="text-sm text-gray-900">
            <span className="font-semibold">⚠️ Warning:</span> Revoking this consent will:
          </p>
          <ul className="text-sm text-gray-700 mt-2 ml-6 list-disc space-y-1">
            <li>Stop all data processing for this purpose</li>
            <li>May affect service functionality</li>
            <li>Cannot be undone</li>
          </ul>
        </div>

        {/* Reason Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for revoking <span className="text-error">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isPending}
            required
          >
            <option value="">Select a reason...</option>
            {REVOKE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional comments (optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Tell us more about your decision..."
            disabled={isPending}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 btn-secondary"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleRevoke}
            className="flex-1 btn-danger"
            disabled={!reason || isPending}
          >
            {isPending ? 'Revoking...' : 'Revoke Consent'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
