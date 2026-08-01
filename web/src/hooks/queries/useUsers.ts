import { useQuery } from '@tanstack/react-query';

import { usersService } from '../../api/users.api';
import { queryKeys } from '../../lib/queryKeys';

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.users.admin(),
    queryFn: () => usersService.getUsers(),
    staleTime: 10_000,
  });
}
