import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useConsent } from '@hooks/useConsents';
import { consentApi } from '@api/consent.api';
import { ConsentStatusBadge } from '@components/consent/ConsentStatusBadge';
import { RevokeConsentModal } from '@components/consent/RevokeConsentModal';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { formatDate, getDaysRemaining } from '@utils/date.utils';

export function ConsentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: consent, isLoading, error, refetch } = useConsent(id || '');
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadJson = async () => {
    if (!id) return;
    try {
      const receipt = await consentApi.getReceipt(id);
      const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consent-receipt-${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded (JSON)');
    } catch {
      toast.error('Failed to download receipt');
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    setIsDownloading(true);
    try {
      await consentApi.downloadReceiptPdf(id);
      toast.success('Receipt downloaded (PDF)');
    } catch {
      toast.error('Failed to download PDF receipt');
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading consent details..." />;
  }

  if (error || !consent) {
    return (
      <ErrorMessage
        error={error || new Error('Consent not found')}
        retry={() => refetch()}
        fullScreen
      />
    );
  }

  const daysRemaining = consent.status === 'ACTIVE' ? getDaysRemaining(consent.validUntil) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link to="/consents" className="text-sm text-primary hover:underline mb-2 inline-block">
            ← Back to Consents
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Consent Details</h1>
        </div>
        <div className="flex gap-2">
          {consent.status === 'ACTIVE' && (
            <button
              onClick={() => setIsRevokeModalOpen(true)}
              className="btn-danger"
            >
              Revoke Consent
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div className={`card border-l-4 ${
        consent.status === 'ACTIVE' ? 'border-l-green-500 bg-green-50' :
        consent.status === 'EXPIRED' ? 'border-l-yellow-500 bg-yellow-50' :
        consent.status === 'REVOKED' ? 'border-l-red-500 bg-red-50' :
        'border-l-blue-500 bg-blue-50'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <ConsentStatusBadge status={consent.status} size="lg" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{consent.purpose}</h2>
              <p className="text-sm text-gray-600">{consent.organization || 'N/A'}</p>
            </div>
          </div>
          {daysRemaining !== null && (
            <div className={`text-sm font-medium ${daysRemaining < 7 ? 'text-warning' : 'text-gray-600'}`}>
              {daysRemaining} days remaining
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Details */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Information</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-gray-500">Consent ID</dt>
              <dd className="font-mono text-sm mt-1 break-all">{consent.consentId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Group ID</dt>
              <dd className="font-mono text-sm mt-1 break-all">{consent.consentGroupId}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Version</dt>
              <dd className="font-medium mt-1">v{consent.version}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Purpose</dt>
              <dd className="font-medium mt-1">{consent.purpose}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Data Types</dt>
              <dd className="mt-1">
                <div className="flex flex-wrap gap-2">
                  {consent.dataTypes.map((dt) => (
                    <span key={dt} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm">
                      {dt}
                    </span>
                  ))}
                </div>
              </dd>
            </div>
          </dl>
        </div>

        {/* Dates & Notice */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dates &amp; Notice</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-gray-500">Granted At</dt>
              <dd className="font-medium mt-1">{formatDate(consent.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Valid Until</dt>
              <dd className="font-medium mt-1">{formatDate(consent.validUntil)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Notice ID</dt>
              <dd className="font-mono text-sm mt-1">{consent.noticeId || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Notice Version</dt>
              <dd className="font-medium mt-1">{consent.noticeVersion || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Language</dt>
              <dd className="font-medium mt-1 uppercase">{consent.language || 'N/A'}</dd>
            </div>
            {consent.noticeShownAt && (
              <div>
                <dt className="text-sm text-gray-500">Notice Shown At</dt>
                <dd className="font-medium mt-1">{formatDate(consent.noticeShownAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Receipt Download */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Consent Receipt</h3>
        <p className="text-sm text-gray-600 mb-4">
          Download your ISO/IEC 29184 compliant consent receipt as proof of consent.
        </p>
        <div className="flex gap-3">
          <button onClick={handleDownloadJson} className="btn-secondary flex items-center gap-2">
            📄 Download JSON
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            📑 {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Revoke Modal */}
      <RevokeConsentModal
        consent={consent}
        isOpen={isRevokeModalOpen}
        onClose={() => {
          setIsRevokeModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
