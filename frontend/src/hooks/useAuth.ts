import { useQuery } from '@tanstack/react-query';
import { authApi } from '@api/auth.api';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry — 401 for unauthenticated users is expected
  });
}
