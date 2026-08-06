import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { usePaintings } from '../hooks/queries/usePaintings';
import { useGiveaways } from '../hooks/queries/useGiveaways';
import { useNews } from '../hooks/queries/useNews';
import { useSettings } from '../hooks/queries/useSettings';
import FeaturedStack, {
  FeaturedStackSkeleton,
} from '../components/FeaturedStack';
import GiveawayHighlight, {
  GiveawayHighlightSkeleton,
} from '../components/GiveawayHighlight';
import NewsBanner, { NewsBannerSkeleton } from '../components/NewsBanner';
import Reveal from '../components/ui/Reveal';
import { cdnImage } from '../utils/imageUrl';
import styles from './HomePage.module.scss';

const MARQUEE_QUOTE = 'Мистецтво - це лінія навколо твоїх думок';
const MARQUEE_AUTHOR = 'Густав Клімт';

// ---------- Hero camera ----------
//
// The Ken Burns move is generated per pass rather than written as fixed
// keyframes: a stylesheet can't vary how far the camera travels, how long it
// takes or whether it pushes in or pulls back, and a loop that repeats the
// same envelope reads as a loop within a minute or two.

// How far the photo may shift at a given zoom before its own edge swings
// into frame. The scaled image overhangs the box by (scale-1)/2 per side and
// a translate of t% moves it by scale*t, so t tops out at (scale-1)/(2*scale).
// Held to 82% of that so the blur fringe stays out of frame as well. Note how
// steeply this shrinks as the camera pulls wide: at 1.45 there's ~12.7% of
// room, at 1.10 barely 3.7% — a wide shot is necessarily a centred one.
function panReach(scale: number) {
  return ((scale - 1) / (2 * scale)) * 100 * 0.82;
}

type PanPoint = { scale: number; x: number; y: number };

// Matches .heroBgImage's resting transform in the stylesheet, so the first
// move picks up exactly where the still frame sat.
const HERO_PAN_REST: PanPoint = { scale: 1.08, x: 0, y: 0 };

// A pass covers the same ground either way, so this is what sets the
// camera's speed — both the drift and the zoom ride the same timeline.
const HERO_PAN_MIN_MS = 8000;
const HERO_PAN_MAX_MS = 12500;
// The arc is handed to the browser as sampled points; this many keeps the
// straight interpolation between them from reading as a series of facets.
const HERO_PAN_SAMPLES = 8;

// The featured strip is a fanned stack, not a grid, so it needs a ceiling.
// The flag itself is free for the admin to set on as many works as they
// like; this is the display cap.
const FEATURED_LIMIT = 10;

// How many paintings the hero works with. A wide screen tours all of them in
// turn; a phone shows one, chosen at random per visit.
const HERO_SLIDE_COUNT = 3;

// Mirrors $breakpoint-lg in _variables.scss. Only used to decide how many
// paintings this viewport gets — the hero itself now looks the same either
// way, so there's no layout riding on this.
const HERO_WIDE_QUERY = '(min-width: 1024px)';

