import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { useHeroSequence } from '../hooks/useHeroSequence';
import { usePaintings } from '../hooks/queries/usePaintings';
import { useGiveaways } from '../hooks/queries/useGiveaways';
import { useNews } from '../hooks/queries/useNews';
import FeaturedStack, {
  FeaturedStackSkeleton,
} from '../components/FeaturedStack';
import GiveawayHighlight, {
  GiveawayHighlightSkeleton,
} from '../components/GiveawayHighlight';
import NewsBanner, { NewsBannerSkeleton } from '../components/NewsBanner';
import Reveal from '../components/ui/Reveal';
import styles from './HomePage.module.scss';

const MARQUEE_QUOTE = 'Мистецтво - це лінія навколо твоїх думок';
const MARQUEE_AUTHOR = 'Густав Клімт';

// The featured strip is a fanned stack, not a grid, so it needs a ceiling.
// The flag itself is free for the admin to set on as many works as they
// like; this is the display cap.
const FEATURED_LIMIT = 10;

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

  // A touch screen has no hovering pointer to follow, so the sequence there
  // is driven by scroll alone rather than sitting dead.
  const coarsePointer = useCoarsePointer();
  const { trackRef, stickyRef, videoRef } = useHeroSequence({
    noPointer: coarsePointer,
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
                  plays by itself — useHeroSequence walks the playhead in
                  step with the scroll, so the drift across the impasto is
                  something the reader drives rather than watches.
                  Decorative and silent, so there is nothing to caption and
                  no controls to expose. */}
              <video
                className={styles.heroWall}
                ref={videoRef}
                src="/hero-paint.mp4"
                poster="/hero-paint.jpg"
                muted
                playsInline
                // Seeking needs the frames already in hand: on `metadata`
                // the first scroll would stall against the network instead
                // of moving the picture.
                preload="auto"
              />
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
