import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface SamlConfig {
  configId: string;
  orgId: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpSloUrl: string | null;
  idpCertificate: string;
  spEntityId: string;
  nameIdFormat: string;
  attributeMapping: Record<string, string>;
  autoProvision: boolean;
  defaultRole: string;
  allowedDomains: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const NAME_ID_FORMATS = [
  'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
  'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
  'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
];

const DEFAULT_ROLES = ['DF_CLIENT', 'DF_ADMIN', 'DF_VIEWER'];

export function DfSamlConfigPage() {
  const [config, setConfig] = useState<SamlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; issues: string[] } | null>(null);

  // Form state
  const [idpEntityId, setIdpEntityId] = useState('');
  const [idpSsoUrl, setIdpSsoUrl] = useState('');
  const [idpSloUrl, setIdpSloUrl] = useState('');
  const [idpCertificate, setIdpCertificate] = useState('');
  const [spEntityId, setSpEntityId] = useState('');
  const [nameIdFormat, setNameIdFormat] = useState(NAME_ID_FORMATS[0]);
  const [autoProvision, setAutoProvision] = useState(true);
  const [defaultRole, setDefaultRole] = useState('DF_CLIENT');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [isActive, setIsActive] = useState(false);

  const populateForm = (cfg: SamlConfig) => {
    setIdpEntityId(cfg.idpEntityId);
    setIdpSsoUrl(cfg.idpSsoUrl);
    setIdpSloUrl(cfg.idpSloUrl || '');
    setIdpCertificate(cfg.idpCertificate);
    setSpEntityId(cfg.spEntityId);
    setNameIdFormat(cfg.nameIdFormat);
    setAutoProvision(cfg.autoProvision);
    setDefaultRole(cfg.defaultRole);
    setAllowedDomains((cfg.allowedDomains || []).join(', '));
    setIsActive(cfg.isActive);
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/v1/admin/sso/saml');
      if (data.data) {
        setConfig(data.data);
        populateForm(data.data);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const buildPayload = () => ({
    idpEntityId,
    idpSsoUrl,
    idpSloUrl: idpSloUrl || undefined,
    idpCertificate,
    spEntityId,
    nameIdFormat,
    autoProvision,
    defaultRole,
    allowedDomains: allowedDomains ? allowedDomains.split(',').map(d => d.trim()).filter(Boolean) : [],
    isActive,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      if (config) {
        await apiClient.patch('/api/v1/admin/sso/saml', payload);
        toast.success('SAML configuration updated');
      } else {
        await apiClient.post('/api/v1/admin/sso/saml', payload);
        toast.success('SAML configuration created');
      }
      fetchConfig();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save SAML configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await apiClient.post('/api/v1/admin/sso/saml/test', {});
      setTestResult(data.data);
      if (data.data?.valid) {
        toast.success('SAML configuration is valid');
      } else {
        toast.error('SAML configuration has issues');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete SAML configuration? Users will no longer be able to SSO.')) return;
    try {
      await apiClient.delete('/api/v1/admin/sso/saml');
      toast.success('SAML configuration deleted');
      setConfig(null);
      setIdpEntityId('');
      setIdpSsoUrl('');
      setIdpSloUrl('');
      setIdpCertificate('');
      setSpEntityId('');
      setNameIdFormat(NAME_ID_FORMATS[0]);
      setAutoProvision(true);
      setDefaultRole('DF_CLIENT');
      setAllowedDomains('');
      setIsActive(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete configuration');
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading SSO configuration..." />;
  if (error) return <ErrorMessage error={error} retry={fetchConfig} fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SSO / SAML Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure SAML 2.0 single sign-on for your organization
          </p>
        </div>
        <div className="flex gap-2">
          {config && (
            <>
              <button onClick={handleTest} disabled={testing}
                className="border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50 disabled:opacity-50">
                {testing ? 'Testing...' : '🧪 Test Config'}
              </button>
              <button onClick={handleDelete}
                className="border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50">
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div className={`rounded-lg p-4 ${testResult.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="font-medium text-sm mb-1">
            {testResult.valid ? '✅ Configuration is valid' : '❌ Configuration issues found'}
          </div>
          {testResult.issues?.length > 0 && (
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              {testResult.issues.map((issue, i) => (
                <li key={i} className="text-red-700">{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Status Toggle */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">SSO Status</h3>
              <p className="text-sm text-gray-500">
                {isActive ? 'SSO is enabled — users can sign in via your IdP' : 'SSO is disabled — configure and activate when ready'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Identity Provider */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Identity Provider (IdP)</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IdP Entity ID</label>
                <input type="text" value={idpEntityId} onChange={e => setIdpEntityId(e.target.value)} required
                  placeholder="https://idp.example.com/metadata" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SSO URL</label>
                <input type="url" value={idpSsoUrl} onChange={e => setIdpSsoUrl(e.target.value)} required
                  placeholder="https://idp.example.com/sso" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SLO URL (optional)</label>
                <input type="url" value={idpSloUrl} onChange={e => setIdpSloUrl(e.target.value)}
                  placeholder="https://idp.example.com/slo" className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name ID Format</label>
                <select value={nameIdFormat} onChange={e => setNameIdFormat(e.target.value)} className="input w-full">
                  {NAME_ID_FORMATS.map(f => (
                    <option key={f} value={f}>{f.split(':').pop()}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IdP Certificate (PEM)</label>
              <textarea value={idpCertificate} onChange={e => setIdpCertificate(e.target.value)} required
                rows={6} placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                className="input w-full font-mono text-xs" />
            </div>
          </div>
        </div>

        {/* Service Provider */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Service Provider (SP)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SP Entity ID</label>
            <input type="text" value={spEntityId} onChange={e => setSpEntityId(e.target.value)} required
              placeholder="https://consent.yourdomain.com" className="input w-full" />
          </div>
        </div>

        {/* User Provisioning */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">User Provisioning</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={autoProvision} onChange={e => setAutoProvision(e.target.checked)}
                id="autoProvision" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="autoProvision" className="text-sm text-gray-700">
                Auto-provision users on first login (Just-in-Time provisioning)
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Role</label>
                <select value={defaultRole} onChange={e => setDefaultRole(e.target.value)} className="input w-full">
                  {DEFAULT_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Domains</label>
                <input type="text" value={allowedDomains} onChange={e => setAllowedDomains(e.target.value)}
                  placeholder="example.com, corp.example.com" className="input w-full" />
                <p className="text-xs text-gray-400 mt-1">Comma-separated. Leave empty to allow all.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : config ? 'Update Configuration' : 'Create Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
