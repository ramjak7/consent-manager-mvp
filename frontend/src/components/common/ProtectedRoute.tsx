import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@hooks/useAuth';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import type { AxiosError } from 'axios';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: user, isLoading, error } = useCurrentUser();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen message="Checking authentication..." />;
  }

  // If authentication failed (401), redirect to login
  if (error) {
    // Check if it's an authentication error
    const axiosError = error as AxiosError;
    const isAuthError = axiosError.response?.status === 401;

    if (isAuthError) {
      return <Navigate to="/login" replace />;
    }

    // For other errors, show error message
    const errorMessage = axiosError.message || 'An unexpected error occurred';
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-error-light border border-error rounded-lg p-6">
            <h3 className="text-error font-semibold mb-2">Error Loading Profile</h3>
            <p className="text-gray-700 text-sm mb-4">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // Fallback: redirect to login
  return <Navigate to="/login" replace />;
}
