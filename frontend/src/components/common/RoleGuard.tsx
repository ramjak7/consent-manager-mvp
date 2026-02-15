import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@hooks/useAuth';
import { LoadingSpinner } from '@components/common/LoadingSpinner';

interface RoleGuardProps {
  children: ReactNode;
  /** At least one of these roles must be present */
  allowedRoles: string[];
  /** Where to redirect if role check fails */
  fallback?: string;
}

/**
 * Route guard that checks user roles before rendering children.
 * Used to protect DF routes from DP users and vice versa.
 */
export function RoleGuard({ children, allowedRoles, fallback = '/' }: RoleGuardProps) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Checking permissions..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user.roles?.map((r) => r.roleName) || [];
  const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You do not have the required role to access this section.
            </p>
            <a href={fallback} className="btn-primary inline-block">
              Go Back
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
