import { Navigate, Outlet } from 'react-router-dom';

import { useAppSelector } from '../store/hooks';

type Props = {
  adminOnly?: boolean;
};

export default function ProtectedRoute({ adminOnly }: Props) {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
