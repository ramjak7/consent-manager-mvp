import type { ReactNode } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@hooks/useAuth';
import { authApi } from '@api/auth.api';

interface LayoutProps {
  children?: ReactNode;
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/consents', label: 'My Consents', icon: '📋' },
  { to: '/grant-consent', label: 'Grant Consent', icon: '✅' },
  { to: '/erasure-request', label: 'Erasure Request', icon: '🗑️' },
  { to: '/erasure-requests', label: 'My Requests', icon: '📝' },
  { to: '/activity-log', label: 'Activity Log', icon: '📊' },
  { to: '/df-dashboard', label: 'DF Analytics', icon: '📈' },
];

export function Layout({ children }: LayoutProps) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      queryClient.clear();
      localStorage.removeItem('auth_token');
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar Navigation */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <nav className="card p-2 sticky top-8">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden w-full mb-4">
          <div className="card p-2 overflow-x-auto">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children || <Outlet />}
        </main>
      </div>

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
