import type { Painting } from './painting.types';

export type CartItem = {
  id: number;
  userId: number | null;
  paintingId: number;
  painting: Painting;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type CartResponse = { items: CartItem[]; total: number };
