'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { useAppSelector } from '../store/hooks';
import { useLocale } from '../hooks/useLocale';

type Props = {
  children: ReactNode;
  adminOnly?: boolean;
};

// Keeps the cabinet and the admin out of reach of whoever is not signed in.
//
// A wrapper rather than the route guard it used to be: react-router let a
// <ProtectedRoute> element own a whole branch of the tree, and the App Router
// has no equivalent — a layout cannot refuse to render its page. So each
// private page wraps itself in this instead.
//
// It is not a security boundary and was never meant to be. Every route behind
// it is enforced again on the server, by JwtAuthGuard and RolesGuard, which is
// what actually protects the data. This only stops the interface offering a
// screen that would answer 401 to everything on it.
export default function ProtectedRoute({ children, adminOnly }: Props) {
  const router = useRouter();
  const locale = useLocale();

  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isBootstrapped = useAppSelector((state) => state.auth.isBootstrapped);

  const denied = isBootstrapped && !isAuthenticated;
  const wrongRole =
    isBootstrapped && isAuthenticated && adminOnly && user?.role !== 'ADMIN';

  // In an effect, not during render: the App Router's redirect() is a server
  // API, and router.push() during render is a side effect React will complain
  // about. The branch below is what keeps the page from flashing meanwhile.
  useEffect(() => {
    if (denied) router.replace(`/${locale}/login`);
    else if (wrongRole) router.replace(`/${locale}`);
  }, [denied, wrongRole, router, locale]);

  // The session is not known synchronously — it is re-established from the
  // refresh cookie on startup (see auth/bootstrap.ts). Rendering the page
  // before that answer arrives would bounce a perfectly signed-in visitor to
  // /login on every reload of a protected page, so wait rather than guess and
  // be wrong half the time.
  if (!isBootstrapped || denied || wrongRole) return null;

  return <>{children}</>;
}
