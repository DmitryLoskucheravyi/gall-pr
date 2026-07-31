export type PaintingListFilters = {
  page: number;
  limit: number;
  techniqueId?: number;
  isAvailable?: boolean;
  minPrice?: number;
  maxPrice?: number;
};

function buildPaintingFilters(
  filters: PaintingListFilters,
): PaintingListFilters {
  const result: PaintingListFilters = { page: filters.page, limit: filters.limit };

  if (filters.techniqueId !== undefined) result.techniqueId = filters.techniqueId;
  if (filters.isAvailable !== undefined) result.isAvailable = filters.isAvailable;
  if (filters.minPrice !== undefined) result.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) result.maxPrice = filters.maxPrice;

  return result;
}

export const queryKeys = {
  paintings: {
    all: ['paintings'] as const,
    lists: () => [...queryKeys.paintings.all, 'list'] as const,
    list: (filters: PaintingListFilters) =>
      [...queryKeys.paintings.lists(), buildPaintingFilters(filters)] as const,
    details: () => [...queryKeys.paintings.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.paintings.details(), id] as const,
    priceRange: () => [...queryKeys.paintings.all, 'price-range'] as const,
    related: (id: number, techniqueId: number | null) =>
      [...queryKeys.paintings.all, 'related', id, techniqueId] as const,
  },
  techniques: {
    all: ['techniques'] as const,
    list: () => [...queryKeys.techniques.all, 'list'] as const,
  },
  materials: {
    all: ['materials'] as const,
    list: () => [...queryKeys.materials.all, 'list'] as const,
  },
  giveaways: {
    all: ['giveaways'] as const,
    lists: () => [...queryKeys.giveaways.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.giveaways.all, 'detail', id] as const,
    myStatus: (id: number, userId: number | null) =>
      [...queryKeys.giveaways.all, 'my-status', id, userId] as const,
  },
  news: {
    all: ['news'] as const,
    list: () => [...queryKeys.news.all, 'list'] as const,
  },
  cart: {
    all: ['cart'] as const,
    detail: (identity: number | 'guest') =>
      [...queryKeys.cart.all, 'detail', identity] as const,
  },
  likes: {
    all: ['likes'] as const,
    mine: (userId: number) => [...queryKeys.likes.all, 'mine', userId] as const,
    myPaintings: (userId: number) =>
      [...queryKeys.likes.all, 'my-paintings', userId] as const,
  },
  orders: {
    all: ['orders'] as const,
    mine: (identity: number | 'guest') =>
      [...queryKeys.orders.all, 'mine', identity] as const,
    admin: () => [...queryKeys.orders.all, 'admin'] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  faq: {
    all: ['faq'] as const,
  },
  support: {
    all: ['support'] as const,
    adminChats: () => [...queryKeys.support.all, 'admin-chats'] as const,
  },
  novaPoshta: {
    cities: (query: string) => ['nova-poshta', 'cities', query] as const,
    warehouses: (cityRef: string) => ['nova-poshta', 'warehouses', cityRef] as const,
    deliveryPrice: (cityRecipientRef: string, withRedelivery: boolean) =>
      ['nova-poshta', 'delivery-price', cityRecipientRef, withRedelivery] as const,
  },
  auth: {
    me: (userId: number) => ['auth', 'me', userId] as const,
  },
} as const;
