import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useCurrentUser } from '@hooks/useAuth';
import { authApi } from '@api/auth.api';

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { data: user } = useCurrentUser();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout anyway
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-xl text-white">🔐</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Data Principal Dashboard
                </h1>
                <p className="text-xs text-gray-500">DPDP Act 2023 Compliance</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children || <Outlet />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              Protected by <span className="font-semibold">DPDP Act 2023</span> |
              Your data rights matter
            </p>
            <p className="text-xs text-gray-500 mt-1">
              © 2026 Government of India. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
