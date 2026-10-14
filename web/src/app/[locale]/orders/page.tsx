import type { Metadata } from 'next';

import View from '@/views/OrdersPage';

// Open to everyone: a guest's orders are theirs too, found by the guest token
// they ordered with. Not indexed — there is nothing here to rank for.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <View />
  );
}
