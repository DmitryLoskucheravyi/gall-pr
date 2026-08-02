import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router keeps the browser's scroll position across client-side
// navigations by default — so clicking a link while scrolled down (e.g. any
// footer link) lands on the new page still scrolled to the bottom. Reset on
// every pathname change; a hash change (e.g. #section anchors) is left alone
// so in-page jump links keep working.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
