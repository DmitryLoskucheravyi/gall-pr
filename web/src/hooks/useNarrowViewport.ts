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

// False on the first render, the server's included, and corrected in an
// effect — the same reasoning as useReducedMotion. Reading matchMedia in the
// initialiser gave the server "wide" and a phone "narrow", so every phone's
// first render disagreed with the HTML it was hydrating.
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    // oxlint-disable-next-line react/set-state-in-effect
    setNarrow(mql.matches);
    const handler = (event: MediaQueryListEvent) => setNarrow(event.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return narrow;
}
