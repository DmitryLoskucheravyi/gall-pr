import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { Link } from 'react-router-dom';

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
import Skeleton from '../components/ui/Skeleton';
import Reveal from '../components/ui/Reveal';
import styles from './HomePage.module.scss';

const MARQUEE_QUOTE = 'Мистецтво - це лінія навколо твоїх думок';
const MARQUEE_AUTHOR = 'Густав Клімт';

// Which shard each hero band is cut into — see the clip-paths in
// HomePage.module.scss. Top to bottom.
const HERO_BAND_SHAPES = [
  styles.heroBandTop,
  styles.heroBandMiddle,
  styles.heroBandBottom,
];

// The four corners the hero's Ken Burns tour visits, in %-of-image-box units
// (see --pan-x*/--pan-y* in HomePage.module.scss). Listed around the
// perimeter, so neighbours in this list are always edge-adjacent.
const HERO_CORNERS: Array<[string, string]> = [
  ['-9%', '-9%'],
  ['9%', '-9%'],
  ['9%', '9%'],
  ['-9%', '9%'],
];

// A fresh tour each pan cycle: random starting corner, random direction —
// eight variants, so it never reads as a scripted top-left-then-clockwise
// sweep. It walks the perimeter rather than shuffling freely, because the
// keyframes give every hop the same slice of the timeline: a free shuffle
// would sometimes pair diagonally opposite corners, and that hop covers 41%
// more ground in the same time, lurching across the painting.
function tourCorners(): Array<[string, string]> {
  const start = Math.floor(Math.random() * HERO_CORNERS.length);
  const step = Math.random() < 0.5 ? 1 : HERO_CORNERS.length - 1;
  return HERO_CORNERS.map(
    (_, i) => HERO_CORNERS[(start + i * step) % HERO_CORNERS.length],
  );
}

