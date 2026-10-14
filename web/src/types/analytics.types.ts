// Mirrors the response of GET /analytics/overview (backend/src/analytics).

export type AnalyticsPeriod = 7 | 30 | 90 | 365;

export type Comparable = { value: number; previous: number };

export type DailyPoint = {
  /** YYYY-MM-DD, a calendar day in Kyiv. */
  date: string;
  revenue: number;
  orders: number;
  users: number;
  likes: number;
};

export type RankedPainting = {
  id: number;
  title: string;
  titleEn: string | null;
  cardImage: string;
  count: number;
};

export type AnalyticsOverview = {
  range: { days: AnalyticsPeriod; from: string; to: string };
  kpis: {
    revenue: Comparable;
    orders: Comparable;
    averageOrder: Comparable;
    newUsers: Comparable;
    likes: Comparable;
    cancelled: Comparable;
  };
  pipeline: { orders: number; amount: number };
  daily: DailyPoint[];
  statuses: { status: string; count: number }[];
  payments: { provider: string; count: number; revenue: number }[];
  topLiked: RankedPainting[];
  topCarted: RankedPainting[];
  inventory: { total: number; available: number; openCarts: number };
  support: { chats: number; unread: number };
  bySeries: CategorySlice[];
  byTechnique: CategorySlice[];
  /** 7 rows (Monday first) × 24 hours, Kyiv time: likes, cart additions,
   * orders and sign-ups together. */
  activity: number[][];
};

export type CategorySlice = {
  /** null for works in no series / with no technique set. */
  id: number | null;
  name: string | null;
  nameEn: string | null;
  revenue: number;
  works: number;
};
