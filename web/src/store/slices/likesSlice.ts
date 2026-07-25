import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type LikesState = {
  likedIds: number[];
};

const initialState: LikesState = { likedIds: [] };

const likesSlice = createSlice({
  name: 'likes',
  initialState,
  reducers: {
    setLikedIds: (state, action: PayloadAction<number[]>) => {
      state.likedIds = action.payload;
    },
    setLiked: (
      state,
      action: PayloadAction<{ paintingId: number; liked: boolean }>,
    ) => {
      const { paintingId, liked } = action.payload;
      if (liked) {
        if (!state.likedIds.includes(paintingId)) {
          state.likedIds.push(paintingId);
        }
      } else {
        state.likedIds = state.likedIds.filter((id) => id !== paintingId);
      }
    },
  },
});

export const { setLikedIds, setLiked } = likesSlice.actions;
export default likesSlice.reducer;
