import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PredictionPoint } from "../lib/api";
import { colorFor, prettyName } from "../lib/models";

interface PredictionChartProps {
  points: PredictionPoint[];
  models: string[];
  horizon: number;
}

const TIR_LOW = 3.9;
const TIR_HIGH = 10.0;
const MIN_SPAN_MS = 30 * 60 * 1000; // don't zoom tighter than 30 minutes

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function clampDomain(
  [lo, hi]: [number, number],
  [fullLo, fullHi]: [number, number],
): [number, number] {
  const span = Math.min(hi - lo, fullHi - fullLo);
  let nlo = Math.max(lo, fullLo);
  let nhi = nlo + span;
  if (nhi > fullHi) {
    nhi = fullHi;
    nlo = nhi - span;
  }
  return [nlo, nhi];
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
}

// Custom tooltip: "Actual" listed first and emphasised, models after.
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number | string;
}) {
  if (!active || !payload?.length) return null;
  const ordered = [...payload].sort((a, b) =>
    a.dataKey === "actual" ? -1 : b.dataKey === "actual" ? 1 : 0,
  );
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
      <div className="mb-1 text-muted-foreground">
        {new Date(Number(label)).toLocaleString()}
      </div>
      {ordered.map((e) => {
        const isActual = e.dataKey === "actual";
        return (
          <div
            key={String(e.dataKey)}
            className={
              isActual
                ? "flex items-center gap-2 text-sm font-semibold text-foreground"
                : "flex items-center gap-2 text-muted-foreground"
            }
          >
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: e.color }}
            />
            <span>{e.name}</span>
            <span className="ml-auto tabular-nums">
              {typeof e.value === "number" ? e.value.toFixed(2) : e.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface LegendItem {
  value?: string;
  color?: string;
  dataKey?: string | number;
}

// Custom legend: "Actual" first (Recharts otherwise sorts entries by name).
function ChartLegend({ payload }: { payload?: LegendItem[] }) {
  if (!payload?.length) return null;
  const ordered = [...payload].sort((a, b) =>
    a.dataKey === "actual" ? -1 : b.dataKey === "actual" ? 1 : 0,
  );
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {ordered.map((e) => (
        <li key={String(e.dataKey)} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: e.color }}
          />
          <span className={e.dataKey === "actual" ? "font-medium text-foreground" : ""}>
            {e.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PredictionChart({ points, models, horizon }: PredictionChartProps) {
  // Numeric time axis (epoch ms) so we can drive zoom/pan via the x-domain.
  const data = useMemo(
    () => points.map((p) => ({ ...p, t: Date.parse(p.timestamp) })),
    [points],
  );
  const full = useMemo<[number, number]>(
    () => (data.length ? [data[0].t, data[data.length - 1].t] : [0, 1]),
    [data],
  );

  // Dexcom-style fixed ceiling for recognizability: 16 normally, 22 if any value
  // (actual or predicted) exceeds 16.
  const yMax = useMemo(() => {
    let max = 0;
    for (const p of points) {
      for (const key of ["actual", ...models]) {
        const v = (p as Record<string, number | string | null>)[key];
        if (typeof v === "number" && Number.isFinite(v) && v > max) max = v;
      }
    }
    return max > 16 ? 22 : 16;
  }, [points, models]);

  const [domain, setDomain] = useState<[number, number] | null>(null);
  const view = domain ?? full;

  // Reset the view whenever the underlying data changes.
  useEffect(() => setDomain(null), [points]);

  const containerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; lo: number; hi: number } | null>(null);

  // Wheel-to-zoom around the cursor. Needs a non-passive listener to preventDefault.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      setDomain((cur) => {
        const [lo, hi] = cur ?? full;
        const span = hi - lo;
        const center = lo + span * frac;
        const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2; // down = zoom out
        const newSpan = Math.min(Math.max(span * factor, MIN_SPAN_MS), full[1] - full[0]);
        const nlo = center - (center - lo) * (newSpan / span);
        return clampDomain([nlo, nlo + newSpan], full);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [full]);

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, lo: view[0], hi: view[1] };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const d = drag.current;
    const el = containerRef.current;
    if (!d || !el) return;
    const span = d.hi - d.lo;
    const dxFrac = (e.clientX - d.x) / el.getBoundingClientRect().width;
    setDomain(clampDomain([d.lo - dxFrac * span, d.hi - dxFrac * span], full));
  };
  const endDrag = () => {
    drag.current = null;
  };

  if (points.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No data in this range.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onDoubleClick={() => setDomain(null)}
      className="h-[28rem] w-full cursor-grab select-none active:cursor-grabbing"
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
          <Legend verticalAlign="top" height={28} content={<ChartLegend />} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={view}
            allowDataOverflow
            tickFormatter={formatTime}
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            minTickGap={48}
          />
          <YAxis
            domain={[0, yMax]}
            allowDataOverflow
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            label={{
              value: "mmol/L",
              angle: -90,
              position: "insideLeft",
              fill: "var(--color-muted-foreground)",
              fontSize: 11,
            }}
          />
          <ReferenceArea
            y1={TIR_LOW}
            y2={TIR_HIGH}
            fill="var(--color-band)"
            stroke="none"
            ifOverflow="extendDomain"
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={colorFor("actual")}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Actual"
          />
          {models.map((m) => (
            <Line
              key={m}
              type="monotone"
              dataKey={m}
              stroke={colorFor(m)}
              strokeWidth={1.4}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
              name={`${prettyName(m)} (+${horizon}m)`}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
