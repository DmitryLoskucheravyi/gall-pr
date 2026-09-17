import { Fragment, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { LocalizedLink as Link } from './ui/LocalizedLink';
import type { Painting } from '../types/painting.types';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { useNarrowViewport } from '../hooks/useNarrowViewport';
import { useHeroSequence } from '../hooks/useHeroSequence';
import { useLocale } from '../hooks/useLocale';
import { cdnImage } from '../utils/imageUrl';
import { pickLocale } from '../utils/localizedField';
import styles from './CorridorSection.module.scss';

const CORRIDOR_FOOTAGE = {
  scrub: '/corridor.mp4',
  frames: { base: '/frames/corridor', count: 64 },
};

// Progress past which the closing invitation is readable and may be clicked.
const CTA_ARRIVED = 0.88;

// How long the walk is, in screens of scrolling, and how fast the corridor
// moves while you take it.
//
// SCREENS_PER_LOOP is the corridor's speed and the one to leave alone — how
// much scrolling buys one pass of the four-second clip. The other two set the
// pace of the paintings, and the loop count is derived from them rather than
// chosen, so the walls keep moving at the same rate however slow the works
// themselves are made.
const SCREENS_PER_WORK = 2.2;
const SCREENS_PER_WORK_TOUCH = 1.6;
const SCREENS_LEAD = 4.5;
const SCREENS_PER_LOOP = 2.05;

// Where along the track the works are hung, as a fraction of it: from
// BAND_START, over BAND_SPAN. The rest is the run-up at one end and the
// invitation and closing at the other, and it has to stay clear of them.
//
// Fixed marks rather than dividing the track by the number of works. The two
// sound equivalent and are not: dividing pushed the last work further back
// the more there were, until at ten it was dissolving inside the closing
// black.
const BAND_START = 0.1;
const BAND_SPAN = 0.64;

// How far apart the works hang in the scene, in px of depth, and how close
// one comes before it stops — the latter as a fraction of that gap, so the
// distance it settles at is the same however many works there are.
//
// The gap was 2400 and that was the whole reason the foreshortening could
// not be seen. A work finishes resolving 0.9 of a gap out, so at 2400 it
// became sharp at 2160px of depth: rendered at a quarter size, with its near
// and far edges differing by 11%. By the time it was close enough to read it
// had already turned square to the reader. The angled phase was happening
// where nobody could see it.
//
// At 900 the same moment lands at 810px — nearly half size, and a 23%
// difference between the edges. The hold moves with it: it is a fraction of
// the gap, so keeping the work at the same closeness means a larger
// fraction of a smaller gap.
const WORK_GAP = 900;
const HOLD_SPANS = 0.26;
const HOLD_SPANS_TOUCH = 0.13;

// A glance, not a paragraph. At fifteen works each is held in focus for
// roughly a second of scrolling, and nobody reads 130 characters in a
// second — it was there to be skipped. Shorter is the honest length for the
// time it actually gets; the full description is on the painting's own page.
const EXCERPT_MAX = 65;

// Every work hangs at this height and takes whatever width its own
// proportions ask for, so a panorama stays a panorama and the row of them
// still reads as one hanging.
//
// Large on purpose. How strongly a canvas foreshortens depends on how much
// depth it occupies against the distance it is seen from, so a small one on
// a wall is geometrically correct and visually flat — its near and far edges
// differ by a few percent and the eye reads a rectangle.
const BOX_HEIGHT = 400;

// And never wider than this, whatever its proportions.
//
// Height alone is the rule that makes a row of works read as one hanging,
// but a panorama taken at that height comes out 800px across — half again
// the width of a phone even after the whole box is scaled down for one. Past
// this the work gives up some height to keep its shape and stay on screen,
// which is the lesser loss of the two.
const MAX_BOX_WIDTH = 520;

// The box a work is built as, in px.
//
// Given in real numbers rather than left to aspect-ratio because the four
// stretcher edges are placed with translateZ(width/2) and translateZ
// (height/2) — the same construction Painting3DViewer uses — and a face
// cannot hinge off a measurement the stylesheet does not have.
//
// The proportions come from the canvas measurements the admin entered rather
// than from the photograph: those are the numbers that say what the painting
// actually is.
function boxSize(painting: Painting): { w: number; h: number } {
  const { width, height } = painting;
  const ratio =
    width != null && height != null && width > 0 && height > 0
      ? width / height
      : 0.8;

  let w = BOX_HEIGHT * ratio;
  let h = BOX_HEIGHT;
  if (w > MAX_BOX_WIDTH) {
    // Both, so the canvas keeps its proportions — scaling one alone would
    // squash the painting.
    h *= MAX_BOX_WIDTH / w;
    w = MAX_BOX_WIDTH;
  }

  return { w: Math.round(w), h: Math.round(h) };
}

function excerpt(description: string): string {
  const text = description.trim().replace(/\s+/g, ' ');
  if (text.length <= EXCERPT_MAX) return text;

  // Cut at the last word boundary before the limit rather than mid-word.
  const cut = text.slice(0, EXCERPT_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

type Props = {
  paintings: Painting[];
};

// A run of a title, and whether it is the part carrying the accent. A work's
// own title is one plain run; the closing's is three, so one phrase in the
// middle of it can be set in the italic without breaking the count that
// paces the letters.
type Run = { text: string; accent?: boolean };

// Splits a title into per-letter spans so each can arrive in its turn.
//
// Words stay whole and the spaces between them stay real spaces, so a long
// title still wraps where a line should. Letters inside a word are
// inline-block — needed to move them — which is why the split happens at the
// word boundary: a row of inline-blocks has no spaces left to break at.
//
// The counter runs across the runs rather than restarting inside each, so
// the stagger reads as one hand writing one sentence.
//
// The glyphs are decorative; the heading carries the real title on its
// aria-label, so nothing is read out letter by letter.
function Letters({ runs }: { runs: Run[] }) {
  let letter = 0;

  return (
    <span aria-hidden="true">
      {runs.map((run, runIndex) => {
        const words = run.text.split(' ').map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 && ' '}
            <span className={styles.word}>
              {[...word].map((char, charIndex) => (
                <span
                  key={charIndex}
                  className={styles.letter}
                  style={{ ['--l' as string]: letter++ }}
                >
                  {char}
                </span>
              ))}
            </span>
          </Fragment>
        ));

        return (
          <Fragment key={runIndex}>
            {runIndex > 0 && ' '}
            {run.accent ? <em>{words}</em> : words}
          </Fragment>
        );
      })}
    </span>
  );
}

