export function LoginPage() {
  const handleLogin = () => {
    // Redirect to backend OAuth2 endpoint
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/auth/login`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <span className="text-3xl text-white">🔐</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Data Principal Dashboard
          </h1>
          <p className="text-gray-600">
            Secure Consent Management under DPDP Act 2023
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Welcome Back
          </h2>

          <div className="space-y-4">
            {/* OAuth2 Login Button */}
            <button
              onClick={handleLogin}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3 shadow-md"
            >
              <span className="text-2xl">🇮🇳</span>
              <span>Login with Aadhaar / DigiLocker</span>
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
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">✓</span>
                <span>View and manage your consent records</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">✓</span>
                <span>Grant or revoke data access permissions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">✓</span>
                <span>Request data erasure (Right to be Forgotten)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5">✓</span>
                <span>Download consent receipts for your records</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
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
