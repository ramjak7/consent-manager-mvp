import { type AuditLog, type ActivityLogListResponse } from '../types/activityLog.types';
import { apiClient } from './client';

export interface GetActivityLogsParams {
  page?: number;
  limit?: number;
}

/**
 * Get activity logs for the current user
 */
export async function getActivityLogs(
  params?: GetActivityLogsParams
): Promise<{ logs: AuditLog[]; pagination?: any }> {
  const queryParams = new URLSearchParams();
  
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const url = `/api/v1/activity-log${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  const response = await apiClient.get<ActivityLogListResponse>(url);
  
  return {
    logs: response.data.data,
    pagination: response.data.pagination,
  };
}