function useWideViewport() {
  const [wide, setWide] = useState(
    () => window.matchMedia(HERO_WIDE_QUERY).matches,
  );

  useEffect(() => {
    const query = window.matchMedia(HERO_WIDE_QUERY);
    const onChange = () => setWide(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return wide;
}

// Pulls a point back onto the safe disc for its zoom. Radial rather than
// per-axis: the disc sits inside the square of allowed offsets, so this
// satisfies both axes at once.
function clampToReach(x: number, y: number, scale: number) {
  const reach = panReach(scale);
  const distance = Math.hypot(x, y);
  if (distance <= reach) return { x, y };
  return { x: (x / distance) * reach, y: (y / distance) * reach };
}

// One continuous camera move, beginning exactly where the previous one
// stopped so the tour never cuts. Picks a fresh heading, a zoom that may
// push in, pull back or barely change, and bows the path sideways so the
// camera arcs across the canvas instead of sliding down a straight line.
function nextPanMove(from: PanPoint) {
  const close = 1.32 + Math.random() * 0.18;
  const wide = 1.08 + Math.random() * 0.12;

  // Most passes commit to a real push in or pull back; only the occasional
  // one holds its zoom and just drifts.
  const roll = Math.random();
  const toScale =
    roll < 0.46
      ? close
      : roll < 0.92
        ? wide
        : Math.min(
            1.5,
            Math.max(1.08, from.scale + (Math.random() - 0.5) * 0.12),
          );

  // Aim across the frame, not at some bearing measured from the centre.
  // A bearing alone says nothing about where the camera already is, so it
  // can land the next stop right beside the current one — those passes
  // crawl, and roughly one in eighteen of them barely moved at all.
  // Heading back through the middle guarantees every pass covers ground.
  const across =
    Math.hypot(from.x, from.y) > 0.5
      ? Math.atan2(-from.y, -from.x)
      : Math.random() * Math.PI * 2;
  const heading = across + (Math.random() - 0.5) * Math.PI * 0.6;

  const spread = panReach(toScale) * (0.7 + Math.random() * 0.3);
  const end = clampToReach(
    Math.cos(heading) * spread,
    Math.sin(heading) * spread,
    toScale,
  );

  // Control point of a quadratic bow, pushed off the straight line between
  // the two ends — this is what turns a slide into a drift.
  const bow =
    (Math.random() - 0.5) * panReach((from.scale + toScale) / 2) * 0.9;
  const control = {
    x: (from.x + end.x) / 2 + Math.cos(heading + Math.PI / 2) * bow,
    y: (from.y + end.y) / 2 + Math.sin(heading + Math.PI / 2) * bow,
  };

  const frames: Keyframe[] = [];
  for (let i = 0; i <= HERO_PAN_SAMPLES; i++) {
    const t = i / HERO_PAN_SAMPLES;
    const inv = 1 - t;
    const scale = from.scale + (toScale - from.scale) * t;
    const point = clampToReach(
      inv * inv * from.x + 2 * inv * t * control.x + t * t * end.x,
      inv * inv * from.y + 2 * inv * t * control.y + t * t * end.y,
      scale,
    );
    frames.push({
      offset: t,
      transform: `scale(${scale.toFixed(4)}) translate(${point.x.toFixed(3)}%, ${point.y.toFixed(3)}%)`,
    });
  }

  return {
    frames,
    durationMs:
      HERO_PAN_MIN_MS + Math.random() * (HERO_PAN_MAX_MS - HERO_PAN_MIN_MS),
    end: { scale: toScale, ...end },
  };
}

// The hero headline, as lines of parts — stacked and staggered by
// .titleLine.
const HERO_TITLE_LINES: Array<Array<{ text: string; em?: boolean }>> = [
  [{ text: 'Мистецтво,' }],
  [{ text: 'що ' }, { text: 'говорить', em: true }],
];
const HERO_TITLE_TEXT = 'Мистецтво, що говорить';

// Kicker above the headline — its letters slide in one after another, left
// to right (see .eyebrowLetter), ahead of the headline's own reveal.
const HERO_EYEBROW_TEXT = 'Галерея сучасного мистецтва';
const HERO_EYEBROW_STAGGER_MS = 35;

// Letters the reveal cycles through before a slot locks onto its real one.
const SCRAMBLE_ALPHABET = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЮЯ';

// Flattened once at module scope: every character tagged with its scramble
// slot, or -1 for spaces and punctuation, which never spin.
const HERO_TITLE_SLOT_CHARS: string[] = [];
const HERO_TITLE_CELLS = HERO_TITLE_LINES.map((line) =>
  line.map((part) => ({
    em: part.em === true,
    cells: [...part.text].map((char) => {
      if (!/\p{L}/u.test(char)) return { char, slot: -1 };
      HERO_TITLE_SLOT_CHARS.push(char);
      return { char, slot: HERO_TITLE_SLOT_CHARS.length - 1 };
    }),
  })),
);
const HERO_TITLE_SLOTS = HERO_TITLE_SLOT_CHARS.length;

// Reveal pacing, counted in ticks of SCRAMBLE_TICK_MS: the chosen letters
// spin together for the first stretch, then lock one at a time, left to
// right, holding for a beat each while the rest keep spinning.
const SCRAMBLE_TICK_MS = 45;
const SCRAMBLE_TICKS_BEFORE_LOCK = 13;
const SCRAMBLE_TICKS_PER_LOCK = 3;
// Only a sparse scatter of letters churns — the headline stays readable
// throughout and the movement reads as deliberate rather than noisy.
const SCRAMBLE_DENSITY = 0.55;

function randomGlyph(target: string) {
  const glyph =
    SCRAMBLE_ALPHABET[Math.floor(Math.random() * SCRAMBLE_ALPHABET.length)];
  // Match the target's case so the scramble reads consistently on desktop,
  // where the title isn't uppercased by CSS.
  return target === target.toLowerCase() ? glyph.toLowerCase() : glyph;
}

// Decides which letters spin on this page load and in what order they lock.
// Returns a lock position per slot, or -1 for the letters that are simply
// there from the first frame. Two neighbours never spin at once, which is
// what keeps the sparse, legible rhythm — "Мистецтво" churns on и/е/т/о
// while М, с, ц, в hold still.
function pickScramblePlan() {
  const lockOrder = new Array<number>(HERO_TITLE_SLOTS).fill(-1);
  let total = 0;
  let previousPicked: boolean = false;

  for (let slot = 0; slot < HERO_TITLE_SLOTS; slot++) {
    const picked: boolean = !previousPicked && Math.random() < SCRAMBLE_DENSITY;
    previousPicked = picked;
    if (picked) lockOrder[slot] = total++;
  }

  // Vanishingly unlikely, but a title with nothing to reveal would just pop
  // in — give it at least one letter to play with.
  if (total === 0 && HERO_TITLE_SLOTS > 0) {
    lockOrder[0] = total++;
  }

  return { lockOrder, total };
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Slot-machine reveal of the hero headline. Its own component so the ~45ms
// re-render cadence stays local instead of re-rendering the whole page.
function HeroTitle({ start }: { start: boolean }) {
  // Which letters churn is drawn fresh on each mount, so the headline
  // doesn't assemble the same way twice.
  const [plan] = useState(pickScramblePlan);
  const [locked, setLocked] = useState(() =>
    prefersReducedMotion() ? plan.total : 0,
  );
  const [glyphs, setGlyphs] = useState(() =>
    HERO_TITLE_SLOT_CHARS.map(randomGlyph),
  );

  useEffect(() => {
    // Held until the first hero painting has decoded, so the headline
    // assembles onto the photo instead of an empty background.
    if (!start) return;
    if (prefersReducedMotion()) return;

    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      const settled =
        tick <= SCRAMBLE_TICKS_BEFORE_LOCK
          ? 0
          : Math.min(
              plan.total,
              Math.floor(
                (tick - SCRAMBLE_TICKS_BEFORE_LOCK) / SCRAMBLE_TICKS_PER_LOCK,
              ) + 1,
            );

      setLocked(settled);
      setGlyphs((prev) =>
        prev.map((glyph, slot) => {
          const lock = plan.lockOrder[slot];
          // Static letters and already-locked ones keep whatever they hold.
          if (lock < 0 || lock < settled) return glyph;
          return randomGlyph(HERO_TITLE_SLOT_CHARS[slot]);
        }),
      );

      if (settled >= plan.total) clearInterval(id);
    }, SCRAMBLE_TICK_MS);

    return () => clearInterval(id);
  }, [plan, start]);

  return (
    // The animated glyphs are decorative churn — screen readers get the
    // finished sentence off the label instead.
    <h1 className={styles.title} aria-label={HERO_TITLE_TEXT}>
      {HERO_TITLE_CELLS.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {/* Keeps the lines a single sentence once desktop inlines them. */}
          {lineIndex > 0 && ' '}
          <span className={styles.titleLine} aria-hidden="true">
            {line.map((part, partIndex) => {
              const content = part.cells.map((cell, cellIndex) => {
                const lock = cell.slot < 0 ? -1 : plan.lockOrder[cell.slot];
                // Never-spinning letters are there from the first frame; the
                // rest drop out of the scramble as their turn comes up.
                if (lock < 0 || lock < locked) {
                  return <Fragment key={cellIndex}>{cell.char}</Fragment>;
                }

                // The real letter, kept invisible, holds the slot's width so
                // the headline never reflows as glyphs cycle through it.
                return (
                  <span key={cellIndex} className={styles.titleLetter}>
                    <span className={styles.titleLetterGhost}>{cell.char}</span>
                    <span className={styles.titleLetterSpin}>
                      {glyphs[cell.slot]}
                    </span>
                  </span>
                );
              });

              return part.em ? (
                <em key={partIndex}>{content}</em>
              ) : (
                <Fragment key={partIndex}>{content}</Fragment>
              );
            })}
          </span>
        </Fragment>
      ))}
    </h1>
  );
}

