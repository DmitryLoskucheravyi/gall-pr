'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Painting } from '../../types/painting.types';
import { LocalizedLink as Link } from '../ui/LocalizedLink';
import Loader from '../ui/Loader';
import { useLocale } from '../../hooks/useLocale';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useExchangeRate } from '../../hooks/queries/useExchangeRate';
import { cdnImage } from '../../utils/imageUrl';
import { formatPrice } from '../../utils/formatPrice';
import { pickLocale } from '../../utils/localizedField';
import type { PaintingRingScene } from './paintingRingScene';
import ArrowButton from '../ui/ArrowButton';
import Slider from '../ui/Slider';
import styles from './PaintingShowcase.module.scss';

// The featured works on a turning ring — the homepage's showcase now that the
// corridor is shelved. The 3D scene lives in paintingRingScene.ts and is only
// fetched when this section is about to reach the screen, so three.js costs
// nothing to a visitor who never scrolls this far.
//
// Without WebGL, or if the scene fails to load, the same works are shown as a
// plain swipeable strip. The caption and the controls are ordinary HTML in
// both cases: the canvas is decoration, the links are what a screen reader
// and a crawler get.

// Texture width. The active work is at most ~40% of the viewport across.
const TEXTURE_WIDTH = 900;
// Start fetching the scene this far before the section scrolls into view.
const PRELOAD_MARGIN = '600px';
// How long the scene may wait for a quiet moment before being built anyway.
// Long enough to let a scroll through the hero finish, short enough that it
// is always ready before the section itself arrives.
const IDLE_TIMEOUT_MS = 2000;

type Mode = 'waiting' | 'loading' | 'ring' | 'strip';

