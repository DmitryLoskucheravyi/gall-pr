'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Sparkline, TrendChart } from '../../components/admin/AnalyticsCharts';
import {
  ActivityGrid,
  Columns,
  Donut,
  LineChart,
} from '../../components/admin/AnalyticsMoreCharts';
import Skeleton from '../../components/ui/Skeleton';
import { useAnalyticsOverview } from '../../hooks/queries/useAnalytics';
import { useLocale } from '../../hooks/useLocale';
import { LocalizedLink } from '../../components/ui/LocalizedLink';
import { cdnImage } from '../../utils/imageUrl';
import { pickLocale } from '../../utils/localizedField';
import type {
  AnalyticsPeriod,
  Comparable,
  DailyPoint,
  RankedPainting,
} from '../../types/analytics.types';
import styles from './AdminAnalyticsPage.module.scss';

// The admin's view of how the shop is doing: money, orders, people and what
// they reach for, over a chosen period and against the one before it.
//
// Everything here comes from the shop's own database (GET /analytics/overview).
// Visits are not: they are counted, with consent, by Plausible, and read in
// its own dashboard — the note at the foot of the page says so, rather than
// leaving the admin to wonder why traffic is missing.

const PERIODS: AnalyticsPeriod[] = [7, 30, 90, 365];

type KpiKey = 'revenue' | 'orders' | 'averageOrder' | 'newUsers' | 'likes' | 'cancelled';

const KPIS: { key: KpiKey; money?: boolean; spark?: keyof Omit<DailyPoint, 'date'>; invert?: boolean }[] = [
  { key: 'revenue', money: true, spark: 'revenue' },
  { key: 'orders', spark: 'orders' },
  { key: 'averageOrder', money: true },
  { key: 'newUsers', spark: 'users' },
  { key: 'likes', spark: 'likes' },
  // Fewer is better here: a fall is good news, so the colours flip.
  { key: 'cancelled', invert: true },
];

