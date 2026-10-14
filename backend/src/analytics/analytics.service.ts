import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type { OverviewPeriod } from './dto/overview-query.dto';

// The admin dashboard's numbers, computed from the shop's own tables.
//
// Days are the gallery's days, not the server's: a sale at 01:00 in Kyiv is
// that day's sale, even though it is still the day before in UTC, where the
// timestamps are stored. MySQL could only do that with its time-zone tables
// loaded, and the offset moves twice a year, so rows are fetched for the
// period and bucketed here with Intl — at this shop's volume that is a few
// hundred rows, not a reason for a reporting table.
//
// Every headline figure comes with the same figure for the period before it,
// so the page can say "up 12%" rather than leave the admin to remember.

const TIME_ZONE = 'Europe/Kyiv';
const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_LIMIT = 5;

type OrderRow = {
  id: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED' | 'COMPLETED';
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  payment_provider: string;
  total: string;
  created_at: Date;
};

type Comparable = { value: number; previous: number };

export type DailyPoint = {
  date: string;
  revenue: number;
  orders: number;
  users: number;
  likes: number;
};

// Money the shop has actually got, or will get without anything more going
// right: paid online, or completed — which for cash on delivery is the moment
// the carrier hands the money over. A pending order is a promise, counted
// separately as the pipeline; a cancelled one is nothing.
function isEarned(order: OrderRow): boolean {
  if (order.status === 'CANCELLED') return false;
  return order.payment_status === 'PAID' || order.status === 'COMPLETED';
}

const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function toDay(date: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return dayKey.format(date);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Weekday (Monday = 0) and hour, both in Kyiv, for the activity grid.
const clock = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  hourCycle: 'h23',
});
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekdayHour(date: Date): [number, number] {
  const parts = clock.formatToParts(date);
  const weekday = WEEKDAYS.indexOf(
    parts.find((part) => part.type === 'weekday')?.value ?? 'Mon',
  );
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  return [Math.max(0, weekday), hour % 24];
}

type SaleRow = {
  amount: string;
  series_id: number | null;
  series_name: string | null;
  series_name_en: string | null;
  technique_id: number | null;
  technique_name: string | null;
  technique_name_en: string | null;
};

export type CategorySlice = {
  id: number | null;
  name: string | null;
  nameEn: string | null;
  revenue: number;
  works: number;
};

@Injectable()
export class AnalyticsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async overview(days: OverviewPeriod) {
    const now = new Date();
    const from = new Date(now.getTime() - days * DAY_MS);
    const previousFrom = new Date(from.getTime() - days * DAY_MS);

    const q = <T>(sql: string, params: unknown[] = []) =>
      this.dataSource.query<T[]>(sql, params);

    // Started first and awaited last, so it runs alongside the queries below.
    const extrasPromise = this.extras(from);

