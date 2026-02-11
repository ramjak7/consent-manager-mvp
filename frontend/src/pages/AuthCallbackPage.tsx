import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Get authorization code from URL
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      // Check for authorization code
      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        // Call backend to exchange code for token
        // Backend will handle the OAuth2 code exchange and set httpOnly cookie
        const response = await fetch(`/auth/callback?code=${code}`, {
          method: 'GET',
          credentials: 'include', // Important: include cookies
        });

        if (response.ok) {
          // Successfully authenticated, redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          const data = await response.json();
          setError(data.message || 'Authentication failed');
        }
      } catch (err) {
        setError('Network error during authentication');
        console.error('Auth callback error:', err);
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