export default function PaintingShowcase({ paintings }: { paintings: Painting[] }) {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const navigate = useLocalizedNavigate();
  const reduced = useReducedMotion();
  const { data: usdRate } = useExchangeRate();

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PaintingRingScene | null>(null);

  const [mode, setMode] = useState<Mode>('waiting');
  const [active, setActive] = useState(0);

  // The scene's callbacks outlive any one render; read the latest list
  // through a ref rather than re-creating the scene when it changes identity.
  const paintingsRef = useRef(paintings);
  paintingsRef.current = paintings;

  // Ids, not the array: a refetch that returns the same works must not tear
  // down and rebuild the whole scene.
  const ids = paintings.map((p) => p.id).join(',');

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !ids) return;

    let cancelled = false;
    let scene: PaintingRingScene | null = null;
    let idle = 0;
    let timer = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setMode('loading');

        // One retry before giving up on the ring: a chunk that fails to load
        // once — a dropped connection, a dev server restarting — is usually
        // there a moment later, and the fallback lasts for the whole visit.
        const loadScene = () =>
          import('./paintingRingScene').catch(
            () =>
              new Promise<typeof import('./paintingRingScene')>((resolve, reject) =>
                window.setTimeout(
                  () => import('./paintingRingScene').then(resolve, reject),
                  1500,
                ),
              ),
          );

        loadScene()
          .then(({ PaintingRingScene, supportsWebGL }) => {
            if (cancelled) return;
            const canvas = canvasRef.current;
            if (!canvas || !supportsWebGL()) {
              setMode('strip');
              return;
            }

            // Built in a quiet moment, not the moment the import lands.
            //
            // The section preloads 600px early, which puts the constructor in
            // the middle of a scroll through the hero — and building a WebGL
            // scene is not something that can be split across frames: lights,
            // shadow maps, twelve meshes, and the first render's shader
            // compile all happen in one go. That showed up as a 500–800ms
            // frozen frame while the reader was still scrolling, which is
            // exactly the stutter this preloading is supposed to prevent.
            //
            // An idle callback puts it between scrolls instead. The timeout
            // is the backstop for a reader who never stops scrolling, and for
            // Safari, which has no requestIdleCallback at all.
            const build = () => {
              if (cancelled) return;
              const list = paintingsRef.current;
              scene = new PaintingRingScene(
                canvas,
                list.map((p) => ({ src: cdnImage(p.cardImage, TEXTURE_WIDTH) })),
                {
                  reducedMotion: reduced,
                  onActiveChange: setActive,
                  onOpen: (index) => {
                    const painting = paintingsRef.current[index];
                    if (painting) navigate(`/painting/${painting.id}`);
                  },
                  onReady: () => {
                    if (!cancelled) setMode('ring');
                  },
                },
              );
              sceneRef.current = scene;
            };

            if (typeof requestIdleCallback === 'function') {
              idle = requestIdleCallback(build, { timeout: IDLE_TIMEOUT_MS });
            } else {
              timer = window.setTimeout(build, 300);
            }
          })
          .catch(() => {
            if (!cancelled) setMode('strip');
          });
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(section);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (idle && typeof cancelIdleCallback === 'function') cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
      scene?.destroy();
      sceneRef.current = null;
    };
    // `reduced` only changes the scene's pacing; a visitor toggling the OS
    // setting mid-visit can live with the old pacing until the next load.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, navigate]);

  if (!paintings.length) return null;

  const current = paintings[Math.min(active, paintings.length - 1)];
  const title = pickLocale(current, 'title', locale);
  const series = current.series ? pickLocale(current.series, 'name', locale) : null;
  const size =
    current.width && current.height
      ? `${current.width} × ${current.height} ${t('sizeUnit', { ns: 'common' })}`
      : null;

  return (
    <section ref={sectionRef} className={styles.showcase} aria-labelledby="showcase-title">
      <header className={styles.head}>
        <p className={styles.kicker}>{t('showcase.kicker')}</p>
        <h2 id="showcase-title" className={styles.title}>
          {t('showcase.title')}
        </h2>
      </header>

      {mode === 'strip' ? (
        // The fallback when there is no WebGL: the same works as a slider —
        // the site's own, not a scrollbar across the room.
        <Slider className={styles.strip} label={t('showcase.title')}>
          {paintings.map((painting) => (
            <div key={painting.id} className={styles.stripItem}>
              <Link to={`/painting/${painting.id}`} className={styles.stripLink}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cdnImage(painting.cardImage, 600)}
                  alt={pickLocale(painting, 'title', locale)}
                  loading="lazy"
                  draggable={false}
                />
                <span>{pickLocale(painting, 'title', locale)}</span>
              </Link>
            </div>
          ))}
        </Slider>
      ) : (
        <>
          <div className={styles.stage} data-ready={mode === 'ring'}>
            <canvas
              ref={canvasRef}
              className={styles.canvas}
              // The ring is decoration; the caption below carries the work.
              aria-hidden="true"
            />
            {mode !== 'ring' && (
              <div className={styles.stageLoader}>
                <Loader label={t('loading', { ns: 'common' })} />
              </div>
            )}
            <p className={styles.hint} aria-hidden="true">
              {t('showcase.hint')}
            </p>
          </div>

          <div className={styles.caption} aria-live="polite">
            <ArrowButton
              direction="prev"
              className={styles.arrow}
              onClick={() => sceneRef.current?.prev()}
              aria-label={t('showcase.prev')}
              disabled={paintings.length < 2}
            />

            <div className={styles.captionText}>
              <span className={styles.counter}>
                {String(active + 1).padStart(2, '0')} / {String(paintings.length).padStart(2, '0')}
              </span>
              <Link to={`/painting/${current.id}`} className={styles.workTitle}>
                {title}
              </Link>
              <span className={styles.meta}>
                {[series, current.technique ? pickLocale(current.technique, 'name', locale) : null, size]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span className={styles.price}>
                {formatPrice(Number(current.price), locale, usdRate)}
              </span>
            </div>

            <ArrowButton
              direction="next"
              className={styles.arrow}
              onClick={() => sceneRef.current?.next()}
              aria-label={t('showcase.next')}
              disabled={paintings.length < 2}
            />
          </div>
        </>
      )}

      <div className={styles.footer}>
        {/* The same link the hero ends on — uppercase, spaced, the outward
            arrow, a hairline over it — so the page's two ways into the
            catalogue read as one control. */}
        <Link to="/catalog" className={styles.allLink}>
          {t('showcase.all')}
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M8 16 16 8M9.5 8H16v6.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
