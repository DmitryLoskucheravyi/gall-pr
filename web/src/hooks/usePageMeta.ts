import { useEffect } from 'react';

const SITE_NAME = 'Viktorumm';
const DEFAULT_TITLE = 'Viktorumm — галерея сучасного українського живопису';

// Sets the document title and meta description per route. A SPA ships one
// static <title>, so without this every page looks identical to crawlers and
// in browser tabs. Googlebot renders JS, so these updates are picked up;
// non-JS crawlers still get the sensible defaults from index.html.
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const previous = meta?.getAttribute('content') ?? null;
    if (meta && description) meta.setAttribute('content', description);

    return () => {
      document.title = DEFAULT_TITLE;
      if (meta && previous !== null) meta.setAttribute('content', previous);
    };
  }, [title, description]);
}
