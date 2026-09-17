import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastVariant = 'success' | 'error';

type ToastState = {
  message: string | null;
  variant: ToastVariant;
  token: number;
};

const initialState: ToastState = {
  message: null,
  variant: 'success',
  token: 0,
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (
      state,
      action: PayloadAction<{ message: string; variant?: ToastVariant }>,
    ) => {
      state.message = action.payload.message;
      state.variant = action.payload.variant ?? 'success';
      state.token += 1;
    },
  },
});

export const { showToast } = toastSlice.actions;
export default toastSlice.reducer;
