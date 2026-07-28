import { useQuery } from '@tanstack/react-query';

import { paintingsService } from '../../api/paintings.api';
import { queryKeys } from '../../lib/queryKeys';
import type { Painting } from '../../types/painting.types';

export function useRelatedPaintings(painting: Painting | undefined) {
  const paintingId = painting?.id;
  const techniqueId = painting?.techniqueId ?? null;
  const baseKey = queryKeys.paintings.related(paintingId ?? 0, techniqueId);

  const sameTechniqueQuery = useQuery({
    queryKey: [...baseKey, 'same-technique'],
    queryFn: ({ signal }) =>
      paintingsService.getPaintings(1, 8, techniqueId as number, true, undefined, undefined, signal),
    enabled: !!paintingId && !!techniqueId,
  });

  const sameTechniqueResults = (sameTechniqueQuery.data?.data ?? []).filter(
    (item) => item.id !== paintingId,
  );

  const needsFallback =
    !!paintingId &&
    (!techniqueId || (sameTechniqueQuery.isSuccess && sameTechniqueResults.length === 0));

  const fallbackQuery = useQuery({
    queryKey: [...baseKey, 'fallback'],
    queryFn: ({ signal }) =>
      paintingsService.getPaintings(1, 8, undefined, true, undefined, undefined, signal),
    enabled: needsFallback,
  });

  const fallbackResults = (fallbackQuery.data?.data ?? []).filter(
    (item) => item.id !== paintingId,
  );

  const related = sameTechniqueResults.length > 0 ? sameTechniqueResults : fallbackResults;
  const isLoading = sameTechniqueQuery.isLoading || (needsFallback && fallbackQuery.isLoading);

  return { related, isLoading };
}
