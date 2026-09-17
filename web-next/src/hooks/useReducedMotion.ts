'use client';

import { useEffect, useState } from 'react';

// Whether the visitor asked their system to reduce motion.
//
// Deliberately false on the first render, including the server's, and corrected
// in an effect. The obvious version — reading matchMedia during render — breaks
// twice under SSR: `window` does not exist on the server at all, and even if it
// did, a server that guessed "no reduction" and a client that then rendered
// "reduction" would disagree, and React throws away a server pass that does not
// match.
//
// So the first paint is always the animated one, and a visitor who asked for
// less motion sees it settle a frame later. That is the right way round: the
// alternative is a flash of stillness for everyone else.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');

    setReduced(query.matches);

    // Watched, unlike the version this replaces: the listener is free now that
    // the query object has to be kept anyway.
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);

    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
