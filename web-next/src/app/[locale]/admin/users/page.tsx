import type { Metadata } from 'next';

import View from '@/views/admin/AdminUsersPage';

// Behind a login, or with nothing to rank for. robots.txt disallows
// these too; this is the half a crawler that ignores robots.txt sees.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <View />;
}
