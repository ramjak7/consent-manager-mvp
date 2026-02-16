import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface Branding {
  brandingId: string;
  orgId: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  portalTitle: string;
  supportEmail: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  customCss: string | null;
  updatedAt: string;
}

const DEFAULT_BRANDING: Partial<Branding> = {
  primaryColor: '#4F46E5',
  secondaryColor: '#7C3AED',
  accentColor: '#06B6D4',
  fontFamily: 'Inter, system-ui, sans-serif',
  portalTitle: 'Consent Manager',
};

export function DfBrandingPage() {
  const [branding, setBranding] = useState<Partial<Branding>>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/v1/branding');
      setBranding({ ...DEFAULT_BRANDING, ...(data.data || {}) });
    } catch (err: any) {
      // If no branding exists, use defaults
      if (err.response?.status === 404) {
        setBranding(DEFAULT_BRANDING);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (branding.logoUrl) payload.logoUrl = branding.logoUrl;
      if (branding.faviconUrl) payload.faviconUrl = branding.faviconUrl;
      if (branding.primaryColor) payload.primaryColor = branding.primaryColor;
      if (branding.secondaryColor) payload.secondaryColor = branding.secondaryColor;
      if (branding.accentColor) payload.accentColor = branding.accentColor;
      if (branding.fontFamily) payload.fontFamily = branding.fontFamily;
      if (branding.portalTitle) payload.portalTitle = branding.portalTitle;
      if (branding.supportEmail) payload.supportEmail = branding.supportEmail;
      if (branding.privacyPolicyUrl) payload.privacyPolicyUrl = branding.privacyPolicyUrl;
      if (branding.termsUrl) payload.termsUrl = branding.termsUrl;
      if (branding.customCss) payload.customCss = branding.customCss;

      await apiClient.put('/api/v1/admin/branding', payload);
      toast.success('Branding updated successfully');
      fetchBranding();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Branding, value: string) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading branding..." />;
  if (error) return <ErrorMessage error={error} retry={fetchBranding} fullScreen />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Branding & White-Label</h2>
        <p className="text-sm text-gray-500 mt-1">
          Customize the consent portal appearance for your organization
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Preview */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div className="border rounded-lg overflow-hidden" style={{ fontFamily: branding.fontFamily }}>
            <div className="px-6 py-4" style={{ backgroundColor: branding.primaryColor }}>
              <div className="flex items-center gap-3">
                {branding.logoUrl && (
                  <img src={branding.logoUrl} alt="Logo" className="h-8 w-8 rounded"
                    onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
                <span className="text-white font-semibold">{branding.portalTitle || 'Consent Manager'}</span>
              </div>
            </div>
            <div className="p-6 bg-white">
              <p className="text-gray-700 mb-3">This is how your consent portal will appear to data principals.</p>
              <div className="flex gap-2">
                <button type="button" className="px-4 py-2 rounded text-white text-sm"
                  style={{ backgroundColor: branding.primaryColor }}>Accept</button>
                <button type="button" className="px-4 py-2 rounded text-sm border"
                  style={{ borderColor: branding.secondaryColor, color: branding.secondaryColor }}>Decline</button>
              </div>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Colors</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={branding.primaryColor || '#4F46E5'}
                  onChange={e => updateField('primaryColor', e.target.value)} className="h-10 w-14 rounded cursor-pointer" />
                <input type="text" value={branding.primaryColor || ''} onChange={e => updateField('primaryColor', e.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$" placeholder="#4F46E5" className="input flex-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={branding.secondaryColor || '#7C3AED'}
                  onChange={e => updateField('secondaryColor', e.target.value)} className="h-10 w-14 rounded cursor-pointer" />
                <input type="text" value={branding.secondaryColor || ''} onChange={e => updateField('secondaryColor', e.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$" placeholder="#7C3AED" className="input flex-1" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={branding.accentColor || '#06B6D4'}
                  onChange={e => updateField('accentColor', e.target.value)} className="h-10 w-14 rounded cursor-pointer" />
                <input type="text" value={branding.accentColor || ''} onChange={e => updateField('accentColor', e.target.value)}
                  pattern="^#[0-9a-fA-F]{6}$" placeholder="#06B6D4" className="input flex-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Portal Title</label>
              <input type="text" value={branding.portalTitle || ''} onChange={e => updateField('portalTitle', e.target.value)}
                placeholder="Consent Manager" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
              <input type="text" value={branding.fontFamily || ''} onChange={e => updateField('fontFamily', e.target.value)}
                placeholder="Inter, system-ui, sans-serif" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input type="url" value={branding.logoUrl || ''} onChange={e => updateField('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
              <input type="url" value={branding.faviconUrl || ''} onChange={e => updateField('faviconUrl', e.target.value)}
                placeholder="https://example.com/favicon.ico" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input type="email" value={branding.supportEmail || ''} onChange={e => updateField('supportEmail', e.target.value)}
                placeholder="privacy@example.com" className="input w-full" />
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Legal Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Policy URL</label>
              <input type="url" value={branding.privacyPolicyUrl || ''} onChange={e => updateField('privacyPolicyUrl', e.target.value)}
                placeholder="https://example.com/privacy" className="input w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions URL</label>
              <input type="url" value={branding.termsUrl || ''} onChange={e => updateField('termsUrl', e.target.value)}
                placeholder="https://example.com/terms" className="input w-full" />
            </div>
          </div>
        </div>

        {/* Custom CSS */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Custom CSS (Advanced)</h3>
          <textarea value={branding.customCss || ''} onChange={e => updateField('customCss', e.target.value)}
            rows={6} placeholder=".consent-widget { /* your CSS */ }" className="input w-full font-mono text-sm" />
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </form>
    </div>
  );
}
