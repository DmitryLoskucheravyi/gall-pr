import { useCallback, useEffect, useRef } from 'react';

import { useCoarsePointer } from './useCoarsePointer';

// How long to wait for the keyboard to finish closing when the viewport never
// reports a resize — long enough to outlast a slow animation, short enough
// that the page doesn't visibly jump some time after the tap.
const KEYBOARD_SETTLE_MS = 350;

// Returns a function that puts the page back at the top once the on-screen
// keyboard has finished closing.
//
// Phones scroll the window down when the keyboard opens, to keep the focused
// input above it, and nothing scrolls back when it goes away. On a screen
// sized to the viewport — the support chat is exactly that — the page is left
// hanging below its own header, taking the back button off the top of the
// screen with it and leaving no visible way out of the conversation.
//
// Scrolling straight away doesn't work: the browser is still adjusting the
// scroll position while the keyboard animates out and simply undoes it. So
// wait for visualViewport to report the resize, and keep a timer as the
// fallback for when the keyboard was never open and no resize is coming.
export function useScrollToTopAfterKeyboard(): () => void {
  const isCoarse = useCoarsePointer();
  const cancelRef = useRef<(() => void) | null>(null);

  // A scroll landing on a page the user has already navigated away from would
  // be, at best, surprising.
  useEffect(() => () => cancelRef.current?.(), []);

  return useCallback(() => {
    // A desktop keyboard takes up no viewport, so there is nothing to recover
    // from — and yanking the page to the top would just lose the reader's
    // place in whatever is below the chat.
    if (!isCoarse) return;

    // A send while a previous one is still pending replaces it rather than
    // stacking a second scroll behind the first.
    cancelRef.current?.();

    const viewport = window.visualViewport;
    let timer = 0;

    const run = () => {
      cancelRef.current?.();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    cancelRef.current = () => {
      cancelRef.current = null;
      window.clearTimeout(timer);
      viewport?.removeEventListener('resize', run);
    };

    viewport?.addEventListener('resize', run);
    timer = window.setTimeout(run, KEYBOARD_SETTLE_MS);
  }, [isCoarse]);
}
