import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { correctionRequestApi } from '@api/correctionRequest.api';
import type { CreateCorrectionRequestPayload } from '../types/correctionRequest.types';

export function useCorrectionRequests() {
  return useQuery({
    queryKey: ['correctionRequests'],
    queryFn: correctionRequestApi.getAll,
  });
}

export function useCorrectionRequest(id: string) {
  return useQuery({
    queryKey: ['correctionRequests', id],
    queryFn: () => correctionRequestApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCorrectionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCorrectionRequestPayload) =>
      correctionRequestApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['correctionRequests'] });
    },
  });
}
