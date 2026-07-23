import { create } from 'zustand';

type ToastStore = {
  message: string | null;
  token: number;
  show: (message: string) => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  token: 0,
  show: (message) => set((state) => ({ message, token: state.token + 1 })),
}));
