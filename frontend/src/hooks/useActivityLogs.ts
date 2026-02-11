import { useQuery } from '@tanstack/react-query';
import { type AxiosError } from 'axios';
import { type AuditLog } from '../types/activityLog.types';
import { getActivityLogs, type GetActivityLogsParams } from '@api/activityLog.api';

/**
 * Hook to fetch activity logs for the current user
 */
export function useActivityLogs(params?: GetActivityLogsParams) {
  return useQuery<{ logs: AuditLog[]; pagination?: any }, AxiosError>({
    queryKey: ['activityLogs', params],
    queryFn: () => getActivityLogs(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