    const [
      orders,
      users,
      likes,
      topLiked,
      topCarted,
      inventory,
      support,
      pipeline,
    ] = await Promise.all([
      q<OrderRow>(
        `SELECT id, status, payment_status, payment_provider, total, created_at
             FROM orders WHERE created_at >= ?`,
        [previousFrom],
      ),
      q<{ created_at: Date }>(
        'SELECT created_at FROM users WHERE created_at >= ?',
        [previousFrom],
      ),
      q<{ created_at: Date }>(
        'SELECT created_at FROM likes WHERE created_at >= ?',
        [previousFrom],
      ),
      // Liked in this period, not liked ever: what is catching people now.
      q<{
        id: number;
        title: string;
        title_en: string | null;
        card_image: string;
        n: string;
      }>(
        `SELECT p.id, p.title, p.title_en, p.card_image, COUNT(*) AS n
             FROM likes l JOIN paintings p ON p.id = l.painting_id
            WHERE l.created_at >= ?
            GROUP BY p.id, p.title, p.title_en, p.card_image
            ORDER BY n DESC, p.id DESC
            LIMIT ${TOP_LIMIT}`,
        [from],
      ),
      // Sitting in someone's cart right now — intent that has not turned
      // into an order yet, and so the list worth a nudge.
      q<{
        id: number;
        title: string;
        title_en: string | null;
        card_image: string;
        n: string;
      }>(
        `SELECT p.id, p.title, p.title_en, p.card_image, COUNT(*) AS n
             FROM cart_items c JOIN paintings p ON p.id = c.painting_id
            GROUP BY p.id, p.title, p.title_en, p.card_image
            ORDER BY n DESC, p.id DESC
            LIMIT ${TOP_LIMIT}`,
      ),
      q<{ total: string; available: string; carts: string }>(
        `SELECT COUNT(*) AS total,
                  COALESCE(SUM(is_available = 1 AND amount > 0), 0) AS available,
                  (SELECT COUNT(DISTINCT COALESCE(CAST(user_id AS CHAR), guest_token))
                     FROM cart_items) AS carts
             FROM paintings`,
      ),
      q<{ chats: string; unread: string }>(
        `SELECT COUNT(*) AS chats, COALESCE(SUM(unread_by_admin), 0) AS unread
             FROM support_chats`,
      ),
      // Every open order regardless of period: money on its way, which is
      // what the admin has to act on today.
      q<{ n: string; amount: string }>(
        `SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS amount
             FROM orders
            WHERE status <> 'CANCELLED'
              AND payment_status <> 'PAID'
              AND status <> 'COMPLETED'`,
      ),
    ]);

    const inPeriod = (d: Date) => d >= from;
    const inPrevious = (d: Date) => d >= previousFrom && d < from;

    const current = orders.filter((o) => inPeriod(new Date(o.created_at)));
    const previous = orders.filter((o) => inPrevious(new Date(o.created_at)));

    const revenueOf = (list: OrderRow[]) =>
      round2(
        list.filter(isEarned).reduce((sum, o) => sum + Number(o.total), 0),
      );
    const placed = (list: OrderRow[]) =>
      list.filter((o) => o.status !== 'CANCELLED');
    const avg = (list: OrderRow[]) => {
      const earned = list.filter(isEarned);
      return earned.length ? round2(revenueOf(earned) / earned.length) : 0;
    };
    const count = (rows: { created_at: Date }[], test: (d: Date) => boolean) =>
      rows.filter((r) => test(new Date(r.created_at))).length;

    const kpis: Record<string, Comparable> = {
      revenue: { value: revenueOf(current), previous: revenueOf(previous) },
      orders: {
        value: placed(current).length,
        previous: placed(previous).length,
      },
      averageOrder: { value: avg(current), previous: avg(previous) },
      newUsers: {
        value: count(users, inPeriod),
        previous: count(users, inPrevious),
      },
      likes: {
        value: count(likes, inPeriod),
        previous: count(likes, inPrevious),
      },
      cancelled: {
        value: current.filter((o) => o.status === 'CANCELLED').length,
        previous: previous.filter((o) => o.status === 'CANCELLED').length,
      },
    };

    // One point per calendar day in Kyiv, zero-filled, oldest first — the
    // chart draws a continuous line, and a missing day is a zero day.
    const daily = new Map<string, DailyPoint>();
    for (let t = from.getTime() + DAY_MS; t <= now.getTime() + 1; t += DAY_MS) {
      const date = toDay(new Date(t));
      daily.set(date, { date, revenue: 0, orders: 0, users: 0, likes: 0 });
    }
    const bump = (d: Date, field: keyof Omit<DailyPoint, 'date'>, by = 1) => {
      const point = daily.get(toDay(d));
      if (point) point[field] = round2(point[field] + by);
    };
    for (const o of current) {
      const d = new Date(o.created_at);
      if (o.status !== 'CANCELLED') bump(d, 'orders');
      if (isEarned(o)) bump(d, 'revenue', Number(o.total));
    }
    for (const u of users)
      if (inPeriod(new Date(u.created_at)))
        bump(new Date(u.created_at), 'users');
    for (const l of likes)
      if (inPeriod(new Date(l.created_at)))
        bump(new Date(l.created_at), 'likes');

