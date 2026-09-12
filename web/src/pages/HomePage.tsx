import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { useHeroSequence } from '../hooks/useHeroSequence';
import { usePaintings } from '../hooks/queries/usePaintings';
import { useGiveaways } from '../hooks/queries/useGiveaways';
import { useNews } from '../hooks/queries/useNews';
import GiveawayHighlight, {
  GiveawayHighlightSkeleton,
} from '../components/GiveawayHighlight';
import NewsBanner, { NewsBannerSkeleton } from '../components/NewsBanner';
import CorridorSection from '../components/CorridorSection';
import Reveal from '../components/ui/Reveal';
import styles from './HomePage.module.scss';

const MARQUEE_QUOTE = 'Мистецтво - це лінія навколо твоїх думок';
const MARQUEE_AUTHOR = 'Густав Клімт';

// How many works the corridor is hung with. The flag itself is free for the
// admin to set on as many as they like; this is the display cap, and it is
// really a cap on how long the walk is — each work adds a couple of screens
// of scrolling to it.
const FEATURED_LIMIT = 15;

// Module scope so the object keeps its identity between renders — the hook
// watches it, and a fresh literal each time would re-attach the source and
// restart the footage on every render.
const HERO_FOOTAGE = {
  scrub: '/hero-paint.mp4',
  frames: { base: '/frames/hero', count: 48 },
};

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
  const { data: paintingsResponse } = usePaintings({
    page: 1,
    limit: 200,
    isAvailable: true,
  });
  const { data: giveaways, isLoading: giveawayLoading } = useGiveaways();
  const { data: news, isLoading: newsLoading } = useNews();

  // A touch screen has no hovering pointer to follow, so the sequence there
  // is driven by scroll alone rather than sitting dead.
  const coarsePointer = useCoarsePointer();
  const { trackRef, stickyRef, videoRef, canvasRef } = useHeroSequence({
    noPointer: coarsePointer,
    sources: HERO_FOOTAGE,
    // The first screen — it does not wait for anything.
    eager: true,
  });

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

  // Gates the hero copy's entrance: nothing animates until there is
  // something behind it (see .heroTextWaiting).
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // The poster, not the paintings: it's what the hero paints first, and
    // the video seeks to its own first frame over the top of it. Waiting on
    // the gallery here instead would hold the copy behind a network round
    // trip for a photograph this screen no longer shows. Capped so a broken
    // file still releases the copy rather than stalling the hero forever.
    const decoded = (async () => {
      try {
        const img = new Image();
        img.src = '/hero-paint.jpg';
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
  }, []);

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
      {/* The scroll track. It is several screens tall and holds nothing of
          its own — its height is the runway the sequence plays along, and
          .heroSticky is pinned across it. Everything below the track stays
          where it is until the sequence has finished. */}
      <section className={styles.hero} ref={trackRef}>
        <div className={styles.heroSticky} ref={stickyRef}>
          {/* Independent of the paintings query: the footage is the whole of
              the first screen now, and holding it back until that request
              lands would leave the hero blank for the round trip. */}
          <div className={styles.heroBg} aria-hidden="true">
            {/* The stage the depth is built on: the footage sits at its own
                translateZ, so the perspective declared here — not a set of
                hand-tuned offsets — is what moves it against the copy in
                front. See .heroStage. */}
            <div className={styles.heroStage}>
              {/* Macro oil paint on canvas, filling the frame. It never
                  plays by itself — useHeroSequence walks it in step with the
                  scroll, so the drift across the impasto is something the
                  reader drives rather than watches. Decorative and silent,
                  so there is nothing to caption and no controls to expose.

                  Two elements for the one shot: a video where it can be
                  scrubbed, and the same seconds as drawn stills where it
                  can't. See the note on Sources in useHeroSequence. */}
              {coarsePointer ? (
                <canvas
                  className={styles.heroWall}
                  ref={canvasRef}
                  // Stands in until the first frame is drawn, and is all a
                  // reduced-motion visitor ever sees. A canvas has no poster
                  // of its own, so it wears one.
                  style={{ backgroundImage: 'url(/hero-paint.jpg)' }}
                />
              ) : (
                <video
                  className={styles.heroWall}
                  ref={videoRef}
                  poster="/hero-paint.jpg"
                  muted
                  playsInline
                  // Seeking needs the frames already in hand: on `metadata`
                  // the first scroll would stall against the network instead
                  // of moving the picture.
                  preload="auto"
                />
              )}
              <div className={styles.heroOverlay} />
            </div>
          </div>

          {/* Carries the entrance gate for the whole block, but no transform
              of its own — the approach applies to .heroText alone, so the
              links below it can sit still while the words travel. */}
          <div
            className={`${styles.heroCopy} ${
              heroReady ? '' : styles.heroTextWaiting
            }`}
          >
            <div className={styles.heroText}>
              {/* Letters are decorative once split — the label carries the
                  text. */}
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
                      {char === ' ' ? ' ' : char}
                    </span>
                  ))}
                </span>
              </span>
              <HeroTitle start={heroReady} />
              <p className={styles.subtitle}>
                Оригінальні картини — кожна в єдиному екземплярі.
              </p>
            </div>

            {/* Outside .heroText deliberately: these are the way off this
                screen, so they hold their size and place for the whole
                sequence rather than rushing the reader along with it. */}
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
        </div>
      </section>

      {/* Everything past the track. It starts where the track ends, so the
          first of it only reaches the screen once the sequence has played
          all the way through. */}
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

      </div>

      {/* The corridor: the featured works hung along a walk the reader
          takes, and the invitation waiting at the end of it. This is where
          the featured paintings live now — the strip that used to show them
          further up the page is gone. */}
      <CorridorSection paintings={featured.slice(0, FEATURED_LIMIT)} />
    </div>
  );
}
