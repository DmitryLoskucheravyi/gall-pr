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
  | 'CARD_TRANSFER'
  // Commissioned repeats only: the work doesn't exist yet, so its price and
  // timing are settled before any money moves.
  | 'ON_AGREEMENT';
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
  // Telegram or Instagram, whichever the customer would rather be reached on.
  contactHandle?: string | null;
  comment?: string | null;
  status: OrderStatus;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string | null;
  isArchived: boolean;
  // A request to paint a sold-out work again: never touched the cart, took
  // nothing out of stock, and its total is a starting point, not a sum due.
  isCommission: boolean;
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
  // Refs, not names: the city and warehouse written onto the order are
  // resolved server-side from these, so the address and the delivery fee
  // always describe the same destination.
  novaPoshtaCityRef?: string;
  novaPoshtaWarehouseRef?: string;
};

// A request to have a sold-out work painted again. Nothing to do with the
// cart: it names one painting, and the price and timing are settled by hand
// afterwards, so there is no payment method to choose here.
export type CreateCommissionDto = {
  paintingId: number;
  name: string;
  email: string;
  phone: string;
  // Telegram or Instagram, whichever they prefer — one field for both.
  contactHandle?: string;
  // What the customer is willing to pay. At least the original’s price —
  // the server enforces the floor, since only it knows what that is.
  offeredPrice?: number;
  // Optional — someone commissioning a painting often doesn't know yet where
  // it should go, and that gets settled along with everything else.
  novaPoshtaCityRef?: string;
  novaPoshtaWarehouseRef?: string;
  comment?: string;
};

// Which slice of the order book the admin is looking at. Filtering happens on
// the server now: the page used to fetch every order the shop had ever taken
// and filter the lot in the browser.
export type AdminOrderTab = 'active' | 'completed';

export type AdminOrdersPage = {
  data: Order[];
  total: number;
  // Across the whole table, not this page — it feeds the nav badge, which has
  // to say how many orders are waiting rather than how many are waiting here.
  pendingTotal: number;
  page: number;
  limit: number;
  totalPages: number;
};
