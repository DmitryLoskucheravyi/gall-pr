import type { Metadata } from 'next';

import ProtectedRoute from '@/components/ProtectedRoute';
import View from '@/views/admin/AdminSupportPage';

// Behind a login, or with nothing to rank for. robots.txt disallows
// these too; this is the half a crawler that ignores robots.txt sees.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <ProtectedRoute adminOnly>
      <View />
    </ProtectedRoute>
  );
}
