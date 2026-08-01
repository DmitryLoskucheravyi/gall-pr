import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usersService } from '../../api/users.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      store.dispatch(showToast({ message: 'Користувача видалено' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося видалити користувача',
          variant: 'error',
        }),
      );
    },
  });
}
