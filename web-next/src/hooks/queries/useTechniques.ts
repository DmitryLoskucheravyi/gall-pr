import { useQuery } from '@tanstack/react-query';

import { techniquesService } from '../../api/techniques.api';
import { queryKeys } from '../../lib/queryKeys';

export function useTechniques() {
  return useQuery({
    queryKey: queryKeys.techniques.list(),
    queryFn: () => techniquesService.getTechniques(),
    staleTime: 5 * 60_000,
  });
}
