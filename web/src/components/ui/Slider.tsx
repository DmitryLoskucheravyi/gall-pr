'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';

import ArrowButton from './ArrowButton';
import styles from './Slider.module.scss';

// A horizontal row of cards that behaves as a slider rather than as an
// overflowing box: no scrollbar, arrows that page by a screenful, a dot per
// page, cards that come to rest flush with the edge, and a mouse that can
// drag it the way a finger already can.
//
// Still a native scroller underneath. Touch, trackpads, shift-wheel and the
// keyboard all keep working for free, and the arrows only ask it to scroll —
// so there is no second idea of "where the slider is" to fall out of step
// with the real one.

type Props = {
  children: ReactNode;
  /** Names the row for assistive tech, e.g. the series it shows. */
  label: string;
  className?: string;
  /** Run the row out to the screen's edges, over the page's side margins,
   * with no fade — the cards themselves go off the edge. The first card
   * still lines up with the content above it. */
  bleed?: boolean;
};

// Past this many pixels a mouse press is a drag, and the click it ends in
// must not open the card it was released over.
const DRAG_SLOP = 6;

// Below this the slider moves one card at a time, centred. Matches the media
// query on .track in the stylesheet.
const NARROW = '(max-width: 640px)';

type View = { prev: boolean; next: boolean; page: number; pages: number };

export default function Slider({ children, label, className, bleed = false }: Props) {
  const { t } = useTranslation('common');
  const trackRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ prev: false, next: false, page: 0, pages: 1 });

  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Everything the controls show is read off the scroller itself.
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const max = track.scrollWidth - track.clientWidth;
    // A pixel of tolerance: snapping and subpixel layout leave the ends a
    // fraction short of 0 and max.
    //
    // A track with no width yet (hidden, or not laid out) would divide by
    // zero: Infinity pages, and Array.from({ length: Infinity }) throws, which
    // took the whole reviews section down. It is one page until it has a size.
    const pages =
      max > 1 && track.clientWidth > 0
        ? Math.min(Math.ceil(track.scrollWidth / track.clientWidth - 0.05), 50)
        : 1;
    const page = max > 1 ? Math.round((track.scrollLeft / max) * (pages - 1)) : 0;
    const next: View = {
      prev: track.scrollLeft > 1,
      next: track.scrollLeft < max - 1,
      page,
      pages,
    };

    setView((was) =>
      was.prev === next.prev &&
      was.next === next.next &&
      was.page === next.page &&
      was.pages === next.pages
        ? was
        : next,
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    measure();
    track.addEventListener('scroll', onScroll, { passive: true });
    // Card widths follow the viewport, and images landing change nothing
    // here but a font swap can: re-measure on any change of size.
    const observer = new ResizeObserver(onScroll);
    observer.observe(track);
    for (const child of Array.from(track.children)) observer.observe(child);

    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [measure, children]);

  // On a wide screen a page is a screenful less one card's worth of overlap,
  // so the card at the edge carries over and the reader keeps their place.
  //
  // On a phone, where one card nearly fills the row, paging by a screenful
  // skipped cards and left the next one half off the edge. There each press
  // moves exactly one card and centres it — the same place the swipe's
  // snapping settles a card (see .track in the stylesheet).
  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;

    if (window.matchMedia(NARROW).matches) {
      const center = track.scrollLeft + track.clientWidth / 2;
      const items = Array.from(track.children) as HTMLElement[];
      const centres = items.map((el) => el.offsetLeft + el.offsetWidth / 2);
      // The one nearest the middle now, then its neighbour that way.
      let current = 0;
      centres.forEach((c, i) => {
        if (Math.abs(c - center) < Math.abs(centres[current] - center)) current = i;
      });
      const target = items[Math.min(items.length - 1, Math.max(0, current + direction))];
      if (!target) return;
      track.scrollTo({
        left: target.offsetLeft + target.offsetWidth / 2 - track.clientWidth / 2,
        behavior: 'smooth',
      });
      return;
    }

    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' });
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const left = view.pages > 1 ? (max * index) / (view.pages - 1) : 0;
    track.scrollTo({ left, behavior: 'smooth' });
  };

  // Mouse drag. Touch and pen already scroll natively, so only a mouse is
  // handled here; snapping is switched off for the length of the drag, or
  // the browser would fight every pixel of it.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const track = trackRef.current;
    if (!track || track.scrollWidth <= track.clientWidth) return;
    drag.current = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const track = trackRef.current;
    if (!state || !track || state.id !== event.pointerId) return;

    const dx = event.clientX - state.x;
    if (!state.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return;
      state.moved = true;
      track.setPointerCapture(event.pointerId);
      track.dataset.dragging = 'true';
    }
    track.scrollLeft = state.left - dx;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    const track = trackRef.current;
    drag.current = null;
    if (!state || !track || state.id !== event.pointerId || !state.moved) return;

    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
    // Snapping comes back on, and the browser settles the row on the
    // nearest card by itself.
    delete track.dataset.dragging;
    suppressClick.current = true;
  };

  const onClickCapture = (event: ReactMouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const scrollable = view.pages > 1;

  return (
    <div
      className={`${styles.slider} ${className ?? ''}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-bleed={bleed || undefined}
      data-prev={view.prev || undefined}
      data-next={view.next || undefined}
    >
      <div
        ref={trackRef}
        className={styles.track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        // Images and links inside would otherwise start a native drag.
        onDragStart={(event) => event.preventDefault()}
      >
        {children}
      </div>

      {scrollable ? (
        <div className={styles.controls}>
          <div className={styles.dots}>
            {Array.from({ length: view.pages }, (_, index) => (
              <button
                key={index}
                type="button"
                className={styles.dot}
                data-current={index === view.page || undefined}
                aria-current={index === view.page ? 'true' : undefined}
                aria-label={t('slider.page', { page: index + 1, total: view.pages })}
                onClick={() => goTo(index)}
              />
            ))}
          </div>

          <div className={styles.arrows}>
            <ArrowButton
              direction="prev"
              onClick={() => page(-1)}
              disabled={!view.prev}
              aria-label={t('slider.prev')}
            />
            <ArrowButton
              direction="next"
              onClick={() => page(1)}
              disabled={!view.next}
              aria-label={t('slider.next')}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
