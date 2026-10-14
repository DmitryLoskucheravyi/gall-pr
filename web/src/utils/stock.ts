import type { Painting } from '../types/painting.types';

// Whether a work can be bought right now. Both halves, not just the flag: the
// server refuses a painting with nothing left even if it is still marked
// available (cart.service.ts), so the page must not offer it either.
export function inStock(painting: Pick<Painting, 'isAvailable' | 'amount'>): boolean {
  return painting.isAvailable && painting.amount > 0;
}