export default function AdminAnalyticsPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [days, setDays] = useState<AnalyticsPeriod>(30);
  const { data, isLoading, isError, isFetching } = useAnalyticsOverview(days);

  const tag = locale === 'en' ? 'en-GB' : 'uk-UA';
  const money = useMemo(
    () =>
      new Intl.NumberFormat(tag, {
        style: 'currency',
        currency: 'UAH',
        maximumFractionDigits: 0,
      }),
    [tag],
  );
  const number = useMemo(() => new Intl.NumberFormat(tag), [tag]);

  const groups = useMemo(
    () => (data ? bucket(data.daily, days, tag) : []),
    [data, days, tag],
  );
  const points = useMemo(
    () => groups.map((g) => ({ key: g.key, label: g.label, line: g.revenue, bars: g.orders })),
    [groups],
  );
  // The running total: where the period's money stands at each step.
  const cumulative = useMemo(
    () =>
      groups.reduce<number[]>(
        (acc, g) => [...acc, (acc[acc.length - 1] ?? 0) + g.revenue],
        [],
      ),
    [groups],
  );

  const weekdays = useMemo(() => {
    // 2024-01-01 was a Monday; the grid's rows run Monday first.
    const f = new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }, [tag]);

  const categoryName = (c: { id: number | null; name: string | null; nameEn: string | null }, none: string) =>
    c.id === null ? none : (locale === 'en' ? c.nameEn || c.name : c.name) ?? none;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{t('analyticsPage.title')}</h1>
          <p className={styles.lead}>{t('analyticsPage.lead')}</p>
        </div>

        <div className={styles.periods} role="tablist" aria-label={t('analyticsPage.periodLabel')}>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === days}
              className={styles.period}
              data-active={p === days || undefined}
              onClick={() => setDays(p)}
            >
              {t(`analyticsPage.periods.${p}`)}
            </button>
          ))}
        </div>
      </header>

      {isError ? (
        <p className={styles.muted}>{t('analyticsPage.error')}</p>
      ) : isLoading || !data ? (
        <div className={styles.kpis}>
          {KPIS.map((k) => (
            <Skeleton key={k.key} className={styles.kpiSkeleton} />
          ))}
        </div>
      ) : (
        <div className={styles.body} data-refreshing={isFetching || undefined}>
          <section className={styles.kpis}>
            {KPIS.map((k) => (
              <Kpi
                key={k.key}
                label={t(`analyticsPage.kpi.${k.key}`)}
                value={data.kpis[k.key]}
                format={(n) => (k.money ? money.format(n) : number.format(n))}
                spark={k.spark ? data.daily.map((d) => d[k.spark!]) : null}
                invert={k.invert}
                vsLabel={t('analyticsPage.vsPrevious')}
                newLabel={t('analyticsPage.new')}
              />
            ))}
          </section>

          <section className={styles.facts}>
            <Fact
              label={t('analyticsPage.facts.pipeline')}
              value={money.format(data.pipeline.amount)}
              note={t('analyticsPage.facts.pipelineNote', { count: data.pipeline.orders })}
            />
            <Fact
              label={t('analyticsPage.facts.inventory')}
              value={`${number.format(data.inventory.available)} / ${number.format(data.inventory.total)}`}
              note={t('analyticsPage.facts.inventoryNote')}
            />
            <Fact
              label={t('analyticsPage.facts.carts')}
              value={number.format(data.inventory.openCarts)}
              note={t('analyticsPage.facts.cartsNote')}
            />
            <Fact
              label={t('analyticsPage.facts.support')}
              value={number.format(data.support.chats)}
              note={t('analyticsPage.facts.supportNote', { count: data.support.unread })}
            />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t('analyticsPage.trend.title')}</h2>
            <TrendChart
              points={points}
              lineLabel={t('analyticsPage.trend.revenue')}
              barsLabel={t('analyticsPage.trend.orders')}
              formatLine={(n) => money.format(n)}
              formatBars={(n) => number.format(n)}
            />
          </section>

          <div className={styles.split}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{t('analyticsPage.cumulative')}</h2>
              <LineChart
                labels={groups.map((g) => g.label)}
                series={[{ key: 'revenue', label: t('analyticsPage.trend.revenue'), values: cumulative }]}
                fill
                format={(n) => money.format(n)}
              />
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{t('analyticsPage.people')}</h2>
              <LineChart
                labels={groups.map((g) => g.label)}
                series={[
                  { key: 'users', label: t('analyticsPage.kpi.newUsers'), values: groups.map((g) => g.users) },
                  { key: 'likes', label: t('analyticsPage.kpi.likes'), values: groups.map((g) => g.likes) },
                  { key: 'orders', label: t('analyticsPage.kpi.orders'), values: groups.map((g) => g.orders) },
                ]}
                format={(n) => number.format(n)}
              />
            </section>
          </div>

          <div className={styles.split}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{t('analyticsPage.statuses')}</h2>
              {data.statuses.length ? (
                <Donut
                  centerLabel={t('analyticsPage.kpi.orders')}
                  format={(n) => number.format(n)}
                  slices={data.statuses
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((st) => ({
                      key: st.status,
                      label: t(`ordersPage.status.${st.status}`),
                      value: st.count,
                    }))}
                />
              ) : (
                <p className={styles.muted}>{t('analyticsPage.empty')}</p>
              )}
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{t('analyticsPage.payments')}</h2>
              {data.payments.length ? (
                <Donut
                  centerLabel={t('analyticsPage.kpi.orders')}
                  format={(n) => number.format(n)}
                  slices={data.payments.map((p) => ({
                    key: p.provider,
                    label: t(`ordersPage.paymentProvider.${p.provider}`),
                    value: p.count,
                    note: t('analyticsPage.paymentsEarned', { amount: money.format(p.revenue) }),
                  }))}
                />
              ) : (
                <p className={styles.muted}>{t('analyticsPage.empty')}</p>
              )}
            </section>
          </div>

          <div className={styles.split}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{t('analyticsPage.bySeries')}</h2>
              {data.bySeries.length ? (
                <Columns
                  format={(n) => money.format(n)}
                  columns={data.bySeries.map((c) => ({
                    key: String(c.id ?? 'none'),
                    label: categoryName(c, t('analyticsPage.noSeries')),
                    value: c.revenue,
                    note: t('analyticsPage.worksCount', { count: c.works }),
                  }))}
                />
              ) : (
                <p className={styles.muted}>{t('analyticsPage.empty')}</p>
              )}
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{t('analyticsPage.byTechnique')}</h2>
              {data.byTechnique.length ? (
                <Columns
                  format={(n) => money.format(n)}
                  columns={data.byTechnique.map((c) => ({
                    key: String(c.id ?? 'none'),
                    label: categoryName(c, t('analyticsPage.noTechnique')),
                    value: c.revenue,
                    note: t('analyticsPage.worksCount', { count: c.works }),
                  }))}
                />
              ) : (
                <p className={styles.muted}>{t('analyticsPage.empty')}</p>
              )}
            </section>
          </div>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t('analyticsPage.activity')}</h2>
            <p className={styles.cardHint}>{t('analyticsPage.activityHint')}</p>
            <ActivityGrid
              grid={data.activity}
              weekdays={weekdays}
              less={t('analyticsPage.less')}
              more={t('analyticsPage.more')}
              cellLabel={(w, h, n) =>
                t('analyticsPage.activityCell', { weekday: w, hour: String(h).padStart(2, '0'), count: n })
              }
            />
          </section>

          <div className={styles.split}>
            <TopList
              title={t('analyticsPage.topLiked')}
              hint={t('analyticsPage.topLikedHint')}
              items={data.topLiked}
              countLabel={(n) => t('analyticsPage.likesCount', { count: n })}
              empty={t('analyticsPage.empty')}
              locale={locale}
            />
            <TopList
              title={t('analyticsPage.topCarted')}
              hint={t('analyticsPage.topCartedHint')}
              items={data.topCarted}
              countLabel={(n) => t('analyticsPage.cartsCount', { count: n })}
              empty={t('analyticsPage.empty')}
              locale={locale}
            />
          </div>

          <p className={styles.footnote}>{t('analyticsPage.trafficNote')}</p>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  format,
  spark,
  invert,
  vsLabel,
  newLabel,
}: {
  label: string;
  value: Comparable;
  format: (n: number) => string;
  spark: number[] | null;
  invert?: boolean;
  vsLabel: string;
  newLabel: string;
}) {
  const { value: now, previous } = value;
  let delta: string | null = null;
  let trend: 'up' | 'down' | 'flat' = 'flat';

  if (previous > 0) {
    const pct = Math.round(((now - previous) / previous) * 100);
    delta = `${pct > 0 ? '+' : ''}${pct}%`;
    trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  } else if (now > 0) {
    delta = newLabel;
    trend = 'up';
  }

  const good = trend === 'flat' ? 'flat' : (trend === 'up') !== Boolean(invert) ? 'good' : 'bad';

  return (
    <article className={styles.kpi}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{format(now)}</span>
      <span className={styles.kpiDelta} data-tone={good}>
        {delta === newLabel ? (
          <b>{delta}</b>
        ) : delta ? (
          <>
            <b>{delta}</b> {vsLabel}
          </>
        ) : (
          '—'
        )}
      </span>
      {spark ? (
        <span className={styles.kpiSpark}>
          <Sparkline values={spark} />
        </span>
      ) : null}
    </article>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
      <span className={styles.factNote}>{note}</span>
    </div>
  );
}

