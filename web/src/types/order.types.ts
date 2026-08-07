import type { Painting } from './painting.types';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'CANCELLED'
  | 'COMPLETED';
export type PaymentProvider =
  | 'LIQPAY'
  | 'WAYFORPAY'
  | 'CASH_ON_DELIVERY'
  | 'CARD_TRANSFER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
export type DeliveryMethod = 'NOVA_POSHTA';

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
  userId: number | null;
  user?: OrderUser | null;
  guestName?: string | null;
  guestEmail?: string | null;
  trackingNumber?: string | null;
  guestPhone?: string | null;
  guestAddress?: string | null;
  comment?: string | null;
  status: OrderStatus;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string | null;
  isArchived: boolean;
  deliveryMethod: DeliveryMethod;
  callMeRequested: boolean;
  novaPoshtaCity?: string | null;
  novaPoshtaWarehouse?: string | null;
  deliveryCost: string;
  codFee: string;
  total: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentForm = {
  actionUrl: string;
  fields: Record<string, string | string[]>;
} | null;

export type CheckoutResponse = Order & { paymentForm: PaymentForm };

export type CheckoutDto = {
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  comment?: string;
  paymentProvider: PaymentProvider;
  deliveryMethod: DeliveryMethod;
  callMeRequested?: boolean;
  novaPoshtaCity?: string;
  novaPoshtaWarehouse?: string;
  novaPoshtaCityRef?: string;
};
