'use client';

import { useEffect, useRef } from 'react';

import styles from './GrowingBranches.module.scss';

// A slow, procedural backdrop: thin branches — or roots, depending on how you
// look at them — that creep in from the edges of the screen, linger, fade and
// make room for the next. Drawn behind the catalogue and the gallery so the
// white space between the works is never quite empty.
//
// Each tree is generated up front as a list of short segments, every one
// stamped with the moment it should appear: a child branch starts from the
// time its parent reached the fork, so the whole thing grows outwards from the
// root the way a plant does rather than sweeping across in one pass. Segments
// are drawn onto the tree's own offscreen canvas as their time comes, never
// redrawn; the visible canvas only composites those layers, which is what lets
// a finished tree fade without being re-stroked.
//
// The strokes are laid down in plain black and tinted at composite time with
// the current --color-text, so switching the theme recolours every tree on
// the next frame instead of leaving dark ink on a dark page.

type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  time: number;
};

type Tree = {
  layer: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  segments: Segment[];
  drawn: number;
  start: number;
  growFor: number;
  holdFor: number;
  fadeFor: number;
};

const STEP = 5; // px per segment
const MAX_SEGMENTS = 2600; // per tree; keeps generation and memory bounded
const GROW_SECONDS: [number, number] = [22, 34];
const HOLD_SECONDS: [number, number] = [14, 22];
const FADE_SECONDS = 8;
const FRAME_MS = 1000 / 30; // the growth is slow; 30fps is plenty
const INK_ALPHA = 0.32;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function generate(width: number, height: number): Segment[] {
  const segments: Segment[] = [];
  const span = Math.max(width, height);

  // Start just outside one of the four edges, heading roughly inwards.
  const edge = Math.floor(Math.random() * 4);
  let x: number;
  let y: number;
  let heading: number;
  if (edge === 0) {
    x = -10;
    y = rand(0.15, 0.85) * height;
    heading = rand(-0.5, 0.5);
  } else if (edge === 1) {
    x = width + 10;
    y = rand(0.15, 0.85) * height;
    heading = Math.PI + rand(-0.5, 0.5);
  } else if (edge === 2) {
    x = rand(0.15, 0.85) * width;
    y = -10;
    heading = Math.PI / 2 + rand(-0.6, 0.6);
  } else {
    x = rand(0.15, 0.85) * width;
    y = height + 10;
    heading = -Math.PI / 2 + rand(-0.6, 0.6);
  }

  // Breadth-first so that, if the budget runs out, it is the last twigs that
  // go missing rather than a whole limb.
  const queue: {
    x: number;
    y: number;
    angle: number;
    length: number;
    width: number;
    depth: number;
    time: number;
  }[] = [
    {
      x,
      y,
      angle: heading,
      length: span * rand(0.45, 0.7),
      width: 1.3,
      depth: 0,
      time: 0,
    },
  ];

  while (queue.length && segments.length < MAX_SEGMENTS) {
    const branch = queue.shift()!;
    const steps = Math.max(2, Math.round(branch.length / STEP));
    const baseAngle = branch.angle;
    // Twigs wander more than the limbs they grow from.
    const wobble = 0.12 + branch.depth * 0.05;
    // Side shoots get sparser towards the tips.
    const shootChance = branch.depth < 4 ? 0.07 - branch.depth * 0.012 : 0;

    let { x, y, angle, time } = branch;

    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      angle += rand(-wobble, wobble);
      // A gentle pull back towards the branch's own heading keeps it from
      // curling into a spiral.
      angle += (baseAngle - angle) * 0.08;

      const nx = x + Math.cos(angle) * STEP;
      const ny = y + Math.sin(angle) * STEP;
      const width = Math.max(0.35, branch.width * (1 - progress * 0.45));

      segments.push({ x1: x, y1: y, x2: nx, y2: ny, width, time });
      x = nx;
      y = ny;
      // Thin growth is slower growth: the tips take their time.
      time += 1 + branch.depth * 0.35;

      if (progress > 0.08 && Math.random() < shootChance) {
        const side = Math.random() < 0.5 ? -1 : 1;
        queue.push({
          x,
          y,
          angle: angle + side * rand(0.35, 0.95),
          length: branch.length * (1 - progress) * rand(0.35, 0.7),
          width: width * 0.7,
          depth: branch.depth + 1,
          time,
        });
      }
    }

    // A fork at the end, unless this is already a twig.
    const nextLength = branch.length * rand(0.4, 0.62);
    if (branch.depth < 6 && nextLength > 10) {
      const forks = Math.random() < 0.3 ? 3 : 2;
      for (let k = 0; k < forks; k++) {
        const spread = (k - (forks - 1) / 2) * rand(0.4, 0.75);
        queue.push({
          x,
          y,
          angle: angle + spread + rand(-0.15, 0.15),
          length: nextLength * rand(0.75, 1.1),
          width: branch.width * 0.62,
          depth: branch.depth + 1,
          time,
        });
      }
    }
  }

  // Normalise the timeline so `time` reads as a fraction of the growth.
  const end = segments.reduce((max, s) => Math.max(max, s.time), 1);
  for (const segment of segments) segment.time /= end;
  segments.sort((a, b) => a.time - b.time);
  return segments;
}

