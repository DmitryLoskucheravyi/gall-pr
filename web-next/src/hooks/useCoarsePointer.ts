import { useEffect, useState } from 'react';

const QUERY = '(hover: none)';

export function useCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => setIsCoarse(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isCoarse;
}
