"use client";
// A single-series line chart in plain SVG (no chart library): one 2px line in
// the primary green with a 10% wash, hairline gridlines, the first and last
// values labelled, and a readout that follows the pointer or the arrow keys.
// Years missing from the data break the line rather than being drawn across.
// Every value is also in the table under the chart (<ChartFigure>).
import { useState } from "react";
import { formatValue, niceTicks, type Point, type ValueFormat } from "@/lib/impact";
import { useWidth } from "./useWidth";

function compactTick(value: number, format: ValueFormat): string {
  if (format === "percent") return `${value}%`;
  if (format === "count" && value >= 1_000_000) return `${value / 1_000_000}M`;
  if (format === "count" && value >= 1000) return `${value / 1000}K`;
  return String(value);
}

const LINE = "var(--primary)";
const GRID = "#dfe5e0"; // one step off the white card: recessive
const INK = "var(--text-muted)";
const HEIGHT = 240;
const M = { top: 28, right: 20, bottom: 28, left: 48 };

/** Runs of consecutive years, so a gap in the data shows as a gap in the line. */
function runs(points: Point[]): Point[][] {
  const out: Point[][] = [];
  for (const p of points) {
    const run = out[out.length - 1];
    if (run && p.year === run[run.length - 1].year + 1) run.push(p);
    else out.push([p]);
  }
  return out;
}

export function LineChart({ points, format, label }: { points: Point[]; format: ValueFormat; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState(points.length - 1);

  const x0 = points[0].year;
  const x1 = points[points.length - 1].year;
  const ticks = niceTicks(Math.max(...points.map((p) => p.value)));
  const yMax = ticks[ticks.length - 1];
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const x = (year: number) => M.left + ((year - x0) / (x1 - x0)) * plotW;
  const y = (value: number) => M.top + plotH - (value / yMax) * plotH;

  const span = x1 - x0;
  const step = width < 420 ? (span > 25 ? 10 : 8) : span > 25 ? 5 : 4;
  const yearTicks = points.map((p) => p.year).filter((yr) => yr === x0 || yr === x1 || (yr % step === 0 && yr - x0 >= step / 2 && x1 - yr >= step / 2));

  const segments = runs(points);
  const path = (run: Point[]) => run.map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = (run: Point[]) => `${path(run)}L${x(run[run.length - 1].year).toFixed(1)},${y(0)}L${x(run[0].year).toFixed(1)},${y(0)}Z`;

  const current = points[active];
  const firstP = points[0];
  const lastP = points[points.length - 1];

  function nearest(clientX: number, rect: DOMRect) {
    const year = x0 + ((clientX - rect.left - M.left) / plotW) * span;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.year - year) < Math.abs(points[best].year - year)) best = i;
    });
    setActive(best);
  }

  return (
    <div ref={ref} className="w-full">
      {/* The readout: value first, then the year. Announced politely when it changes. */}
      <p className="mb-1 text-sm text-muted" aria-live="polite">
        <span className="text-base font-semibold text-heading">{formatValue(current.value, format)}</span> in {current.year}
      </p>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${label}. ${formatValue(firstP.value, format)} in ${firstP.year}, ${formatValue(lastP.value, format)} in ${lastP.year}. Use the left and right arrow keys to read each year.`}
        tabIndex={0}
        className="block touch-pan-y rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)"
        onPointerMove={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
        onKeyDown={(e) => {
          const next =
            e.key === "ArrowLeft" ? active - 1 : e.key === "ArrowRight" ? active + 1 : e.key === "Home" ? 0 : e.key === "End" ? points.length - 1 : null;
          if (next === null) return;
          e.preventDefault();
          setActive(Math.min(points.length - 1, Math.max(0, next)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>
              {compactTick(t, format)}
            </text>
          </g>
        ))}
        {yearTicks.map((yr) => (
          <text key={yr} x={x(yr)} y={HEIGHT - 8} textAnchor={yr === x0 ? "start" : yr === x1 ? "end" : "middle"} fontSize={12} fill={INK}>
            {yr}
          </text>
        ))}

        {segments.map((run) => (
          <g key={run[0].year}>
            <path d={area(run)} fill={LINE} fillOpacity={0.1} />
            <path d={path(run)} fill="none" stroke={LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        ))}

        {/* Direct labels: the first and last values only. */}
        <text x={x(firstP.year)} y={y(firstP.value) - 10} fontSize={12} fontWeight={600} fill="var(--text-heading)">
          {formatValue(firstP.value, format)}
        </text>
        <text x={x(lastP.year)} y={y(lastP.value) - 10} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--text-heading)">
          {formatValue(lastP.value, format)}
        </text>
        <circle cx={x(firstP.year)} cy={y(firstP.value)} r={4} fill={LINE} stroke="#fff" strokeWidth={2} />
        <circle cx={x(lastP.year)} cy={y(lastP.value)} r={4} fill={LINE} stroke="#fff" strokeWidth={2} />

        {/* Crosshair at the active year. */}
        <line x1={x(current.year)} x2={x(current.year)} y1={M.top} y2={y(0)} stroke={INK} strokeWidth={1} />
        <circle cx={x(current.year)} cy={y(current.value)} r={5} fill={LINE} stroke="#fff" strokeWidth={2} />
      </svg>
    </div>
  );
}
