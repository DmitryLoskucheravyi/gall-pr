import type { Locale } from '../hooks/useLocale';

// Display-only conversion — checkout stays in UAH throughout, this just
// shows an English-locale visitor a price they can actually judge.
export function formatPrice(uah: number, locale: Locale, usdRate: number | undefined): string {
  if (locale === 'en' && usdRate) {
    const usd = uah / usdRate;
    return `$${usd.toLocaleString('en-US', { maximumFractionDigits: usd >= 100 ? 0 : 2 })}`;
  }

  return `${Math.round(uah).toLocaleString('uk-UA')} ₴`;
}
