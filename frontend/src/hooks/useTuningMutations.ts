import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { customTuningsQueryKey } from '@/hooks/useCustomTunings';
import type { TuningRequestDto } from '@/types/api';

/**
 * Mutations for tuning rename and delete operations. Both invalidate the
 * customTuningsQueryKey to trigger a refetch and immediate UI update.
 */

export function useRenameTuning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, strings }: { id: number; name: string; strings: string[] }) => {
      await apiClient.patch(`/tunings/${id}`, { name, strings } as TuningRequestDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customTuningsQueryKey });
    },
  });
}

export function useDeleteTuning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.del(`/tunings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customTuningsQueryKey });
    },
  });
}
