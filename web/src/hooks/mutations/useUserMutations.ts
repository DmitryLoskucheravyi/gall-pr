import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usersService } from '../../api/users.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import { setUser } from '../../store/slices/authSlice';

export function useTelegramLinkMutation() {
  return useMutation({
    mutationFn: () => usersService.generateTelegramLinkCode(),
    onError: () => {
      store.dispatch(
        showToast({
          message: 'Не вдалося згенерувати посилання. Спробуйте ще раз',
          variant: 'error',
        }),
      );
    },
  });
}

export function useRedeemTelegramLinkCodeMutation() {
  return useMutation({
    mutationFn: (code: string) => usersService.redeemTelegramLinkCode(code),
    onSuccess: (user) => {
      store.dispatch(setUser(user));
      store.dispatch(showToast({ message: 'Telegram підключено!' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Невірний або застарілий код',
          variant: 'error',
        }),
      );
    },
  });
}

export function useResetTelegramLinkMutation() {
  return useMutation({
    mutationFn: () => usersService.resetTelegramLink(),
    onSuccess: (user) => {
      store.dispatch(setUser(user));
      store.dispatch(showToast({ message: "Прив'язку Telegram скинуто" }));
    },
    onError: () => {
      store.dispatch(
        showToast({ message: 'Не вдалося скинути прив\'язку', variant: 'error' }),
      );
    },
  });
}

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
