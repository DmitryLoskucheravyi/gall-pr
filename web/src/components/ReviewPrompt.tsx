'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';

import ReviewModal from './ReviewModal';
import { ordersService } from '../api/orders.api';
import { queryKeys } from '../lib/queryKeys';
import { useOrdersIdentity } from '../hooks/queries/useOrders';
import { useAppSelector } from '../store/hooks';
import { peekGuestToken } from '../utils/guestToken';
import { readStored, writeStored } from '../utils/safeStorage';
import { stripLocale } from '../utils/locale';

// Asks, once, for a review of a delivered order — on the customer's next visit
// after it was completed, without their having to find the button.
//
// Only when there is an order to ask about: someone signed in, or a guest
// who has a token from ordering. A visitor who has never bought anything is
// not handed a guest token just so this can look (peekGuestToken, not get).
//
// Never in the middle of something: not on checkout, the cart or the orders
// page (which has its own button), nor anywhere in the admin; and a few
// seconds after arriving rather than over the first paint. "Not now" holds
// for a week, per order; sending or closing the form ends it for that order.
//
// The thank-you letter's link (?review=<id>) is the exception: the customer
// asked for the form, so it opens for that order at once, snoozed or not.
//
// At most once per visit. Whatever the answer — "not now", close, send — the
// prompt is done until the next page load: no reopening the same order, and
// no moving straight on to ask about the next one.

const DELAY_MS = 2500;
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const QUIET_PATHS = ['/cart', '/checkout', '/orders', '/admin', '/login', '/register'];

const snoozeKey = (orderId: number) => `gall_review_prompt_${orderId}`;

function snoozed(orderId: number): boolean {
  const raw = readStored(snoozeKey(orderId));
  if (!raw) return false;
  if (raw === 'done') return true;
  const until = Number(raw);
  return Number.isFinite(until) && until > Date.now();
}

export default function ReviewPrompt() {
  const pathname = usePathname();
  const isBootstrapped = useAppSelector((state) => state.auth.isBootstrapped);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isAdmin = useAppSelector((state) => state.auth.user?.role === 'ADMIN');
  const identity = useOrdersIdentity();

  const canAsk = isBootstrapped && !isAdmin && (isAuthenticated || peekGuestToken() !== null);

  // The same cache entry as the orders page, so visiting it afterwards costs
  // nothing and a review sent from either place shows in both.
  const { data: orders } = useQuery({
    queryKey: queryKeys.orders.mine(identity),
    queryFn: () => ordersService.getOrders(),
    enabled: canAsk,
    staleTime: 5 * 60_000,
  });

  const search = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => '',
  );
  const linked = Number(new URLSearchParams(search).get('review')) || null;

  // Set the moment the customer answers the prompt in any way. Local state,
  // not just the stored snooze: the candidate below is memoised on the order
  // list and would never re-read storage on its own, so a "not now" used to
  // pick the very same order again and reopen it seconds later.
  const [answered, setAnswered] = useState(false);

  const candidate = useMemo(() => {
    if (answered) return null;
    const open = orders?.filter((o) => o.status === 'COMPLETED' && !o.review) ?? [];
    return (linked ? open.find((o) => o.id === linked) : undefined) ?? open.find((o) => !snoozed(o.id)) ?? null;
  }, [orders, linked, answered]);

  const path = stripLocale(pathname ?? '/');
  const quiet = QUIET_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!candidate || quiet || open !== null) return;
    const fromLink = candidate.id === linked;
    const timer = window.setTimeout(() => setOpen(candidate.id), fromLink ? 300 : DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [candidate, quiet, open, linked]);

  const order = orders?.find((o) => o.id === open) ?? null;
  if (!order) return null;

  const finish = (stored: string) => {
    writeStored(snoozeKey(order.id), stored);
    setAnswered(true);
    setOpen(null);
    // Drop the letter's ?review=<id> too, or a reload would open it again.
    const url = new URL(window.location.href);
    if (url.searchParams.has('review')) {
      url.searchParams.delete('review');
      window.history.replaceState(window.history.state, '', url);
    }
  };

  return (
    <ReviewModal
      order={order}
      prompted
      // "Not now" is about being asked at all, not about this one order:
      // every order still waiting for a review waits a week.
      onLater={() => {
        const until = String(Date.now() + SNOOZE_MS);
        for (const o of orders ?? []) {
          if (o.status === 'COMPLETED' && !o.review && !snoozed(o.id)) writeStored(snoozeKey(o.id), until);
        }
        finish(until);
      }}
      // Closed (or sent): don't ask about this order again.
      onClose={() => finish('done')}
    />
  );
}
