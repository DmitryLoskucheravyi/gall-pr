import { Painting } from './painting.types';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type OrderItem = {
  id: number;
  paintingId: number;
  painting: Painting;
  quantity: number;
  price: string;
  createdAt: string;
};

export type Order = {
  id: number;
  userId: number;
  status: OrderStatus;
  total: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};
