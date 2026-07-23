import { Painting } from './painting.types';

export type CartItem = {
  id: number;
  userId: number;
  paintingId: number;
  painting: Painting;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type CartResponse = { items: CartItem[]; total: number };
