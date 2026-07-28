import { useQuery } from '@tanstack/react-query';

import { newsService } from '../../api/news.api';
import { queryKeys } from '../../lib/queryKeys';

export function useNews() {
  return useQuery({
    queryKey: queryKeys.news.list(),
    queryFn: () => newsService.getNews(),
    staleTime: 60_000,
  });
}
