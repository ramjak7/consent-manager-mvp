import { useSearchParams, Link } from 'react-router-dom';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const portal = searchParams.get('portal') || 'dp';
  const isDF = portal === 'df';

  const handleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/auth/login?portal=${portal}`;
  };

  const config = isDF
    ? {
        title: 'Data Fiduciary Portal',
        subtitle: 'Manage consents, compliance & data processing under DPDP Act 2023',
        welcome: 'Fiduciary Login',
        buttonLabel: 'Login as Data Fiduciary',
        gradientFrom: 'from-indigo-50',
        gradientTo: 'to-purple-100',
        accentBg: 'bg-indigo-600',
        buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
        features: [
          'Review and manage consent requests',
          'Monitor compliance dashboards & analytics',
          'Manage data processing purposes & versions',
          'Handle erasure & correction requests',
          'Register and oversee data processors',
        ],
      }
    : {
        title: 'Data Principal Dashboard',
        subtitle: 'Secure Consent Management under DPDP Act 2023',
        welcome: 'Welcome Back',
        buttonLabel: 'Login with Aadhaar / DigiLocker',
        gradientFrom: 'from-blue-50',
        gradientTo: 'to-indigo-100',
        accentBg: 'bg-blue-600',
        buttonBg: 'bg-blue-600 hover:bg-blue-700',
        features: [
          'View and manage your consent records',
          'Grant or revoke data access permissions',
          'Request data erasure (Right to be Forgotten)',
          'Request correction of your personal data',
          'Download consent receipts and export your data',
        ],
      };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center p-4`}>
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img
            src="/concurin_logo.png"
            alt="Concurin"
            className="h-12 mx-auto mb-4"
            onError={(e) => {
              // Fallback if logo not yet added
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {config.title}
          </h1>
          <p className="text-gray-600">
            {config.subtitle}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {config.welcome}
          </h2>

          <div className="space-y-4">
            {/* Login Button */}
            <button
              onClick={handleLogin}
              className={`w-full ${config.buttonBg} text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3 shadow-md`}
            >
              <span className="text-2xl">{isDF ? '🏢' : '🇮🇳'}</span>
              <span>{config.buttonLabel}</span>
            </button>

            {/* Info Text */}
            <p className="text-sm text-gray-500 text-center mt-4">
              Secure authentication via OAuth2
            </p>
          </div>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              After logging in, you can:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {config.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 underline">
            ← Back to portal selection
          </Link>
          <p className="text-sm text-gray-600 mt-3">
            Protected by <span className="font-semibold">DPDP Act 2023</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Your data rights are protected by Indian law
          </p>
        </div>
      </div>
    </div>
  );
}