    const byStatus = new Map<string, number>();
    const byProvider = new Map<string, { count: number; revenue: number }>();
    for (const o of current) {
      byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
      if (o.status === 'CANCELLED') continue;
      const entry = byProvider.get(o.payment_provider) ?? {
        count: 0,
        revenue: 0,
      };
      entry.count += 1;
      if (isEarned(o)) entry.revenue = round2(entry.revenue + Number(o.total));
      byProvider.set(o.payment_provider, entry);
    }

    const ranked = (
      rows: {
        id: number;
        title: string;
        title_en: string | null;
        card_image: string;
        n: string;
      }[],
    ) =>
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        titleEn: r.title_en,
        cardImage: r.card_image,
        count: Number(r.n),
      }));

    const inv = inventory[0];
    const sup = support[0];
    const pipe = pipeline[0];

    const extras = await extrasPromise;

    return {
      ...extras,
      range: { days, from: from.toISOString(), to: now.toISOString() },
      kpis,
      pipeline: { orders: Number(pipe.n), amount: round2(Number(pipe.amount)) },
      daily: [...daily.values()],
      statuses: [...byStatus].map(([status, n]) => ({ status, count: n })),
      payments: [...byProvider]
        .map(([provider, v]) => ({ provider, ...v }))
        .sort((a, b) => b.count - a.count),
      topLiked: ranked(topLiked),
      topCarted: ranked(topCarted),
      inventory: {
        total: Number(inv.total),
        available: Number(inv.available),
        openCarts: Number(inv.carts),
      },
      support: { chats: Number(sup.chats), unread: Number(sup.unread) },
    };
  }

  // What sold, by series and by technique, and when people are about.
  private async extras(from: Date) {
    const [sales, likes, carts, orders, users] = await Promise.all([
      // Every work in a placed order this period. Placed rather than earned:
      // the question here is what people choose, not what has been paid.
      this.dataSource.query<SaleRow[]>(
        `SELECT oi.price * oi.quantity AS amount,
                s.id AS series_id, s.name AS series_name, s.name_en AS series_name_en,
                t.id AS technique_id, t.name AS technique_name, t.name_en AS technique_name_en
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           JOIN paintings p ON p.id = oi.painting_id
           LEFT JOIN series s ON s.id = p.series_id
           LEFT JOIN techniques t ON t.id = p.technique_id
          WHERE o.created_at >= ? AND o.status <> 'CANCELLED'`,
        [from],
      ),
      this.dataSource.query<{ created_at: Date }[]>(
        'SELECT created_at FROM likes WHERE created_at >= ?',
        [from],
      ),
      this.dataSource.query<{ created_at: Date }[]>(
        'SELECT created_at FROM cart_items WHERE created_at >= ?',
        [from],
      ),
      this.dataSource.query<{ created_at: Date }[]>(
        "SELECT created_at FROM orders WHERE created_at >= ? AND status <> 'CANCELLED'",
        [from],
      ),
      this.dataSource.query<{ created_at: Date }[]>(
        'SELECT created_at FROM users WHERE created_at >= ?',
        [from],
      ),
    ]);

    const slice = (key: 'series' | 'technique'): CategorySlice[] => {
      const map = new Map<string, CategorySlice>();
      for (const row of sales) {
        const id = row[`${key}_id`];
        const k = String(id ?? 'none');
        const entry = map.get(k) ?? {
          id,
          name: row[`${key}_name`],
          nameEn: row[`${key}_name_en`],
          revenue: 0,
          works: 0,
        };
        entry.revenue = round2(entry.revenue + Number(row.amount));
        entry.works += 1;
        map.set(k, entry);
      }
      return [...map.values()].sort((a, b) => b.revenue - a.revenue);
    };

    // 7 × 24, Monday first: every like, cart addition, order and sign-up in
    // the period, by when it happened.
    const activity = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const rows of [likes, carts, orders, users]) {
      for (const row of rows) {
        const [weekday, hour] = weekdayHour(new Date(row.created_at));
        activity[weekday][hour] += 1;
      }
    }

    return {
      bySeries: slice('series'),
      byTechnique: slice('technique'),
      activity,
    };
  }
}
