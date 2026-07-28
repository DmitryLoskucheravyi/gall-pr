import { useQuery } from '@tanstack/react-query';

import { paintingsService } from '../../api/paintings.api';
import { queryKeys } from '../../lib/queryKeys';

export function usePainting(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.paintings.detail(id ?? 0),
    queryFn: ({ signal }) => paintingsService.getPainting(id as number, signal),
    enabled: !!id,
  });
}
