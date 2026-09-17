import { useMutation, useQueryClient } from '@tanstack/react-query';

import { seriesService } from '../../api/series.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import { apiErrorMessage } from '../../utils/apiError';
import type { SeriesInput } from '../../types/series.types';

// Every series write invalidates the paintings as well: a painting carries its
// series eagerly, so renaming or deleting one changes what every card shows.
function invalidateSeries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.paintings.all });
}

export function useCreateSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SeriesInput) => seriesService.createSeries(input),
    onSuccess: (series) => {
      invalidateSeries(queryClient);
      store.dispatch(showToast({ message: `Серію «${series.name}» створено` }));
    },
    onError: (error: unknown) => {
      store.dispatch(
        showToast({
          message: apiErrorMessage(error, 'Не вдалося створити серію'),
          variant: 'error',
        }),
      );
    },
  });
}

export function useUpdateSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<SeriesInput> }) =>
      seriesService.updateSeries(id, input),
    onSuccess: () => {
      invalidateSeries(queryClient);
      store.dispatch(showToast({ message: 'Серію збережено' }));
    },
    onError: (error: unknown) => {
      store.dispatch(
        showToast({
          message: apiErrorMessage(error, 'Не вдалося зберегти серію'),
          variant: 'error',
        }),
      );
    },
  });
}

export function useDeleteSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => seriesService.deleteSeries(id),
    onSuccess: (result: { releasedPaintings?: number }) => {
      invalidateSeries(queryClient);
      // The count matters: deleting a series releases its works rather than
      // deleting them, and saying so is what stops that being frightening.
      const released = result.releasedPaintings ?? 0;
      store.dispatch(
        showToast({
          message: released
            ? `Серію видалено, ${released} робіт лишилися в каталозі`
            : 'Серію видалено',
        }),
      );
    },
    onError: (error: unknown) => {
      store.dispatch(
        showToast({
          message: apiErrorMessage(error, 'Не вдалося видалити серію'),
          variant: 'error',
        }),
      );
    },
  });
}

// Moving one painting into a series (or out of it, with null) from the
// painting's own page. Goes through the painting's own PATCH rather than the
// series' membership route, because it is a change to this one work.
export function useAssignPaintingToSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paintingId,
      seriesId,
    }: {
      paintingId: number;
      seriesId: number | null;
    }) => {
      const { paintingsService } = await import('../../api/paintings.api');
      return paintingsService.updatePainting(paintingId, { seriesId });
    },
    onSuccess: () => {
      invalidateSeries(queryClient);
    },
    onError: (error: unknown) => {
      store.dispatch(
        showToast({
          message: apiErrorMessage(error, 'Не вдалося змінити серію роботи'),
          variant: 'error',
        }),
      );
    },
  });
}
