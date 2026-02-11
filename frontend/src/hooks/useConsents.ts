import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consentApi } from '../api/consent.api';
import type { GetConsentsParams } from '../api/consent.api';
import type { ConsentListResponse, Consent } from '../types/consent.types';

/**
 * Hook to fetch consents with filters and pagination
 */
export function useConsents(params?: GetConsentsParams) {
  return useQuery<ConsentListResponse>({
    queryKey: ['consents', params],
    queryFn: () => consentApi.getConsents(params),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch a single consent by ID
 */
export function useConsent(consentId: string) {
  return useQuery<Consent>({
    queryKey: ['consent', consentId],
    queryFn: () => consentApi.getConsentById(consentId),
    enabled: !!consentId,
  });
}

/**
 * Hook to revoke a consent
 */
export function useRevokeConsent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consentId: string) => consentApi.revokeConsent(consentId),
    onSuccess: () => {
      // Invalidate and refetch consents list
      queryClient.invalidateQueries({ queryKey: ['consents'] });
    },
  });
}
