import { useQuery } from '@tanstack/react-query';

import { giveawaysService } from '../../api/giveaways.api';
import { queryKeys } from '../../lib/queryKeys';

export function useGiveaways() {
  return useQuery({
    queryKey: queryKeys.giveaways.lists(),
    queryFn: () => giveawaysService.getGiveaways(),
    staleTime: 60_000,
  });
}
