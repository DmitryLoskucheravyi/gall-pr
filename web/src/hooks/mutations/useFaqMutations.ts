import { useMutation, useQueryClient } from '@tanstack/react-query';

import { faqService } from '../../api/faq.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { FaqMap } from '../../types/faq.types';

function useFaqMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<FaqMap>,
  errorMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (faq) => {
      queryClient.setQueryData(queryKeys.faq.all, faq);
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? errorMessage,
          variant: 'error',
        }),
      );
    },
  });
}

export function useCreateFaqItemMutation() {
  return useFaqMutation(
    (dto: { title: string; text: string }) => faqService.createItem(dto),
    'Не вдалося додати запитання',
  );
}

export function useUpdateFaqItemMutation() {
  return useFaqMutation(
    (vars: { id: string; dto: { title?: string; text?: string } }) =>
      faqService.updateItem(vars.id, vars.dto),
    'Не вдалося зберегти запитання',
  );
}

export function useDeleteFaqItemMutation() {
  return useFaqMutation(
    (id: string) => faqService.deleteItem(id),
    'Не вдалося видалити запитання',
  );
}

export function useReorderFaqMutation() {
  return useFaqMutation(
    (order: Record<string, number>) => faqService.reorder(order),
    'Не вдалося змінити порядок',
  );
}
