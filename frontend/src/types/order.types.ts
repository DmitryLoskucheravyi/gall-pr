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

export type OrderUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type Order = {
  id: number;
  userId: number;
  user?: OrderUser | null;
  status: OrderStatus;
  total: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};
