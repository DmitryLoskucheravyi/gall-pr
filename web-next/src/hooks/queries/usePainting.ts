import { useQuery } from '@tanstack/react-query';

import { paintingsService } from '../../api/paintings.api';
import { queryKeys } from '../../lib/queryKeys';

// `enabled` used to be `!!id`, which is false for NaN — so /painting/anything
// disabled the query outright and the page sat in its loading skeleton
// forever, with no error and no way out. A non-numeric id is a request that
// cannot succeed, so it has to reach the error branch rather than the pending
// one.
export function usePainting(id: number | undefined) {
  const valid = typeof id === 'number' && Number.isInteger(id) && id > 0;

  return useQuery({
    queryKey: queryKeys.paintings.detail(id ?? 0),
    queryFn: ({ signal }) => {
      if (!valid) {
        throw new Error(`Not a painting id: ${String(id)}`);
      }

      return paintingsService.getPainting(id as number, signal);
    },
    // Retrying a malformed id would only fail the same way three more times.
    retry: valid ? undefined : false,
  });
}
