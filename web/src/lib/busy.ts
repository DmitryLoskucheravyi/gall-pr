// A tiny shared "something is loading" counter, for the work TanStack Query
// cannot see: a route that is still streaming in, an upload in flight. The
// loading cursor (components/ui/LoadingCursor.tsx) reads it together with the
// query and mutation counts.
//
// A counter rather than a flag, so two overlapping sources cannot clear each
// other: each start() hands back its own stop, and the cursor shows until the
// last one has stopped.

let count = 0;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

/** Marks the page busy; call the returned function, once, when done. */
export function startBusy(): () => void {
  count += 1;
  notify();

  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    count -= 1;
    notify();
  };
}

export function subscribeBusy(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isBusy(): boolean {
  return count > 0;
}
