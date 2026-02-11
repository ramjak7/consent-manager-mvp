import type { ConsentStatus } from '../../types/consent.types';

interface ConsentStatusBadgeProps {
  status: ConsentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function ConsentStatusBadge({
  status,
  size = 'md',
}: ConsentStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const statusConfig = {
    ACTIVE: {
      icon: '✅',
      label: 'Active',
      className: 'badge-active',
    },
    EXPIRED: {
      icon: '⏰',
      label: 'Expired',
      className: 'badge-expired',
    },
    REVOKED: {
      icon: '❌',
      label: 'Revoked',
      className: 'badge-revoked',
    },
    REQUESTED: {
      icon: '🕐',
      label: 'Requested',
      className: 'bg-blue-100 text-blue-700',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${config.className} ${sizeClasses[size]}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
