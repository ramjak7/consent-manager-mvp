import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';
import { authApi } from '@api/auth.api';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      // P1-7: Cookie-only auth — the httpOnly cookie was set by the backend
      // during the /auth/callback redirect. No token in URL needed.
      // Fetch user profile to determine role-based redirect.
      try {
        const user = await authApi.getCurrentUser();
        const roles = user.roles?.map((r: { roleName: string }) => r.roleName) ?? [];
        if (roles.includes('DF_CLIENT') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN')) {
          navigate('/df/dashboard', { replace: true });
        } else {
          navigate('/dp/dashboard', { replace: true });
        }
      } catch {
        // If profile fetch fails, default to DP dashboard
        navigate('/dp/dashboard', { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorMessage error={error} />
          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" message="Completing authentication..." />
        <p className="text-sm text-gray-500 mt-4">
          Please wait while we verify your credentials
        </p>
      </div>
    </div>
  );
}
