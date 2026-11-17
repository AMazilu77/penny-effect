"use client";
// Horizontal range bars in plain SVG: one row per estimate, a bar from the
// low to the high end of the range, dots at both ends, and the range printed
// under each name. Used for GiveWell's cost-to-save-a-life estimates, which are
// ranges, never single numbers. Every value is also in the table under it.
import { useState } from "react";
import { dollars, niceTicks } from "@/lib/impact";
import { useWidth } from "./useWidth";

export type Range = {
  label: string;
  low: number;
  high: number;
  /** An optional single estimate (e.g. an average), drawn as an open circle. */
  mark?: number;
};

const BAR = "var(--primary)";
const GRID = "#dfe5e0";
const INK = "var(--text-muted)";
const ROW = 76;
const M = { top: 8, right: 16, bottom: 28, left: 16 };

export function RangeChart({ rows, label }: { rows: Range[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const ticks = niceTicks(Math.max(...rows.map((r) => r.high)));
  const max = ticks[ticks.length - 1];
  const height = M.top + rows.length * ROW + M.bottom;
  const plotW = width - M.left - M.right;
  const x = (v: number) => M.left + (v / max) * plotW;

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} role="group" aria-label={label} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={M.top} y2={height - M.bottom} stroke={GRID} strokeWidth={1} />
            <text x={x(t)} y={height - 8} textAnchor={t === 0 ? "start" : t === max ? "end" : "middle"} fontSize={12} fill={INK} style={{ fontVariantNumeric: "tabular-nums" }}>
              {t === 0 ? "$0" : `$${t / 1000}K`}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const top = M.top + i * ROW;
          const barY = top + 56;
          const range = `${dollars(r.low)} to ${dollars(r.high)}${r.mark !== undefined ? `; average ${dollars(r.mark)}` : ""}`;
          const active = hover === i;
          return (
            <g
              key={r.label}
              tabIndex={0}
              role="img"
              aria-label={`${r.label}: ${range}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              {/* A transparent hit area the full height of the row. */}
              <rect x={0} y={top} width={width} height={ROW} fill="transparent" />
              <text x={M.left} y={top + 16} fontSize={14} fontWeight={600} fill="var(--text)">
                {r.label}
              </text>
              {/* The range sits on its own line under the name, so long names never collide with it. */}
              <text x={M.left} y={top + 35} fontSize={14} fill={active ? "var(--text-heading)" : INK} fontWeight={active ? 700 : 400}>
                {range}
              </text>
              <line x1={x(r.low)} x2={x(r.high)} y1={barY} y2={barY} stroke={BAR} strokeWidth={active ? 10 : 8} strokeLinecap="round" opacity={active ? 1 : 0.85} />
              <circle cx={x(r.low)} cy={barY} r={6} fill={BAR} stroke="#fff" strokeWidth={2} />
              <circle cx={x(r.high)} cy={barY} r={6} fill={BAR} stroke="#fff" strokeWidth={2} />
              {r.mark !== undefined && <circle cx={x(r.mark)} cy={barY} r={7} fill="#fff" stroke="var(--text-heading)" strokeWidth={2.5} />}
              {active && <rect x={1} y={top + 1} width={width - 2} height={ROW - 2} rx={8} fill="none" stroke="var(--focus)" strokeWidth={2} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
