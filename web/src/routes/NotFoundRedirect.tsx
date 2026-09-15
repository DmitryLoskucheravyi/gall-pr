import { Navigate } from 'react-router-dom';

import { useLocale } from '../hooks/useLocale';

// Catches anything under a valid /ua or /en that doesn't match a real page.
// The site has no dedicated 404 — bouncing to that locale's home is what
// happened implicitly before locales existed too (there was no catch-all
// route at all), just named now instead of left to React Router's default.
export default function NotFoundRedirect() {
  const locale = useLocale();
  return <Navigate to={`/${locale}`} replace />;
}
