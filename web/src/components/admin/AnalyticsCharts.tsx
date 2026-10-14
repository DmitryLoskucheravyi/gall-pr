'use client';

import { useId, useMemo, useRef, useState, type PointerEvent } from 'react';

import styles from './AnalyticsCharts.module.scss';

// The admin dashboard's charts, drawn by hand in SVG rather than through a
// charting library: there are three kinds, each a few dozen lines, and they
// are meant to look like the rest of the site — hairlines, ink colours from
// the theme, nothing glossy. Colours come from CSS custom properties, so the
// light and dark themes need nothing here.

export type TrendPoint = {
  key: string;
  /** Shown under the axis and in the tooltip. */
  label: string;
  /** The line: money. */
  line: number;
  /** The bars: a count. */
  bars: number;
};

type TrendProps = {
  points: TrendPoint[];
  lineLabel: string;
  barsLabel: string;
  formatLine: (n: number) => string;
  formatBars: (n: number) => string;
};

const W = 720;
const H = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

// A line for revenue over bars for orders, on the same time axis, each scaled
// to its own height — they are different units, and putting them on one scale
// would flatten whichever is smaller into the floor.
export function TrendChart({ points, lineLabel, barsLabel, formatLine, formatBars }: TrendProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const geometry = useMemo(() => {
    const n = points.length;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const step = n > 1 ? innerW / n : innerW;
    const maxLine = Math.max(1, ...points.map((p) => p.line));
    const maxBars = Math.max(1, ...points.map((p) => p.bars));

    const x = (i: number) => PAD.left + step * i + step / 2;
    const yLine = (v: number) => PAD.top + innerH - (v / maxLine) * innerH;
    const barH = (v: number) => (v / maxBars) * innerH * 0.55;

    // A smoothed line: each segment a cubic whose handles sit a third of the
    // way along, horizontally — curves that never overshoot below zero.
    let d = '';
    points.forEach((p, i) => {
      const px = x(i);
      const py = yLine(p.line);
      if (i === 0) {
        d = `M${px},${py}`;
      } else {
        const qx = x(i - 1);
        const qy = yLine(points[i - 1].line);
        const c = (px - qx) / 3;
        d += ` C${qx + c},${qy} ${px - c},${py} ${px},${py}`;
      }
    });
    const area = n
      ? `${d} L${x(n - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`
      : '';

    // At most ~8 labels along the axis, evenly picked.
    const every = Math.max(1, Math.ceil(n / 8));
    // The last point always gets its label, unless the regular one before it
    // is too close — then the two would print over each other.
    const lastRegular = Math.floor((n - 1) / every) * every;
    const ticks = points
      .map((p, i) => ({ i, label: p.label }))
      .filter(
        ({ i }) =>
          i % every === 0 || (i === n - 1 && n - 1 - lastRegular >= every / 2),
      );

    return { step, x, yLine, barH, d, area, ticks, baseline: PAD.top + innerH, maxLine };
  }, [points]);

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.floor((sx - PAD.left) / geometry.step);
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  const active = hover !== null ? points[hover] : null;

  return (
    <div className={styles.trend}>
      <div className={styles.legend}>
        <span className={styles.legendLine}>{lineLabel}</span>
        <span className={styles.legendBars}>{barsLabel}</span>
      </div>

      <div className={styles.trendFrame}>
        <svg
          ref={svgRef}
          className={styles.trendSvg}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${lineLabel}, ${barsLabel}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              className={styles.grid}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top + (H - PAD.top - PAD.bottom) * f}
              y2={PAD.top + (H - PAD.top - PAD.bottom) * f}
            />
          ))}
          <line
            className={styles.axis}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={geometry.baseline}
            y2={geometry.baseline}
          />

          {points.map((p, i) => {
            const h = geometry.barH(p.bars);
            const w = Math.max(1.5, geometry.step * 0.42);
            return (
              <rect
                key={p.key}
                className={styles.bar}
                data-active={hover === i || undefined}
                x={geometry.x(i) - w / 2}
                y={geometry.baseline - h}
                width={w}
                height={h}
                rx={Math.min(2, w / 2)}
              />
            );
          })}

          <path className={styles.area} d={geometry.area} fill={`url(#${gradientId})`} />
          <path className={styles.line} d={geometry.d} pathLength={1} />

          {active && hover !== null ? (
            <g>
              <line
                className={styles.cursor}
                x1={geometry.x(hover)}
                x2={geometry.x(hover)}
                y1={PAD.top}
                y2={geometry.baseline}
              />
              <circle
                className={styles.dot}
                cx={geometry.x(hover)}
                cy={geometry.yLine(active.line)}
                r={4}
              />
            </g>
          ) : null}
        </svg>

        {active && hover !== null ? (
          <div
            className={styles.tooltip}
            style={{
              left: `${(geometry.x(hover) / W) * 100}%`,
            }}
            data-side={hover > points.length / 2 ? 'left' : 'right'}
          >
            <span className={styles.tooltipLabel}>{active.label}</span>
            <span>
              {lineLabel}: <strong>{formatLine(active.line)}</strong>
            </span>
            <span>
              {barsLabel}: <strong>{formatBars(active.bars)}</strong>
            </span>
          </div>
        ) : null}
      </div>

      <div className={styles.ticks}>
        {geometry.ticks.map(({ i, label }) => (
          <span key={i} style={{ left: `${(geometry.x(i) / W) * 100}%` }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// A tiny line with no axes, for a KPI card: the shape of the period, not its
// numbers.
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = w / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`)
    .join(' ');

  return (
    <svg className={styles.spark} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} pathLength={1} />
    </svg>
  );
}

type BreakdownRow = { key: string; label: string; value: number; note?: string };

// Horizontal bars, longest first, each with its share of the whole.
export function Breakdown({ rows, format }: { rows: BreakdownRow[]; format?: (n: number) => string }) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className={styles.breakdown}>
      {rows.map((row) => (
        <li key={row.key} className={styles.breakdownRow}>
          <div className={styles.breakdownHead}>
            <span>{row.label}</span>
            <span className={styles.breakdownValue}>
              {format ? format(row.value) : row.value}
              {total > 0 ? (
                <em>{Math.round((row.value / total) * 100)}%</em>
              ) : null}
            </span>
          </div>
          <span className={styles.track}>
            <span className={styles.fill} style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          {row.note ? <span className={styles.breakdownNote}>{row.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}
