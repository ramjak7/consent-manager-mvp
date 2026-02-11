import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type AxiosError } from 'axios';
import { type CreateErasureRequestInput, type ErasureRequest } from '../types/erasureRequest.types';
import { createErasureRequest, getErasureRequests, getErasureRequestById } from '@api/erasureRequest.api';

/**
 * Hook to fetch all erasure requests for the current user
 */
export function useErasureRequests() {
  return useQuery<ErasureRequest[], AxiosError>({
    queryKey: ['erasureRequests'],
    queryFn: getErasureRequests,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a single erasure request by ID
 */
export function useErasureRequest(requestId: string | undefined) {
  return useQuery<ErasureRequest, AxiosError>({
    queryKey: ['erasureRequest', requestId],
    queryFn: () => getErasureRequestById(requestId!),
    enabled: !!requestId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new erasure request
 */
export function useCreateErasureRequest() {
  const queryClient = useQueryClient();

  return useMutation<ErasureRequest, AxiosError, CreateErasureRequestInput>({
    mutationFn: createErasureRequest,
    onSuccess: () => {
      // Invalidate erasure requests list to refetch
      queryClient.invalidateQueries({ queryKey: ['erasureRequests'] });
    },
  });
}
