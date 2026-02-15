import { useState } from 'react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import {
  useCorrectionRequests,
  useCreateCorrectionRequest,
} from '@hooks/useCorrectionRequests';
import type {
  CorrectionReason,
  CorrectionRequestStatus,
} from '../types/correctionRequest.types';

const FIELD_OPTIONS = [
  'name',
  'email',
  'phone',
  'address',
  'date_of_birth',
  'aadhaar_id',
  'other',
];

const REASON_OPTIONS: { value: CorrectionReason; label: string }[] = [
  { value: 'INACCURATE', label: 'Inaccurate — Data is factually incorrect' },
  { value: 'INCOMPLETE', label: 'Incomplete — Data is missing information' },
  { value: 'OUTDATED', label: 'Outdated — Data is no longer current' },
  { value: 'MISLEADING', label: 'Misleading — Data creates a false impression' },
];

function statusBadge(status: CorrectionRequestStatus) {
  const styles: Record<CorrectionRequestStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export function CorrectionRequestPage() {
  const { data: requests, isLoading, error } = useCorrectionRequests();
  const createMutation = useCreateCorrectionRequest();

  const [showForm, setShowForm] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [customField, setCustomField] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [correctedValue, setCorrectedValue] = useState('');
  const [reason, setReason] = useState<CorrectionReason>('INACCURATE');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const resetForm = () => {
    setFieldName('');
    setCustomField('');
    setCurrentValue('');
    setCorrectedValue('');
    setReason('INACCURATE');
    setAdditionalNotes('');
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedField = fieldName === 'other' ? customField : fieldName;

    if (!resolvedField || !correctedValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createMutation.mutateAsync({
        fieldName: resolvedField,
        currentValue: currentValue || undefined,
        correctedValue,
        reason,
        additionalNotes: additionalNotes || undefined,
      });
      toast.success('Correction request submitted successfully');
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading correction requests..." />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Right to Correction
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            DPDP Act §11 — Request correction of your personal data
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            + New Request
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            Submit Correction Request
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Field *
              </label>
              <select
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                className="input w-full"
                required
              >
                <option value="">Select field...</option>
                {FIELD_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
              {fieldName === 'other' && (
                <input
                  type="text"
                  value={customField}
                  onChange={(e) => setCustomField(e.target.value)}
                  placeholder="Specify field name"
                  className="input w-full mt-2"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Value (optional)
              </label>
              <input
                type="text"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="What the current value is"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Corrected Value *
              </label>
              <input
                type="text"
                value={correctedValue}
                onChange={(e) => setCorrectedValue(e.target.value)}
                placeholder="What it should be corrected to"
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as CorrectionReason)}
                className="input w-full"
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any supporting information..."
                className="input w-full"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Your Correction Requests</h3>
        </div>
        {!requests || requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>No correction requests yet</p>
            <p className="text-xs mt-1">
              Use the button above to request correction of your personal data
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Field
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Corrected Value
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.requestId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {req.fieldName.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      {req.correctedValue}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {req.reason}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(req.status)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
