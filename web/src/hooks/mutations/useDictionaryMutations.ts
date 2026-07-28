import { useMutation, useQueryClient } from '@tanstack/react-query';

import { materialsService } from '../../api/materials.api';
import { techniquesService } from '../../api/techniques.api';
import { queryKeys } from '../../lib/queryKeys';
import { store } from '../../store';
import { showToast } from '../../store/slices/toastSlice';

type DictionaryService = {
  create: (name: string) => Promise<unknown>;
  update: (id: number, name: string) => Promise<unknown>;
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
    mutationFn: (name: string) => service.create(name),
    onSuccess: () => {
      invalidate();
      store.dispatch(showToast({ message: 'Збережено' }));
    },
    onError: onSaveError,
  });

  const update = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => service.update(id, name),
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
      create: (name) => materialsService.createMaterial(name),
      update: (id, name) => materialsService.updateMaterial(id, name),
      remove: (id) => materialsService.deleteMaterial(id),
    },
    queryKeys.materials.list(),
  );
}

export function useTechniqueMutations() {
  return useDictionaryCrud(
    {
      create: (name) => techniquesService.createTechnique(name),
      update: (id, name) => techniquesService.updateTechnique(id, name),
      remove: (id) => techniquesService.deleteTechnique(id),
    },
    queryKeys.techniques.list(),
  );
}
