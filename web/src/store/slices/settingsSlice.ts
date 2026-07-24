import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type SettingsState = {
  authorName: string;
};

const initialState: SettingsState = { authorName: '' };

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setAuthorName: (state, action: PayloadAction<string>) => {
      state.authorName = action.payload;
    },
  },
});

export const { setAuthorName } = settingsSlice.actions;
export default settingsSlice.reducer;
