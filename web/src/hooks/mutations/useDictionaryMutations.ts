import { useMutation, useQueryClient } from '@tanstack/react-query';

import { materialsService } from '../../api/materials.api';
import { techniquesService } from '../../api/techniques.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';

type DictionaryInput = { name: string; nameEn?: string };

type DictionaryService = {
  create: (input: DictionaryInput) => Promise<unknown>;
  update: (id: number, input: DictionaryInput) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
};

function onSaveError(error: any) {
  store.dispatch(
    showToast({
      message: error?.response?.data?.message ?? 'Не вдалося зберегти',
      variant: 'error',
    }),
  );
}

function onDeleteError(error: any) {
  store.dispatch(
    showToast({
      message: error?.response?.data?.message ?? 'Не вдалося видалити',
      variant: 'error',
    }),
  );
}

function useDictionaryCrud(service: DictionaryService, listKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: listKey });

  const create = useMutation({
    mutationFn: (input: DictionaryInput) => service.create(input),
    onSuccess: () => {
      invalidate();
      store.dispatch(showToast({ message: 'Збережено' }));
    },
    onError: onSaveError,
  });

  const update = useMutation({
    mutationFn: ({ id, ...input }: { id: number } & DictionaryInput) =>
      service.update(id, input),
    onSuccess: () => {
      invalidate();
      store.dispatch(showToast({ message: 'Збережено' }));
    },
    onError: onSaveError,
  });

  const remove = useMutation({
    mutationFn: (id: number) => service.remove(id),
    onSuccess: () => {
      invalidate();
      store.dispatch(showToast({ message: 'Видалено' }));
    },
    onError: onDeleteError,
  });

  return { create, update, remove };
}

export function useMaterialMutations() {
  return useDictionaryCrud(
    {
      create: (input) => materialsService.createMaterial(input),
      update: (id, input) => materialsService.updateMaterial(id, input),
      remove: (id) => materialsService.deleteMaterial(id),
    },
    queryKeys.materials.list(),
  );
}

export function useTechniqueMutations() {
  return useDictionaryCrud(
    {
      create: (input) => techniquesService.createTechnique(input),
      update: (id, input) => techniquesService.updateTechnique(id, input),
      remove: (id) => techniquesService.deleteTechnique(id),
    },
    queryKeys.techniques.list(),
  );
}
