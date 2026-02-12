import { useConsents } from '@hooks/useConsents';
import { ConsentStatusBadge } from '@components/consent/ConsentStatusBadge';
import { formatDate, getDaysRemaining } from '@utils/date.utils';
import { Link } from 'react-router-dom';

export function DfDashboardPage() {
  const { data: allData, isLoading } = useConsents({ limit: 200 });
  const consents = allData?.data || [];

  // Compute analytics
  const total = consents.length;
  const active = consents.filter((c) => c.status === 'ACTIVE');
  const expired = consents.filter((c) => c.status === 'EXPIRED');
  const revoked = consents.filter((c) => c.status === 'REVOKED');
  const requested = consents.filter((c) => c.status === 'REQUESTED');

  // Expiring within 7 days
  const expiringSoon = active.filter((c) => {
    const days = getDaysRemaining(c.validUntil);
    return days >= 0 && days <= 7;
  });

  // Purpose breakdown
  const purposeMap = new Map<string, number>();
  consents.forEach((c) => {
    purposeMap.set(c.purpose, (purposeMap.get(c.purpose) || 0) + 1);
  });
  const purposeBreakdown = Array.from(purposeMap.entries())
    .sort((a, b) => b[1] - a[1]);

  // Data types frequency
  const dtMap = new Map<string, number>();
  consents.forEach((c) => {
    c.dataTypes.forEach((dt) => {
      dtMap.set(dt, (dtMap.get(dt) || 0) + 1);
    });
  });
  const dataTypeBreakdown = Array.from(dtMap.entries())
    .sort((a, b) => b[1] - a[1]);

  // Language distribution
  const langMap = new Map<string, number>();
  consents.forEach((c) => {
    const lang = c.language || 'unknown';
    langMap.set(lang, (langMap.get(lang) || 0) + 1);
  });

  // Revocation rate
  const revocationRate = total > 0 ? ((revoked.length / total) * 100).toFixed(1) : '0';

  // Recent consents (last 5)
  const recentConsents = [...consents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Fiduciary Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consent analytics &amp; compliance overview — DPDP Act 2023
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Consents</p>
          <p className="text-3xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-3xl font-bold text-success">{active.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Revocation Rate</p>
          <p className="text-3xl font-bold text-error">{revocationRate}%</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Expiring Soon</p>
          <p className={`text-3xl font-bold ${expiringSoon.length > 0 ? 'text-warning' : 'text-gray-400'}`}>
            {expiringSoon.length}
          </p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Consent Status Distribution</h2>
        <div className="space-y-3">
          {[
            { label: 'Active', count: active.length, color: 'bg-green-500', status: 'ACTIVE' as const },
            { label: 'Expired', count: expired.length, color: 'bg-yellow-500', status: 'EXPIRED' as const },
            { label: 'Revoked', count: revoked.length, color: 'bg-red-500', status: 'REVOKED' as const },
            { label: 'Requested', count: requested.length, color: 'bg-blue-500', status: 'REQUESTED' as const },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="w-24">
                <ConsentStatusBadge status={item.status} size="sm" />
              </div>
              <div className="flex-1">
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: total > 0 ? `${(item.count / total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium w-16 text-right">
                {item.count} ({total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purpose Breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">By Purpose</h2>
          {purposeBreakdown.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2">
              {purposeBreakdown.map(([purpose, count]) => (
                <div key={purpose} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700 truncate flex-1 mr-4">{purpose}</span>
                  <span className="text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Types Frequency */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Data Types Shared</h2>
          {dataTypeBreakdown.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dataTypeBreakdown.map(([dt, count]) => (
                <span
                  key={dt}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {dt} <span className="text-blue-500">({count})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Language Distribution */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Language Distribution</h2>
        <div className="flex gap-4 flex-wrap">
          {Array.from(langMap.entries()).map(([lang, count]) => (
            <div key={lang} className="text-center px-6 py-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 uppercase">{lang}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <div className="card border-l-4 border-l-yellow-500 bg-yellow-50">
          <h2 className="text-lg font-semibold mb-3 text-yellow-800">
            ⚠️ Consents Expiring Within 7 Days
          </h2>
          <div className="space-y-2">
            {expiringSoon.map((c) => (
              <div key={c.consentId} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">{c.purpose}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    — expires {formatDate(c.validUntil)}
                  </span>
                </div>
                <Link
                  to={`/consents/${c.consentId}`}
                  className="text-sm text-primary hover:underline"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Consents */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Consents</h2>
          <Link to="/consents" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Granted</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentConsents.map((c) => (
                <tr key={c.consentId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">{c.purpose}</td>
                  <td className="px-4 py-2">
                    <ConsentStatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/consents/${c.consentId}`} className="text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="card bg-gray-50 text-center py-6">
        <p className="text-sm text-gray-600">
          📜 All consent operations are audited per <strong>DPDP Act 2023 §6</strong> requirements.
        </p>
        <Link to="/activity-log" className="text-sm text-primary hover:underline mt-2 inline-block">
          View Audit Trail →
        </Link>
      </div>
    </div>
  );
}
