import { Navigate, Outlet } from 'react-router-dom';

import { useAppSelector } from '../store/hooks';

type Props = {
  adminOnly?: boolean;
};

export default function ProtectedRoute({ adminOnly }: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isBootstrapped = useAppSelector((state) => state.auth.isBootstrapped);

  // The session is no longer known synchronously: it's re-established from the
  // refresh cookie on startup. Redirecting before that answer arrives would
  // bounce a perfectly signed-in user to /login on every reload of a protected
  // page — so wait, rather than guess and be wrong half the time.
  if (!isBootstrapped) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
