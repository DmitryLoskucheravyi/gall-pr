'use client';

import { useId, useMemo, useRef, useState, type PointerEvent } from 'react';

import styles from './AnalyticsMoreCharts.module.scss';

// The rest of the dashboard's charts — a donut, lines with points, a filled
// running total, columns and an activity grid. Same rules as
// AnalyticsCharts.tsx: hand-drawn SVG, theme colours only (see the palette in
// the stylesheet), every line inked in when it arrives.

// Series colours are slots, not values: the stylesheet maps --tone-0.. to the
// theme's own greens, brass and clay, so the dark theme recolours them all.
const tone = (i: number) => `var(--tone-${i % 6})`;

// ---------- donut ----------

type Slice = { key: string; label: string; value: number; note?: string };

export function Donut({
  slices,
  centerLabel,
  format = (n) => String(n),
}: {
  slices: Slice[];
  centerLabel: string;
  format?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  // A hairline of page between segments, so neighbours read as two.
  const gap = slices.length > 1 ? 1.5 : 0;

  // Each arc starts where the ones before it end.
  const lengths = slices.map((s) => (total ? (s.value / total) * c : 0));
  const arcs = slices.map((s, i) => ({
    ...s,
    i,
    dash: Math.max(0, lengths[i] - gap),
    offset: lengths.slice(0, i).reduce((sum, l) => sum + l, 0),
  }));

  const shown = hover !== null ? slices[hover] : null;

  return (
    <div className={styles.donut}>
      <svg viewBox="0 0 120 120" className={styles.donutSvg} role="img" aria-label={centerLabel}>
        <circle className={styles.donutTrack} cx="60" cy="60" r={r} />
        {arcs.map((a) => (
          <circle
            key={a.key}
            className={styles.donutArc}
            data-dim={hover !== null && hover !== a.i ? true : undefined}
            cx="60"
            cy="60"
            r={r}
            stroke={tone(a.i)}
            strokeDasharray={`${a.dash} ${c}`}
            strokeDashoffset={-a.offset}
            style={{ animationDelay: `${a.i * 0.12}s` }}
            onPointerEnter={() => setHover(a.i)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
        <text x="60" y="57" className={styles.donutValue} textAnchor="middle">
          {shown ? format(shown.value) : format(total)}
        </text>
        <text x="60" y="72" className={styles.donutCaption} textAnchor="middle">
          {shown ? `${total ? Math.round((shown.value / total) * 100) : 0}%` : centerLabel}
        </text>
      </svg>

      <ul className={styles.legend}>
        {slices.map((s, i) => (
          <li
            key={s.key}
            data-dim={hover !== null && hover !== i ? true : undefined}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className={styles.swatch} style={{ background: tone(i) }} />
            <span className={styles.legendLabel}>
              {s.label}
              {s.note ? <em>{s.note}</em> : null}
            </span>
            <span className={styles.legendValue}>{format(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- lines with points ----------

type LineSeries = { key: string; label: string; values: number[] };

const LW = 640;
const LH = 220;
const LP = { top: 14, right: 10, bottom: 8, left: 10 };

// Several series over the same buckets, each its own colour, with a point on
// every bucket while there are few enough to tell apart. `fill` shades under
// the first series — used for the running total, where the area is the point.
export function LineChart({
  series,
  labels,
  fill = false,
  format = (n) => String(n),
}: {
  series: LineSeries[];
  labels: string[];
  fill?: boolean;
  format?: (n: number) => string;
}) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;

  const geo = useMemo(() => {
    const max = Math.max(1, ...series.flatMap((s) => s.values));
    const innerW = LW - LP.left - LP.right;
    const innerH = LH - LP.top - LP.bottom;
    const x = (i: number) => LP.left + (n > 1 ? (innerW * i) / (n - 1) : innerW / 2);
    const y = (v: number) => LP.top + innerH - (v / max) * innerH;
    const path = (values: number[]) =>
      values
        .map((v, i) => {
          if (i === 0) return `M${x(i)},${y(v)}`;
          const c = (x(i) - x(i - 1)) / 3;
          return `C${x(i - 1) + c},${y(values[i - 1])} ${x(i) - c},${y(v)} ${x(i)},${y(v)}`;
        })
        .join(' ');
    return { x, y, path, base: LP.top + innerH };
  }, [series, n]);

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * LW;
    const i = Math.round(((sx - LP.left) / (LW - LP.left - LP.right)) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const dots = n <= 40;

  return (
    <div className={styles.lines}>
      <div className={styles.lineLegend}>
        {series.map((s, i) => (
          <span key={s.key}>
            <i style={{ background: tone(i) }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className={styles.lineFrame}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${LW} ${LH}`}
          preserveAspectRatio="none"
          className={styles.lineSvg}
          role="img"
          aria-label={series.map((s) => s.label).join(', ')}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={tone(0)} stopOpacity="0.28" />
              <stop offset="1" stopColor={tone(0)} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.33, 0.66].map((f) => (
            <line
              key={f}
              className={styles.grid}
              x1={LP.left}
              x2={LW - LP.right}
              y1={LP.top + (geo.base - LP.top) * f}
              y2={LP.top + (geo.base - LP.top) * f}
            />
          ))}
          <line className={styles.axis} x1={LP.left} x2={LW - LP.right} y1={geo.base} y2={geo.base} />

          {fill && series[0] && n > 1 ? (
            <path
              d={`${geo.path(series[0].values)} L${geo.x(n - 1)},${geo.base} L${geo.x(0)},${geo.base} Z`}
              fill={`url(#${gradientId})`}
            />
          ) : null}

          {series.map((s, i) => (
            <path
              key={s.key}
              className={styles.seriesLine}
              d={geo.path(s.values)}
              stroke={tone(i)}
              pathLength={1}
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}

          {hover !== null ? (
            <line className={styles.cursor} x1={geo.x(hover)} x2={geo.x(hover)} y1={LP.top} y2={geo.base} />
          ) : null}
        </svg>

        {/* Points as HTML over the SVG: the SVG is stretched to its box, and
            a circle inside it would be squashed into an ellipse. */}
        {dots
          ? series.map((s, si) =>
              s.values.map((v, i) => (
                <span
                  key={`${s.key}-${i}`}
                  className={styles.point}
                  data-active={hover === i || undefined}
                  style={{
                    left: `${(geo.x(i) / LW) * 100}%`,
                    top: `${(geo.y(v) / LH) * 100}%`,
                    borderColor: tone(si),
                    animationDelay: `${0.6 + i * 0.02}s`,
                  }}
                />
              )),
            )
          : null}

        {hover !== null ? (
          <div
            className={styles.tooltip}
            style={{ left: `${(geo.x(hover) / LW) * 100}%` }}
            data-side={hover > n / 2 ? 'left' : 'right'}
          >
            <span className={styles.tooltipLabel}>{labels[hover]}</span>
            {series.map((s, i) => (
              <span key={s.key}>
                <i style={{ background: tone(i) }} />
                {s.label}: <strong>{format(s.values[hover] ?? 0)}</strong>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.lineTicks}>
        <span>{labels[0]}</span>
        <span>{labels[Math.floor((n - 1) / 2)]}</span>
        <span>{labels[n - 1]}</span>
      </div>
    </div>
  );
}

// ---------- columns ----------

type Column = { key: string; label: string; value: number; note?: string };

// Vertical columns, one per category, the value set above each — the shape
// that compares a handful of named things at a glance.
export function Columns({ columns, format = (n) => String(n) }: { columns: Column[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...columns.map((c) => c.value));

  return (
    <div className={styles.columns} style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}>
      {columns.map((c, i) => (
        <div key={c.key} className={styles.column}>
          <span className={styles.columnValue}>{format(c.value)}</span>
          <span className={styles.columnTrack}>
            <span
              className={styles.columnBar}
              style={{
                height: `${Math.max(2, (c.value / max) * 100)}%`,
                background: tone(i),
                animationDelay: `${i * 0.08}s`,
              }}
            />
          </span>
          <span className={styles.columnLabel} title={c.label}>
            {c.label}
          </span>
          {c.note ? <span className={styles.columnNote}>{c.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

// ---------- activity grid ----------

// Weekday × hour, each cell shaded by how much happened then. Where the dark
// cells cluster is when the shop's visitors are actually about — the hour to
// post, to run a giveaway, to answer support.
export function ActivityGrid({
  grid,
  weekdays,
  cellLabel,
  less,
  more,
}: {
  grid: number[][];
  weekdays: string[];
  cellLabel: (weekday: string, hour: number, count: number) => string;
  less: string;
  more: string;
}) {
  const max = Math.max(1, ...grid.flat());

  return (
    <div className={styles.activity}>
      <div className={styles.activityGrid}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className={styles.hour}>
            {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
          </span>
        ))}

        {grid.map((row, d) => (
          <Row key={d} row={row} weekday={weekdays[d]} max={max} cellLabel={cellLabel} d={d} />
        ))}
      </div>

      <div className={styles.scale}>
        <span>{less}</span>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <i key={f} style={{ opacity: f === 0 ? 1 : undefined, ['--heat' as string]: f }} data-zero={f === 0 || undefined} />
        ))}
        <span>{more}</span>
      </div>
    </div>
  );
}

function Row({
  row,
  weekday,
  max,
  cellLabel,
  d,
}: {
  row: number[];
  weekday: string;
  max: number;
  cellLabel: (weekday: string, hour: number, count: number) => string;
  d: number;
}) {
  return (
    <>
      <span className={styles.weekday}>{weekday}</span>
      {row.map((v, h) => (
        <span
          key={h}
          className={styles.cell}
          data-zero={v === 0 || undefined}
          style={{
            ['--heat' as string]: v / max,
            animationDelay: `${(d * 24 + h) * 4}ms`,
          }}
          title={cellLabel(weekday, h, v)}
        />
      ))}
    </>
  );
}
