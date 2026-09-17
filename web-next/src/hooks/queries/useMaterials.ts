import { useQuery } from '@tanstack/react-query';

import { materialsService } from '../../api/materials.api';
import { queryKeys } from '../../lib/queryKeys';

export function useMaterials() {
  return useQuery({
    queryKey: queryKeys.materials.list(),
    queryFn: () => materialsService.getMaterials(),
    staleTime: 5 * 60_000,
  });
}