// The hero headline, as lines of parts — the mobile hero stacks and staggers
// the lines (see .titleLine), desktop flows them back inline as one sentence.
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
    const picked: boolean =
      !previousPicked && Math.random() < SCRAMBLE_DENSITY;
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

  // Memoized so heroBgSlides keeps a stable identity between renders — the
  // slot-machine effect below depends on it, and react-query's structural
  // sharing means a refetch of unchanged data won't restart the animation.
  const paintings = useMemo(
    () => paintingsResponse?.data ?? [],
    [paintingsResponse],
  );
  const featured = useMemo(
    () => paintings.filter((p) => p.isFeatured),
    [paintings],
  );
  // Desktop collage has exactly 3 fixed card slots (heroCardA/B/C) — keep
  // this at 3. The mobile/tablet background rhythm below uses every featured
  // painting instead, uncapped.
  const heroArt = (featured.length >= 3 ? featured : paintings).slice(0, 3);
  const heroBgSlides = useMemo(
    () => (featured.length > 0 ? featured : paintings),
    [featured, paintings],
  );
  const totalWorks = paintingsResponse?.total ?? 0;

  const giveaway =
    (giveaways ?? [])
      .filter((item) => item.isActive)
      .sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      )[0] ?? null;

  const latestNews = news?.[0] ?? null;

  // Mobile/tablet-only "slot machine" behind the hero (desktop keeps the
  // layered card collage instead — see .heroBg's display:none above
  // $breakpoint-lg). Three horizontal bands, each showing a third of a
  // painting (top/middle/bottom). Bands spin through random decoys one at a
  // time, top to bottom, each guaranteed to settle on the same target
  // painting's matching third — so the three always reassemble into one
  // complete picture. The target never appears mid-spin (that would spoil
  // the reveal) and no band repeats a decoy on consecutive beats. Once
  // assembled, pans/zooms across it for a couple of seconds (see
  // .heroBandImagePanning), then reshuffles and repeats.
  const [bandImages, setBandImages] = useState<[number, number, number]>([
    0, 0, 0,
  ]);
  const [assembled, setAssembled] = useState(false);
  const [panCorners, setPanCorners] = useState(HERO_CORNERS);
  // Gates the hero copy's entrance: nothing animates until the first
  // painting is actually on screen (see .heroTextWaiting).
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    if (heroBgSlides.length === 0) {
      // No painting to wait for — once the request has settled, release the
      // copy rather than leaving the hero blank forever.
      if (!loading) setHeroReady(true);
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reducedMotion) {
      setBandImages([0, 0, 0]);
      setAssembled(true);
      setHeroReady(true);
      return;
    }

    let cancelled = false;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    const randomIndex = () => Math.floor(Math.random() * heroBgSlides.length);

    const setBand = (band: 0 | 1 | 2, index: number) => {
      setBandImages((prev) => {
        const next: [number, number, number] = [...prev];
        next[band] = index;
        return next;
      });
    };

    // Pause is as long as the Ken Burns pan needs to read as smooth (see
    // $hero-pan-duration in HomePage.module.scss — keep both in sync) rather
    // than a fixed short beat like the spin.
    const PAN_DURATION_MS = 12000;

    // Fetch+decode a slide before any band settles on it — an <img> whose
    // src changes to a not-yet-decoded image keeps showing its previous
    // frame, so without this a band (the bottom one has the least lead time)
    // can sit on its last decoy through the whole pan. Capped so a broken
    // image degrades to that old lag rather than stalling the loop.
    const preloadSlide = (index: number) =>
      Promise.race([
        (async () => {
          try {
            const img = new Image();
            img.src = heroBgSlides[index].cardImage;
            await img.decode();
          } catch {
            // Undecodable — carry on and show it anyway.
          }
        })(),
        sleep(5000),
      ]);

    const run = async () => {
      // Local mirror of what each band currently shows — the spin needs it
      // to avoid repeating a decoy on consecutive beats, and state isn't
      // readable from inside this loop.
      const shown: [number, number, number] = [0, 0, 0];

      // Intro: the first painting arrives already whole across all three
      // bands, so the hero opens on a Ken Burns tour of it while the kicker
      // and headline animate in. The slot machine only takes over afterwards
      // — and starts from this painting, so its first reveal lands on a
      // different one.
      let target = 0;
      await preloadSlide(0);
      if (cancelled) return;
      // The photo is decoded and about to paint — let the copy animate in
      // alongside the opening pan.
      setHeroReady(true);
      setPanCorners(tourCorners());
      setAssembled(true);
      await sleep(PAN_DURATION_MS);

      while (!cancelled) {
        setAssembled(false);

        // Fresh painting every cycle (when there's more than one to pick).
        const previous = target;
        do {
          target = randomIndex();
        } while (heroBgSlides.length > 1 && target === previous);

        // Start the fetch now so it overlaps the spin below.
        const targetReady = preloadSlide(target);

        for (const band of [0, 1, 2] as const) {
          const beats = 6 + Math.floor(Math.random() * 4); // 6-9 decoys
          for (let i = 0; i < beats; i++) {
            if (cancelled) return;
            // Never flash the target mid-spin, never hold the same decoy two
            // beats in a row. With ≤2 paintings there's no room for both
            // rules — fall back to whatever single alternative exists.
            let decoy = randomIndex();
            if (heroBgSlides.length > 2) {
              while (decoy === target || decoy === shown[band]) {
                decoy = randomIndex();
              }
            } else if (heroBgSlides.length === 2) {
              decoy = target === 0 ? 1 : 0;
            }
            shown[band] = decoy;
            setBand(band, decoy);
            await sleep(140);
          }
          if (cancelled) return;
          await targetReady;
          if (cancelled) return;
          shown[band] = target;
          setBand(band, target);
        }

        if (cancelled) return;
        // Let the freshly assembled picture register as a whole for a beat
        // before the camera starts moving.
        await sleep(700);
        if (cancelled) return;
        setPanCorners(tourCorners());
        setAssembled(true);
        await sleep(PAN_DURATION_MS);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [heroBgSlides, loading]);

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
        {!loading && heroBgSlides.length > 0 && (
          <div
            className={styles.heroBg}
            aria-hidden="true"
            style={
              {
                '--pan-x1': panCorners[0][0],
                '--pan-y1': panCorners[0][1],
                '--pan-x2': panCorners[1][0],
                '--pan-y2': panCorners[1][1],
                '--pan-x3': panCorners[2][0],
                '--pan-y3': panCorners[2][1],
                '--pan-x4': panCorners[3][0],
                '--pan-y4': panCorners[3][1],
              } as CSSProperties
            }
          >
            {([0, 1, 2] as const).map((band) => {
              const painting = heroBgSlides[bandImages[band]];
              if (!painting) return null;

              return (
                <div
                  key={band}
                  className={`${styles.heroBand} ${HERO_BAND_SHAPES[band]}`}
                >
                  <img
                    src={painting.cardImage}
                    alt=""
                    className={
                      assembled
                        ? `${styles.heroBandImage} ${styles.heroBandImagePanning}`
                        : styles.heroBandImage
                    }
                  />
                </div>
              );
            })}
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

          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt className={styles.statValue}>{loading ? '—' : totalWorks}</dt>
              <dd className={styles.statLabel}>робіт у каталозі</dd>
            </div>
            <div className={styles.stat}>
              <dt className={styles.statValue}>100%</dt>
              <dd className={styles.statLabel}>ручна робота</dd>
            </div>
            <div className={styles.stat}>
              <dt className={styles.statValue}>1/1</dt>
              <dd className={styles.statLabel}>єдиний екземпляр</dd>
            </div>
          </dl>
        </div>

        <div className={styles.heroArt}>
          {loading
            ? [styles.heroCardA, styles.heroCardB, styles.heroCardC].map(
                (cls) => (
                  <div key={cls} className={`${styles.heroCard} ${cls}`}>
                    <Skeleton className={styles.heroSkeleton} />
                  </div>
                ),
              )
            : heroArt.map((painting, index) => (
                <Link
                  key={painting.id}
                  to={`/painting/${painting.id}`}
                  className={`${styles.heroCard} ${
                    [styles.heroCardA, styles.heroCardB, styles.heroCardC][
                      index
                    ]
                  }`}
                >
                  <img
                    src={painting.cardImage}
                    alt={painting.title}
                    className={styles.heroImage}
                  />
                  <span className={styles.heroCaption}>{painting.title}</span>
                </Link>
              ))}
        </div>
      </section>

      {/* Opaque wrapper that slides up over the fixed mobile/tablet hero
          backdrop as the page scrolls — see .heroBg's position:fixed. */}
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
            <FeaturedStack paintings={featured} />
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
