import { create } from 'zustand';

type UIStore = {
  isMenuOpen: boolean;

  openMenu: () => void;
  closeMenu: () => void;
};

export const useUIStore = create<UIStore>((set) => ({
  isMenuOpen: false,

  openMenu: () => set({ isMenuOpen: true }),
  closeMenu: () => set({ isMenuOpen: false }),
}));
