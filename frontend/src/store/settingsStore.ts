import { create } from 'zustand';

import { settingsService } from '../api/settings.api';

type SettingsStore = {
  authorName: string;
  refresh: () => Promise<void>;
  setAuthorName: (authorName: string) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  authorName: '',

  refresh: async () => {
    try {
      const settings = await settingsService.getSettings();
      set({ authorName: settings.authorName });
    } catch {
      // keep previous value on failure
    }
  },

  setAuthorName: (authorName) => set({ authorName }),
}));
