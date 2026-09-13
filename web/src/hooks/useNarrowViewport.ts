import { useEffect, useState } from 'react';

// True while the viewport is phone-width.
//
// Mirrors $breakpoint-md in _variables.scss, and exists so a component can
// take the same decision its stylesheet does. Where both have a say in one
// piece of layout, a component guessing from the pointer type instead will
// disagree with its own CSS on a touchscreen laptop or a tablet held
// sideways — the stylesheet lays it out one way, the script paces it the
// other.
//
// Pointer type is still the right question for what a device can *do*:
// whether a video can be scrubbed at all (see useCoarsePointer). This one is
// only about how much room there is.
const QUERY = '(max-width: 768px)';

export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => setNarrow(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return narrow;
}