// The works, hung along a corridor the reader walks down.
//
// The footage is only the corridor: bare walls, a floor and light, cut to
// loop. Every painting on those walls is a real one, placed by this
// component into a CSS 3D scene laid over the video and carried toward the
// reader by the same scroll that drives the footage. Nothing here is
// generated, and the admin's choice of featured works is what the walk is
// made of.
//
// That the paintings are ours rather than the film's is also why the
// corridor had to be generated bare: anything on those walls with a rhythm
// to it — a row of doorways, a panelled dado — would be a ruler against
// which the two could be seen not to agree.
export default function CorridorSection({ paintings }: Props) {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const coarsePointer = useCoarsePointer();

  // Two different questions, and they were being answered by one test.
  //
  // Whether the footage can be scrubbed at all is about the device: a touch
  // browser will not render a seek, so it gets drawn frames instead. How long
  // the walk is and how close a work comes are about the room available, and
  // the stylesheet decides those on width. Asking the pointer for both meant
  // a tablet held sideways got a phone pace under desktop layout.
  const narrow = useNarrowViewport();

  // A shorter walk per work where the screen is small, since scrolling there
  // is a thumb flick at a time.
  const perWork = narrow ? SCREENS_PER_WORK_TOUCH : SCREENS_PER_WORK;
  const screens = paintings.length * perWork + SCREENS_LEAD;
  // Derived, not chosen — see the constants above.
  const loops = Math.max(2, Math.round(screens / SCREENS_PER_LOOP));

  // The gap between neighbouring works, as a fraction of the track. Every
  // beat of a work's arrival is written in multiples of this rather than in
  // fractions of the whole track, which is what keeps the choreography
  // correct at any number of works: with fifteen of them the old fixed
  // windows were wider than the gap itself, and two would have stood in
  // focus at once.
  //
  // Its reciprocal goes down as well, so the stylesheet only ever multiplies
  // — dividing by a custom property is the kind of thing that works until it
  // meets a browser where it doesn't.
  // The +0.12 is the tail of the last work, in spans (see --leave in the
  // stylesheet: it is spent by +0.62 of a span past its mark). Dividing the
  // band by the count alone put that tail past the band with few works —
  // with a single one it landed on top of the invitation. Dividing by the
  // count plus the tail makes the band end exactly where it should, whatever
  // the count.
  const span = BAND_SPAN / (Math.max(1, paintings.length) + 0.12);

  // `mode` is the hook's own call on whether this browser can scrub a video
  // at all, and it can change after mount — see canScrubVideo there.
  const { trackRef, stickyRef, videoRef, canvasRef, mode } = useHeroSequence({
    noPointer: coarsePointer,
    pastAt: CTA_ARRIVED,
    sources: CORRIDOR_FOOTAGE,
    loops,
  });

  return (
    <>
    <section
      className={styles.track}
      ref={trackRef}
      // Both numbers the stylesheet needs: how many works to space along the
      // walk, and how many screens tall the walk is. The second is computed
      // here rather than in CSS so it and the loop count cannot drift.
      style={
        {
          '--count': paintings.length,
          '--screens': screens,
          '--band-start': BAND_START,
          '--span': span,
          '--inv-span': 1 / span,
          '--gap': `${WORK_GAP}px`,
          '--hold-spans': narrow ? HOLD_SPANS_TOUCH : HOLD_SPANS,
        } as CSSProperties
      }
    >
      <div className={styles.stage} ref={stickyRef}>
        {mode === 'frames' ? (
          <canvas
            className={styles.corridor}
            ref={canvasRef}
            style={{ backgroundImage: 'url(/corridor.jpg)' }}
          />
        ) : (
          <video
            className={styles.corridor}
            ref={videoRef}
            poster="/corridor.jpg"
            muted
            playsInline
            preload="auto"
          />
        )}

        {/* The olive cast. A wash of the project's own moss laid over the
            footage in multiply, which darkens and tints in one pass — the
            corridor was generated in a greener sage than the site uses, and
            this is what brings it home. */}
        <div className={styles.tint} aria-hidden="true" />

        {/* Shade gathering at the vanishing point, so the corridor falls
            away into the distance rather than staying evenly lit to the
            horizon. It also darkens the doorway the footage was generated
            with, which no amount of prompting would remove. */}
        <div className={styles.haze} aria-hidden="true" />

        {/* The works themselves, in a perspective of their own laid over the
            footage. Each sits at its own depth and the whole scene advances,
            so the browser's own projection does the approach — nothing here
            animates a size or a position by hand. */}
        <div className={styles.scene} aria-hidden="true">
          {paintings.map((painting, index) => {
            const box = boxSize(painting);
            const src = cdnImage(painting.cardImage, 900);

            return (
              <div
                key={painting.id}
                className={styles.work}
                style={
                  {
                    '--i': index,
                    // Alternating walls. -1 is the left wall, +1 the right.
                    '--side': index % 2 === 0 ? -1 : 1,
                    '--w': `${box.w}px`,
                    '--h': `${box.h}px`,
                    // The edges wrap a blurred sliver of the painting itself,
                    // the way paint folds over a real stretcher.
                    '--img': `url(${src})`,
                  } as CSSProperties
                }
              >
                {/* A stretched canvas, built as a box the same way the
                    viewer on the painting's own page builds one: a face
                    standing half the stretcher's depth proud, and four
                    edges hinged around it. At this angle on the wall the
                    edge is most of what you see, and it is the whole
                    difference between an object and a decal. */}
                {/* The idle sway, on a layer of its own: the box above is
                    already spending its transform on the walk, and an
                    animation on the same property would replace it rather
                    than add to it. */}
                <span className={styles.float}>
                  <span className={styles.face}>
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={styles.canvas}
                    />
                  </span>
                  <span className={`${styles.edge} ${styles.edgeLeft}`} />
                  <span className={`${styles.edge} ${styles.edgeRight}`} />
                  <span className={`${styles.edge} ${styles.edgeTop}`} />
                  <span className={`${styles.edge} ${styles.edgeBottom}`} />
                </span>
              </div>
            );
          })}
        </div>

        {/* The captions are not in the corridor — they are on the glass in
            front of it. Laid out in screen space rather than hung in the
            scene, because text at a wall's angle and distance would be
            unreadable exactly when it mattered. */}
        {paintings.map((painting, index) => {
          const title = pickLocale(painting, 'title', locale);
          const description = pickLocale(painting, 'description', locale);

          return (
            <div
              key={painting.id}
              className={styles.caption}
              style={
                {
                  '--i': index,
                  '--side': index % 2 === 0 ? -1 : 1,
                  // How many letters the stagger has to fit inside, so a long
                  // title still finishes assembling.
                  '--n': title.replace(/\s/g, '').length,
                } as CSSProperties
              }
            >
              <h3 className={styles.title} aria-label={title}>
                <Letters runs={[{ text: title }]} />
              </h3>
              {description ? (
                <p className={styles.excerpt}>{excerpt(description)}</p>
              ) : null}
            </div>
          );
        })}

        {/* Closes over everything. Black by the end of the track, which is
            also the last thing on screen before the pin releases — so the
            page below comes up out of it rather than cutting in. */}
        <div className={styles.veil} aria-hidden="true" />

        {/* The end of the walk: one invitation, nothing else drawn around
            it. Bare type and a hairline, the vocabulary the hero's own links
            use — no button chrome. The rule draws itself out of the label,
            and the arrowhead rides its end. Only the head: the line is the
            shaft. */}
        <div className={styles.cta}>
          <Link to="/catalog" className={styles.ctaButton}>
            <span className={styles.ctaLabel}>{t('corridor.cta')}</span>
            <span className={styles.ctaRule} aria-hidden="true" />
            <svg
              className={styles.ctaArrow}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>

    {/* The handover. The stage above ends black and this begins black, so
        the seam between them is invisible; by its foot it has resolved into
        the page's own colour and the footer simply follows. Without it the
        pin would release straight from black onto porcelain. */}
    <div className={styles.tail} aria-hidden="true" />
    </>
  );
}
