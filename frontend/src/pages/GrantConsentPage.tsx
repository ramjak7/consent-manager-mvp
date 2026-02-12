import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useGrantConsent } from '@hooks/useConsents';
import { useCurrentUser } from '@hooks/useAuth';
import type { Language } from '../types/consent.types';

const PURPOSE_OPTIONS = [
  'Marketing Communications',
  'Service Improvement & Analytics',
  'Personalised Recommendations',
  'Third-party Data Sharing',
  'Account Management',
  'Legal & Regulatory Compliance',
];

const DATA_TYPE_OPTIONS = [
  'email',
  'name',
  'phone',
  'address',
  'location',
  'browsing_history',
  'purchase_history',
  'device_info',
  'biometric',
  'financial',
  'health',
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
  { value: 'ta', label: 'Tamil (தமிழ்)' },
];

export function GrantConsentPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const grantConsent = useGrantConsent();

  const [form, setForm] = useState({
    purpose: '',
    customPurpose: '',
    dataTypes: [] as string[],
    validUntil: '',
    noticeId: 'NOTICE-DPDP-2023-001',
    noticeVersion: '1.0',
    language: 'en' as Language,
  });

  const [agreed, setAgreed] = useState(false);

  const handleDataTypeToggle = (dt: string) => {
    setForm((prev) => ({
      ...prev,
      dataTypes: prev.dataTypes.includes(dt)
        ? prev.dataTypes.filter((d) => d !== dt)
        : [...prev.dataTypes, dt],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.userId) {
      toast.error('User not authenticated');
      return;
    }

    const purpose = form.purpose === '__custom__' ? form.customPurpose : form.purpose;

    if (!purpose) {
      toast.error('Please select or enter a purpose');
      return;
    }
    if (form.dataTypes.length === 0) {
      toast.error('Please select at least one data type');
      return;
    }
    if (!form.validUntil) {
      toast.error('Please set a validity date');
      return;
    }
    if (!agreed) {
      toast.error('Please agree to the consent terms');
      return;
    }

    try {
      const result = await grantConsent.mutateAsync({
        userId: user.userId,
        purpose,
        dataTypes: form.dataTypes,
        validUntil: new Date(form.validUntil).toISOString(),
        noticeId: form.noticeId,
        noticeVersion: form.noticeVersion,
        language: form.language,
      });

      toast.success(`Consent created (${result.status}). Approval token issued.`);
      navigate('/consents');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to grant consent';
      toast.error(msg);
    }
  };

  // Default minimum date: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link to="/dashboard" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Grant New Consent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Provide informed consent for data processing under DPDP Act 2023
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purpose */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Purpose of Processing</h2>
          <select
            value={form.purpose}
            onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a purpose...</option>
            {PURPOSE_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
            <option value="__custom__">Other (enter custom)</option>
          </select>
          {form.purpose === '__custom__' && (
            <input
              type="text"
              placeholder="Enter custom purpose..."
              value={form.customPurpose}
              onChange={(e) => setForm((p) => ({ ...p, customPurpose: e.target.value }))}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>

        {/* Data Types */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Data Types</h2>
          <p className="text-sm text-gray-500 mb-3">Select the types of personal data you consent to share</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DATA_TYPE_OPTIONS.map((dt) => (
              <label
                key={dt}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  form.dataTypes.includes(dt)
                    ? 'border-primary bg-blue-50 text-primary'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.dataTypes.includes(dt)}
                  onChange={() => handleDataTypeToggle(dt)}
                  className="accent-primary"
                />
                <span className="text-sm">{dt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Validity & Language */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Validity &amp; Language</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                min={minDate}
                value={form.validUntil}
                onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notice Language
              </label>
              <select
                value={form.language}
                onChange={(e) => setForm((p) => ({ ...p, language: e.target.value as Language }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notice Information (read-only) */}
        <div className="card bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold mb-3">Notice Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Notice ID</p>
              <p className="font-mono">{form.noticeId}</p>
            </div>
            <div>
              <p className="text-gray-500">Notice Version</p>
              <p className="font-mono">{form.noticeVersion}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            This consent is linked to the DPDP Act privacy notice shown to you.
          </p>
        </div>

        {/* Agreement Checkbox */}
        <div className="card">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 accent-primary"
            />
            <span className="text-sm text-gray-700">
              I confirm that I have read and understood the privacy notice. I voluntarily grant my consent
              for the stated purpose and data types under the Digital Personal Data Protection Act, 2023.
              I understand I may withdraw this consent at any time.
            </span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={grantConsent.isPending || !agreed}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {grantConsent.isPending ? 'Submitting...' : 'Grant Consent'}
          </button>
          <Link to="/dashboard" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
