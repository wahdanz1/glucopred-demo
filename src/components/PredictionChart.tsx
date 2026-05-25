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
          <Legend
            verticalAlign="top"
            height={28}
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
          />
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
            domain={[0, "auto"]}
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
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            formatter={(value, key) => [
              typeof value === "number" ? value.toFixed(2) : value,
              prettyName(String(key)),
            ]}
          />
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