export default function GrowingBranches() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let trees: Tree[] = [];
    let nextSpawn = 0;
    let frame = 0;
    let lastPaint = 0;
    let ink = '#24231e';
    let inkCheckedAt = -Infinity;

    const maxTrees = () => (width < 700 ? 1 : 2);

    const makeTree = (now: number): Tree | null => {
      const layer = document.createElement('canvas');
      layer.width = canvas.width;
      layer.height = canvas.height;
      const layerCtx = layer.getContext('2d');
      if (!layerCtx) return null;
      layerCtx.scale(dpr, dpr);
      layerCtx.lineCap = 'round';
      layerCtx.strokeStyle = '#000';
      // Below 1 so crossings and dense twig clusters read a shade darker.
      layerCtx.globalAlpha = 0.6;

      return {
        layer,
        ctx: layerCtx,
        segments: generate(width, height),
        drawn: 0,
        start: now,
        growFor: rand(...GROW_SECONDS) * 1000,
        holdFor: rand(...HOLD_SECONDS) * 1000,
        fadeFor: FADE_SECONDS * 1000,
      };
    };

    const growTo = (tree: Tree, fraction: number) => {
      const { ctx: layerCtx, segments } = tree;
      while (tree.drawn < segments.length && segments[tree.drawn].time <= fraction) {
        const s = segments[tree.drawn++];
        layerCtx.lineWidth = s.width;
        layerCtx.beginPath();
        layerCtx.moveTo(s.x1, s.y1);
        layerCtx.lineTo(s.x2, s.y2);
        layerCtx.stroke();
      }
    };

    const composite = (now: number) => {
      if (now - inkCheckedAt > 1000) {
        ink =
          getComputedStyle(canvas).getPropertyValue('--color-text').trim() ||
          ink;
        inkCheckedAt = now;
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const tree of trees) {
        const age = now - tree.start;
        const fadeStart = tree.growFor + tree.holdFor;
        const opacity =
          age < fadeStart ? 1 : Math.max(0, 1 - (age - fadeStart) / tree.fadeFor);
        if (opacity <= 0) continue;
        ctx.globalAlpha = opacity;
        ctx.drawImage(tree.layer, 0, 0);
      }

      // Tint everything drawn so far with the theme's ink.
      ctx.globalAlpha = INK_ALPHA;
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - lastPaint < FRAME_MS) return;
      lastPaint = now;

      trees = trees.filter(
        (tree) => now - tree.start < tree.growFor + tree.holdFor + tree.fadeFor,
      );

      if (trees.length < maxTrees() && now >= nextSpawn) {
        const tree = makeTree(now);
        if (tree) trees.push(tree);
        // Stagger them, so one is usually growing while another fades.
        nextSpawn = now + rand(9, 16) * 1000;
      }

      for (const tree of trees) {
        const age = now - tree.start;
        if (age > 0) growTo(tree, Math.min(1, age / tree.growFor));
      }

      composite(now);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Phones resize the viewport every time the address bar slides; a
      // height-only change of that size is not worth throwing the trees away.
      if (
        Math.round(rect.width) === width &&
        Math.abs(Math.round(rect.height) - height) < 140 &&
        trees.length
      ) {
        return;
      }

      width = Math.round(rect.width);
      height = Math.round(rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      trees = [];
      nextSpawn = 0;

      if (reducedMotion) {
        // No growing: lay down finished trees once and leave them be.
        const now = performance.now();
        for (let i = 0; i < maxTrees(); i++) {
          const tree = makeTree(now);
          if (!tree) continue;
          growTo(tree, 1);
          trees.push(tree);
        }
        // Push the fade out of reach.
        for (const tree of trees) tree.holdFor = Infinity;
        composite(now);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reducedMotion) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