export default function HomePage() {
  const { data: paintingsResponse, isLoading: loading } = usePaintings({
    page: 1,
    limit: 200,
    isAvailable: true,
  });
  const { data: giveaways, isLoading: giveawayLoading } = useGiveaways();
  const { data: news, isLoading: newsLoading } = useNews();
  const { data: settings } = useSettings();

  // Memoized so heroSlide below keeps a stable identity between renders —
  // the pan effect depends on it, and react-query's structural sharing means
  // a refetch of unchanged data won't restart the animation.
  const paintings = useMemo(
    () => paintingsResponse?.data ?? [],
    [paintingsResponse],
  );
  const featured = useMemo(
    () => paintings.filter((p) => p.isFeatured),
    [paintings],
  );

  const giveaway =
    (giveaways ?? [])
      .filter((item) => item.isActive)
      .sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      )[0] ?? null;

  const latestNews = news?.[0] ?? null;

  // The three paintings behind the hero. The admin names them on the
  // settings page; any slot left empty — or pointing at a work since removed
  // or hidden — is filled from the featured pool, and duplicates are skipped,
  // so these always end up three different paintings when the gallery has
  // that many.
  const heroSlides = useMemo(() => {
    const configured = [
      settings?.heroPaintingId1,
      settings?.heroPaintingId2,
      settings?.heroPaintingId3,
    ];
    const pool = featured.length > 0 ? featured : paintings;
    const chosen: typeof paintings = [];

    for (const id of configured) {
      const match =
        id == null
          ? undefined
          : paintings.find((painting) => painting.id === id);
      if (match && !chosen.some((painting) => painting.id === match.id)) {
        chosen.push(match);
      }
    }
    for (const painting of pool) {
      if (chosen.length >= HERO_SLIDE_COUNT) break;
      if (!chosen.some((picked) => picked.id === painting.id)) {
        chosen.push(painting);
      }
    }
    return chosen;
  }, [
    paintings,
    featured,
    settings?.heroPaintingId1,
    settings?.heroPaintingId2,
    settings?.heroPaintingId3,
  ]);

  const wideViewport = useWideViewport();
  // A phone shows one painting, drawn once per visit — two people opening
  // the site can land on different ones. Held in state so a re-render doesn't
  // reshuffle it mid-view.
  const [phoneRoll] = useState(Math.random);

  // Only what this viewport will actually display gets rendered, so a phone
  // never downloads the two paintings it isn't going to show.
  const slides = useMemo(() => {
    if (heroSlides.length === 0) return [];
    if (wideViewport) return heroSlides;
    return [heroSlides[Math.floor(phoneRoll * heroSlides.length)]];
  }, [heroSlides, wideViewport, phoneRoll]);

  // Gates the hero copy's entrance: nothing animates until the painting is
  // actually on screen (see .heroTextWaiting).
  const [heroReady, setHeroReady] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const slideRefs = useRef<Array<HTMLImageElement | null>>([]);

  // Exactly the URLs the <img> tags render, so waiting on one warms the same
  // cache entry the browser will use rather than fetching the photo twice.
  const slideSrcs = useMemo(
    () => slides.map((painting) => cdnImage(painting.cardImage, 1600)),
    [slides],
  );
  const firstSlideSrc = slideSrcs[0] ?? null;

  useEffect(() => {
    if (!firstSlideSrc) {
      // Nothing to wait for — once the request has settled, release the copy
      // rather than leaving the hero blank forever.
      if (!loading) setHeroReady(true);
      return;
    }

    let cancelled = false;

    // Wait for the photo to decode before revealing anything: an <img> that
    // hasn't decoded yet paints nothing, so the copy would otherwise animate
    // over an empty screen. Only the first one is waited on — the other two
    // have a full pass each to arrive. Capped so a broken image still
    // releases the copy instead of stalling the hero forever.
    const decoded = (async () => {
      try {
        const img = new Image();
        img.src = firstSlideSrc;
        await img.decode();
      } catch {
        // Undecodable — show it anyway and let the browser deal.
      }
    })();
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));

    void Promise.race([decoded, timeout]).then(() => {
      if (cancelled) return;
      setHeroReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [firstSlideSrc, loading]);

  // The camera. One pass over a painting, then — when there's more than one —
  // a handover to the next, which fades in over the outgoing frame and starts
  // its own pass. With a single painting it simply keeps drifting, each pass
  // picking up exactly where the last stopped.
  //
  // Driven through the Web Animations API rather than CSS keyframes because
  // the shape of every pass differs, and a stylesheet can't vary its own
  // distance, duration or zoom direction.
  useEffect(() => {
    if (!heroReady || slides.length === 0 || prefersReducedMotion()) return;

    let cancelled = false;
    // One entry per slide. An outgoing pass is left holding its final frame
    // while it fades out — cancelling it there would snap the photo back to
    // rest mid-crossfade — and is only dropped when that slide comes round
    // again, by which point it's invisible.
    const running: Array<Animation | null> = [];

    const run = async () => {
      let index = 0;
      let from = HERO_PAN_REST;

      while (!cancelled) {
        const image = slideRefs.current[index];
        if (!image) return;

        const move = nextPanMove(from);
        running[index]?.cancel();
        const pass = image.animate(move.frames, {
          duration: move.durationMs,
          // Nearly linear through the middle, with only mild smoothing at
          // the ends. A full ease-in-out would drop the camera to a dead
          // stop at every junction between passes, and on passes this short
          // that reads as move-pause-move rather than one continuous drift.
          easing: 'cubic-bezier(0.4, 0.1, 0.6, 0.9)',
          fill: 'forwards',
        });
        running[index] = pass;

        try {
          await pass.finished;
        } catch {
          return; // cancelled mid-pass
        }
        if (cancelled) return;

        if (slides.length === 1) {
          from = move.end;
          continue;
        }

        index = (index + 1) % slides.length;
        // A fresh painting starts from rest rather than inheriting the
        // outgoing one's framing.
        from = HERO_PAN_REST;
        setActiveSlide(index);
      }
    };

    void run();

    return () => {
      cancelled = true;
      for (const animation of running) animation?.cancel();
    };
  }, [heroReady, slides]);

  // Each half of the two-copy track (see .marqueeTrack's -50% scroll) has to
  // be wider than the viewport or a gap opens up mid-loop — one quote isn't,
  // so repeat it. The dot separates each repetition from the next.
  const marqueeContent = (
    <>
      {[0, 1, 2].map((copy) => (
        <span key={copy} className={styles.marqueeItem}>
          {MARQUEE_QUOTE}
          <span className={styles.marqueeAuthor}>— {MARQUEE_AUTHOR}</span>
          <span className={styles.marqueeDot} />
        </span>
      ))}
    </>
  );

  return (
    <div>
      <section className={styles.hero}>
        {!loading && slides.length > 0 && (
          <div className={styles.heroBg} aria-hidden="true">
            {slides.map((painting, index) => (
              <img
                key={painting.id}
                ref={(element) => {
                  slideRefs.current[index] = element;
                }}
                src={slideSrcs[index]}
                alt=""
                // The largest thing on the first screen — the one on show
                // jumps the queue ahead of everything below the fold, while
                // the paintings waiting their turn stay out of its way.
                fetchPriority={index === activeSlide ? 'high' : 'low'}
                decoding="async"
                className={`${styles.heroBgImage} ${
                  index === activeSlide ? styles.heroBgImageActive : ''
                }`}
              />
            ))}
            <div className={styles.heroOverlay} />
          </div>
        )}

        <div
          className={`${styles.heroText} ${
            heroReady ? '' : styles.heroTextWaiting
          }`}
        >
          {/* Letters are decorative once split — the label carries the text. */}
          <span className={styles.eyebrow} aria-label={HERO_EYEBROW_TEXT}>
            <span className={styles.eyebrowText} aria-hidden="true">
              {[...HERO_EYEBROW_TEXT].map((char, index) => (
                <span
                  key={index}
                  className={styles.eyebrowLetter}
                  style={{
                    animationDelay: `${index * HERO_EYEBROW_STAGGER_MS}ms`,
                  }}
                >
                  {char === ' ' ? ' ' : char}
                </span>
              ))}
            </span>
          </span>
          <HeroTitle start={heroReady} />
          <p className={styles.subtitle}>
            Оригінальні картини — кожна в єдиному екземплярі.
          </p>
          <div className={styles.actions}>
            <Link to="/catalog" className={styles.ctaButton}>
              Каталог
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 16 16 8M9.5 8H16v6.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <Link to="/gallery" className={styles.ctaGhost}>
              Галерея
            </Link>
          </div>
        </div>
      </section>

      {/* Opaque wrapper that slides up over the fixed hero backdrop as the
          page scrolls — see .heroBg's position:fixed. */}
      <div className={`${styles.pageContent} ${styles.pageContentOpen}`}>
        <div className={styles.marquee} aria-hidden="true">
          <div className={styles.marqueeTrack}>
            {marqueeContent}
            {marqueeContent}
          </div>
        </div>

        {newsLoading ? (
          <section className={styles.section}>
            <NewsBannerSkeleton />
          </section>
        ) : latestNews ? (
          <Reveal as="section" className={styles.section}>
            <NewsBanner news={latestNews} />
          </Reveal>
        ) : null}

        {giveawayLoading ? (
          <section className={styles.section}>
            <GiveawayHighlightSkeleton />
          </section>
        ) : giveaway ? (
          <Reveal as="section" className={styles.section}>
            <GiveawayHighlight giveaway={giveaway} />
          </Reveal>
        ) : null}

        <section className={styles.section}>
          <Reveal className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Рекомендовані</h2>
            <Link
              to="/catalog"
              aria-label="Всі роботи"
              className={styles.sectionLink}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h13M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </Reveal>

          {loading ? (
            <FeaturedStackSkeleton />
          ) : featured.length > 0 ? (
            <FeaturedStack paintings={featured.slice(0, FEATURED_LIMIT)} />
          ) : (
            <p className={styles.muted}>Скоро тут з'являться нові роботи</p>
          )}
        </section>

        <Reveal as="section" className={styles.values}>
          <div className={styles.valueCard}>
            <span className={styles.valueIcon}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3c-4 4.5-6 7.5-6 10a6 6 0 0 0 12 0c0-2.5-2-5.5-6-10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <h3 className={styles.valueTitle}>Оригінальний живопис</h3>
            <p className={styles.valueText}>
              Жодних принтів чи копій — тільки авторські роботи, написані
              фарбами на полотні.
            </p>
          </div>

          <div className={styles.valueCard}>
            <span className={styles.valueIcon}>
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="3.5"
                  y="6"
                  width="13"
                  height="11"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M16.5 9.5H19a1.5 1.5 0 0 1 1.2.6l0.8 1.07a1.5 1.5 0 0 1 .3.9v3.43a1.5 1.5 0 0 1-1.5 1.5h-1.3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="8"
                  cy="17"
                  r="1.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <circle
                  cx="17"
                  cy="17"
                  r="1.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </span>
            <h3 className={styles.valueTitle}>Доставка Новою поштою</h3>
            <p className={styles.valueText}>
              Надійне пакування і відправка у будь-яке відділення по всій
              Україні.
            </p>
          </div>

          <div className={styles.valueCard}>
            <span className={styles.valueIcon}>
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3.5 5 6.5v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9v-5l-7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2.2 2.2L15.5 9.8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h3 className={styles.valueTitle}>Зручна оплата</h3>
            <p className={styles.valueText}>
              Оплата при отриманні або переказ на карту — як вам зручніше.
            </p>
          </div>
        </Reveal>
      </div>

      {/* Deliberate transparent window onto the fixed hero backdrop — the
          slot-machine animation peeks through between the opaque sheets.
          Mobile/tablet only (the backdrop doesn't exist on desktop). */}
      <div className={styles.heroPeek} aria-hidden="true" />

      <div className={`${styles.pageContent} ${styles.pageContentClose}`}>
        <Reveal as="section" className={styles.ctaBand}>
          <h2 className={styles.ctaTitle}>
            Знайдіть картину, яка <em>заговорить</em> до вас
          </h2>
          <Link to="/catalog" className={styles.ctaBandButton}>
            До каталогу
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </Reveal>
      </div>
    </div>
  );
}
