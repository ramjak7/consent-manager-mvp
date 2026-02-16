import type { ReactNode } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@hooks/useAuth';
import { authApi } from '@api/auth.api';

interface DfLayoutProps {
  children?: ReactNode;
}

const dfNavItems = [
  { to: '/df/dashboard', label: 'Analytics', icon: '📈' },
  { to: '/df/consents', label: 'All Consents', icon: '📋' },
  { to: '/df/notices', label: 'Notices', icon: '📄' },
  { to: '/df/purposes', label: 'Purposes', icon: '🎯' },
  { to: '/df/processors', label: 'Processors', icon: '🏭' },
  { to: '/df/erasure-requests', label: 'Erasure Requests', icon: '🗑️' },
  { to: '/df/correction-requests', label: 'Corrections', icon: '✏️' },
  { to: '/df/audit-trail', label: 'Audit Trail', icon: '📜' },
  { to: '/df/usage', label: 'Usage & Billing', icon: '📊' },
  { to: '/df/api-keys', label: 'API Keys', icon: '🔑' },
  { to: '/df/organization', label: 'Organization', icon: '🏢' },
  { to: '/df/branding', label: 'Branding', icon: '🎨' },
  { to: '/df/sso', label: 'SSO / SAML', icon: '🔐' },
];

export function DfLayout({ children }: DfLayoutProps) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      queryClient.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-900 shadow-sm border-b border-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-xl text-white">🏢</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Data Fiduciary Console
                </h1>
                <p className="text-xs text-indigo-300">DPDP Act 2023 Compliance</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-white">
                      {user.name}
                    </p>
                    <p className="text-xs text-indigo-300">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-indigo-700 hover:bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
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
              {dfNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white'
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
              <span className="font-semibold">Data Fiduciary Console</span> |
              DPDP Act 2023 Compliant
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
