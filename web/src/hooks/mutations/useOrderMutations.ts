import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ordersService } from '../../api/orders.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';
import type { OrderStatus, PaymentStatus } from '../../types/order.types';

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => ordersService.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      store.dispatch(showToast({ message: 'Замовлення скасовано' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося скасувати замовлення',
          variant: 'error',
        }),
      );
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      trackingNumber,
    }: {
      id: number;
      status: OrderStatus;
      trackingNumber?: string;
    }) => ordersService.updateStatus(id, status, trackingNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      store.dispatch(showToast({ message: 'Статус оновлено' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message: error?.response?.data?.message ?? 'Не вдалося змінити статус',
          variant: 'error',
        }),
      );
    },
  });
}

export function useUpdatePaymentStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: number; paymentStatus: PaymentStatus }) =>
      ordersService.updatePaymentStatus(id, paymentStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      store.dispatch(showToast({ message: 'Статус оплати оновлено' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося змінити статус оплати',
          variant: 'error',
        }),
      );
    },
  });
}

export function useUploadPaymentProofMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      ordersService.uploadPaymentProof(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      store.dispatch(
        showToast({ message: 'Скрін оплати надіслано, очікуйте підтвердження' }),
      );
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося надіслати скрін оплати',
          variant: 'error',
        }),
      );
    },
  });
}

export function useArchiveOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => ordersService.archiveOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      store.dispatch(showToast({ message: 'Прибрано з активного перегляду' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося прибрати замовлення',
          variant: 'error',
        }),
      );
    },
  });
}

export function useDeleteOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => ordersService.deleteOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      store.dispatch(showToast({ message: 'Замовлення видалено' }));
    },
    onError: (error: any) => {
      store.dispatch(
        showToast({
          message:
            error?.response?.data?.message ?? 'Не вдалося видалити замовлення',
          variant: 'error',
        }),
      );
    },
  });
}
