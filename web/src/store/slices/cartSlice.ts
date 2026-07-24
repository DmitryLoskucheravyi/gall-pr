import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type CartState = {
  count: number;
};

const initialState: CartState = { count: 0 };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    },
  },
});

export const { setCartCount } = cartSlice.actions;
export default cartSlice.reducer;
