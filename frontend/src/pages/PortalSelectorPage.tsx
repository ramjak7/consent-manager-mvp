import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@hooks/useAuth';
import { useEffect } from 'react';

export function PortalSelectorPage() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useCurrentUser();

  // If already logged in, redirect based on role
  useEffect(() => {
    if (user) {
      const roles = user.roles?.map((r) => r.roleName) ?? [];
      if (roles.includes('DF_CLIENT') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
        navigate('/df/dashboard', { replace: true });
      } else {
        navigate('/dp/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-3xl text-white">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consent Manager
          </h1>
          <p className="text-gray-600">
            DPDP Act 2023 — Digital Personal Data Protection
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Data Principal Card */}
          <button
            onClick={() => navigate('/login?portal=dp')}
            className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200 hover:border-blue-300 p-8 text-left transition-all duration-200"
          >
            <div className="w-14 h-14 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              I am a Data Principal
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage your personal data consents, request erasure, and view your activity log.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✓ View &amp; manage consents</li>
              <li>✓ Grant or revoke consent</li>
              <li>✓ Request data erasure</li>
              <li>✓ Download your data</li>
            </ul>
            <div className="mt-6 text-blue-600 text-sm font-medium group-hover:text-blue-700">
              Continue as Data Principal →
            </div>
          </button>

          {/* Data Fiduciary Card */}
          <button
            onClick={() => navigate('/login?portal=df')}
            className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-200 hover:border-indigo-300 p-8 text-left transition-all duration-200"
          >
            <div className="w-14 h-14 bg-indigo-100 group-hover:bg-indigo-200 rounded-xl flex items-center justify-center mb-4 transition-colors">
              <span className="text-2xl">🏢</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              I am a Data Fiduciary
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage consents, view compliance analytics, and administer your organization.
            </p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>✓ Consent analytics dashboard</li>
              <li>✓ User management</li>
              <li>✓ Webhook configuration</li>
              <li>✓ Compliance reporting</li>
            </ul>
            <div className="mt-6 text-indigo-600 text-sm font-medium group-hover:text-indigo-700">
              Continue as Data Fiduciary →
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-10 text-xs text-gray-400">
          <p>Protected under the Digital Personal Data Protection Act, 2023</p>
          <p className="mt-1">Government of India</p>
        </div>
      </div>
    </div>
  );
}
