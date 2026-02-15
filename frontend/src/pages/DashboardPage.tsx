import { useCurrentUser } from '@hooks/useAuth';
import { useConsents } from '@hooks/useConsents';
import { ConsentStatusBadge } from '@components/consent/ConsentStatusBadge';
import { Link, useNavigate } from 'react-router-dom';
import { consentApi } from '@api/consent.api';
import { toast } from 'sonner';
import { useState } from 'react';

export function DashboardPage() {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  
  // Fetch all consents to calculate counts
  const { data: consentsData } = useConsents({ limit: 100 }); // Fetch more to get accurate counts
  const consents = consentsData?.data || [];
  
  // Calculate counts by status
  const activeCount = consents.filter(c => c.status === 'ACTIVE').length;
  const expiredCount = consents.filter(c => c.status === 'EXPIRED').length;
  const revokedCount = consents.filter(c => c.status === 'REVOKED').length;

  return (
    <div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Active Consents</p>
                <p className="text-3xl font-bold text-success">{activeCount}</p>
              </div>
              <ConsentStatusBadge status="ACTIVE" size="lg" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Expired Consents</p>
                <p className="text-3xl font-bold text-warning">{expiredCount}</p>
              </div>
              <ConsentStatusBadge status="EXPIRED" size="lg" />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Revoked Consents</p>
                <p className="text-3xl font-bold text-error">{revokedCount}</p>
              </div>
              <ConsentStatusBadge status="REVOKED" size="lg" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => navigate('/dp/grant-consent')} className="btn-primary">Grant New Consent</button>
            <Link to="/dp/erasure-request" className="btn-danger">
              Request Data Erasure
            </Link>
            <Link to="/dp/consents" className="btn-secondary">
              View All Consents
            </Link>
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  await consentApi.exportData('json');
                  toast.success('Data exported successfully');
                } catch {
                  toast.error('Export failed');
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="btn-secondary"
            >
              {exporting ? 'Exporting...' : '⬇ Export My Data (JSON)'}
            </button>
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  await consentApi.exportData('csv');
                  toast.success('CSV exported successfully');
                } catch {
                  toast.error('Export failed');
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className="btn-secondary"
            >
              {exporting ? 'Exporting...' : '⬇ Export Consents (CSV)'}
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Your Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-mono text-sm">{user?.userId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Roles</p>
              <div className="flex gap-2 mt-1">
                {user?.roles.map((role) => (
                  <span
                    key={role.roleName}
                    className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm font-medium"
                  >
                    {role.roleName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Log Section */}
        <div className="card mt-8 bg-blue-50 border-blue-200">
          <div className="text-center py-8">
            <p className="text-2xl mb-2">📊</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Activity Log
            </h3>
            <p className="text-gray-600 mb-4">
              View your complete activity history and audit trail.
            </p>
            <Link to="/dp/activity-log" className="btn-secondary">
              View Activity Log
            </Link>
          </div>
        </div>
      </div>
  );
}