function TopList({
  title,
  hint,
  items,
  countLabel,
  empty,
  locale,
}: {
  title: string;
  hint: string;
  items: RankedPainting[];
  countLabel: (n: number) => string;
  empty: string;
  locale: ReturnType<typeof useLocale>;
}) {
  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{title}</h2>
      <p className={styles.cardHint}>{hint}</p>
      {items.length ? (
        <ol className={styles.top}>
          {items.map((item, index) => (
            <li key={item.id}>
              <LocalizedLink to={`/painting/${item.id}`} className={styles.topItem}>
                <span className={styles.topRank}>{String(index + 1).padStart(2, '0')}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.topThumb} src={cdnImage(item.cardImage, 120)} alt="" loading="lazy" />
                <span className={styles.topTitle}>{pickLocale(item, 'title', locale)}</span>
                <span className={styles.topCount}>{countLabel(item.count)}</span>
              </LocalizedLink>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.muted}>{empty}</p>
      )}
    </section>
  );
}

// Days for a week or a month; weeks for a quarter; months for a year — so the
// chart has a few dozen marks at most whatever the period.
type Group = Omit<DailyPoint, 'date'> & { key: string; label: string };

function bucket(daily: DailyPoint[], days: AnalyticsPeriod, tag: string): Group[] {
  const dayLabel = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  // Month and a two-digit year, written out by hand: Ukrainian's own short
  // form appends "р." ("жовт. 26 р."), which is noise on an axis.
  const monthName = new Intl.DateTimeFormat(tag, { month: 'short', timeZone: 'UTC' });
  const monthLabel = {
    format: (d: Date) => `${monthName.format(d)} ’${String(d.getUTCFullYear()).slice(2)}`,
  };
  const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

  if (days <= 30) {
    return daily.map((d) => ({
      key: d.date,
      label: dayLabel.format(asDate(d.date)),
      revenue: d.revenue,
      orders: d.orders,
      users: d.users,
      likes: d.likes,
    }));
  }

  const groups = new Map<string, Group>();
  daily.forEach((d, index) => {
    // Weeks counted back from today, so the last bar is always a whole week
    // ending now rather than a stub.
    const key =
      days === 90
        ? `w${Math.floor((daily.length - 1 - index) / 7)}`
        : d.date.slice(0, 7);
    const existing = groups.get(key);
    if (existing) {
      existing.revenue += d.revenue;
      existing.orders += d.orders;
      existing.users += d.users;
      existing.likes += d.likes;
    } else {
      groups.set(key, {
        key,
        label: days === 90 ? dayLabel.format(asDate(d.date)) : monthLabel.format(asDate(`${d.date.slice(0, 7)}-01`)),
        revenue: d.revenue,
        orders: d.orders,
        users: d.users,
        likes: d.likes,
      });
    }
  });
  return [...groups.values()];
}
