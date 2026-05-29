import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  useXAxisScale,
  useYAxisScale,
} from "recharts";
import {
  fetchClarkeBoundaries,
  fetchClarkePoints,
  type ClarkePoint,
  type ClarkePolygons,
  type ZoneKey,
} from "../lib/api";
import { useIsMobile } from "../lib/useIsMobile";

const ZONES: ZoneKey[] = ["A", "B", "C", "D", "E"];

// Per-zone clinical descriptions used by the legend below the grid. Tied to
// the standard Clarke 1987 zone definitions but phrased for a non-clinician
// reader (what the prediction would have meant in practice).
const ZONE_INFO: Array<{ zone: ZoneKey; name: string; meaning: string }> = [
  {
    zone: "A",
    name: "Accurate",
    meaning:
      "Clinically accurate - within 20% of truth, or both in the low range.",
  },
  {
    zone: "B",
    name: "Benign error",
    meaning: "Off, but a treatment based on it would do no harm.",
  },
  {
    zone: "C",
    name: "Overcorrection",
    meaning:
      "Would prompt an unnecessary correction, pushing glucose the wrong way.",
  },
  {
    zone: "D",
    name: "Failure to detect",
    meaning: "Misses a dangerous high or low that needed action.",
  },
  {
    zone: "E",
    name: "Erroneous treatment",
    meaning:
      "Opposite treatment indicated - treats a high as a low or vice versa.",
  },
];

const ZONE_COLORS: Record<ZoneKey, string> = {
  A: "var(--color-zone-a)",
  B: "var(--color-zone-b)",
  C: "var(--color-zone-c)",
  D: "var(--color-zone-d)",
  E: "var(--color-zone-e)",
};

const PLOT_MAX = 22; // mmol/L; matches the prediction chart's upper bound
const AXIS_PX = 56;  // pixels reserved for tick labels + axis title, both axes

// SVG-per-dot scales linearly; ~10k circles plus Recharts' tooltip hit-testing
// freezes the main thread. Cap the visible scatter, but keep every clinically
// risky point (zones C/D/E) - those are rare and the whole reason the grid
// exists. Zone percentages are still computed from the full set.
const MAX_VISIBLE_POINTS = 2000;

function strideSample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

// Filled zone polygons + boundary edges, drawn behind the scatter points.
// Recharts v3 deprecated `Customized` (no longer injects axis maps); the
// v3-native way to read the chart's scales is the useXAxisScale / useYAxisScale
// hooks, which are valid inside any child rendered under a Recharts chart.
function ZoneLayer({ polygons }: { polygons: ClarkePolygons | null }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!polygons || !xScale || !yScale) return null;
  return (
    <g aria-hidden>
      {(["A", "B", "C", "D", "E"] as const).flatMap((zone) =>
        polygons[zone].map((poly, i) => (
          <polygon
            key={`${zone}-${i}`}
            points={poly.map(([x, y]) => `${xScale(x)},${yScale(y)}`).join(" ")}
            fill={ZONE_COLORS[zone]}
            fillOpacity={0.22}
            stroke={ZONE_COLORS[zone]}
            strokeOpacity={0.65}
            strokeWidth={1.2}
          />
        )),
      )}
    </g>
  );
}

export interface ZonePctEntry {
  zone: ZoneKey;
  pct: number;
}

interface ClarkeGridProps {
  model: string;
  horizon: number;
  split: string;
  /** When provided, the internal vertical zone legend is omitted and the
   *  computed zonePct is reported up so the parent can render the legend
   *  wherever the layout puts it. */
  onZonePctChange?: (pct: ZonePctEntry[]) => void;
}

export function ClarkeGrid({
  model,
  horizon,
  split,
  onZonePctChange,
}: ClarkeGridProps) {
  const isMobile = useIsMobile();
  const axisPx = isMobile ? 40 : AXIS_PX;
  // Centering rule: opposite-side margin must equal axis allocation on the
  // axis-bearing side, so the plot rect lands in the middle of its square
  // container. left = 0 → right = yAxis.width; bottom = 0 → top = xAxis.height.
  const chartMargin = isMobile
    ? { top: 40, right: 40, bottom: 0, left: 0 }
    : { top: 24, right: 24, bottom: 24, left: 24 };
  const tickFontSize = isMobile ? 11 : 13;
  const labelFontSize = isMobile ? 11 : 13;
  const [boundaries, setBoundaries] = useState<ClarkePolygons | null>(null);
  const [points, setPoints] = useState<ClarkePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClarkeBoundaries()
      .then(setBoundaries)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    // Clear points synchronously so the chart re-renders with just the zones
    // immediately on click - dots animate in when the new set lands, rather
    // than the UI freezing on the SVG churn of replacing 2k circles. Abort the
    // previous fetch on rapid model switches so a stale response can't land
    // on top of newer state.
    setPoints([]);
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetchClarkePoints({ model, horizon, split }, controller.signal)
      .then(setPoints)
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setError(String(e));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [model, horizon, split]);

  const pointsByZone = useMemo(() => {
    const acc: Record<ZoneKey, ClarkePoint[]> = { A: [], B: [], C: [], D: [], E: [] };
    for (const p of points) acc[p.zone].push(p);
    return acc;
  }, [points]);

  // Render-side downsample: keep all clinically risky points (C/D/E), stride-
  // sample the dense A+B zones to fill the remaining budget proportionally.
  const visibleByZone = useMemo(() => {
    const cde = pointsByZone.C.length + pointsByZone.D.length + pointsByZone.E.length;
    const budget = Math.max(0, MAX_VISIBLE_POINTS - cde);
    const denseTotal = pointsByZone.A.length + pointsByZone.B.length;
    const aShare = denseTotal ? Math.round((budget * pointsByZone.A.length) / denseTotal) : 0;
    const bShare = budget - aShare;
    return {
      A: strideSample(pointsByZone.A, aShare),
      B: strideSample(pointsByZone.B, bShare),
      C: pointsByZone.C,
      D: pointsByZone.D,
      E: pointsByZone.E,
    } satisfies Record<ZoneKey, ClarkePoint[]>;
  }, [pointsByZone]);

  const zonePct = useMemo(() => {
    const n = points.length;
    return ZONES.map((z) => ({
      zone: z,
      pct: n ? (pointsByZone[z].length / n) * 100 : 0,
    }));
  }, [points, pointsByZone]);

  const visibleCount = ZONES.reduce((s, z) => s + visibleByZone[z].length, 0);
  const sampled = visibleCount < points.length;

  // Push zonePct up so the parent can render the legend wherever the layout
  // calls for it (e.g. in a side column rather than below the grid).
  useEffect(() => {
    onZonePctChange?.(zonePct);
  }, [zonePct, onZonePctChange]);

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }

  return (
    <div className="mx-auto w-full max-w-[40rem]">
      {/* padding-top:100% is the bulletproof square: it's resolved against
          the wrapper's width, not the auto-height of its children. */}
      <div className="relative w-full" style={{ paddingTop: "100%" }}>
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
              {/* Symmetric margins + identical axis allocation sizes guarantee
                the inner plot rectangle is square (container square - axis area
                - margin) === (container square - axis area - margin) on both
                dimensions. Auto-computed YAxis width / XAxis height can differ
                between models with different tick-label widths, distorting the
                plot; AXIS_PX locks both to the same pixel budget. */}
            <ScatterChart margin={chartMargin}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
            <XAxis
              type="number"
              dataKey="actual"
              name="actual"
              domain={[0, PLOT_MAX]}
              ticks={[0, 4, 8, 12, 16, 20]}
              allowDataOverflow
              height={axisPx}
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: tickFontSize }}
              label={{
                value: "CGM mmol/L",
                position: "insideBottom",
                offset: 0,
                fill: "var(--color-muted-foreground)",
                fontSize: labelFontSize,
              }}
            />
            <YAxis
              type="number"
              dataKey="pred"
              name="predicted"
              domain={[0, PLOT_MAX]}
              ticks={[0, 4, 8, 12, 16, 20]}
              allowDataOverflow
              width={axisPx}
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: tickFontSize }}
              label={{
                value: "Predicted mmol/L",
                angle: -90,
                position: "insideLeft",
                offset: isMobile ? 10 : 16,
                style: { textAnchor: "middle" },
                fill: "var(--color-muted-foreground)",
                fontSize: labelFontSize,
              }}
            />
            <ZAxis range={[10, 10]} />
            <ZoneLayer polygons={boundaries} />
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: PLOT_MAX, y: PLOT_MAX },
              ]}
              stroke="var(--color-foreground)"
              strokeOpacity={0.45}
              strokeDasharray="3 4"
              ifOverflow="hidden"
            />
            {ZONES.map((z) => (
              // Key on model so each switch unmounts the old Scatter and mounts
              // a fresh one - guarantees Recharts re-runs the dot-appear animation.
              <Scatter
                key={`${model}-${z}`}
                name={z}
                data={visibleByZone[z]}
                fill={ZONE_COLORS[z]}
                fillOpacity={0.7}
                isAnimationActive
                animationDuration={550}
                animationEasing="ease-out"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        </div>
      </div>
      {!onZonePctChange && (
      <div className="mt-4 flex flex-col">
        {ZONE_INFO.map(({ zone, name, meaning }) => {
          const pct = zonePct.find((z) => z.zone === zone)?.pct ?? 0;
          const color = ZONE_COLORS[zone];
          return (
            <div
              key={zone}
              className="flex items-start gap-3 border-b border-border/40 py-3 last:border-0"
            >
              <div
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-sm font-semibold"
                style={{ borderColor: color, color }}
              >
                {zone}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">{name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{meaning}</p>
              </div>
              <div
                className="shrink-0 self-center text-base font-semibold tabular-nums"
                style={{
                  color: pct > 0 ? color : "var(--color-muted-foreground)",
                }}
              >
                {pct === 0 ? "0%" : `${pct.toFixed(1)}%`}
              </div>
            </div>
          );
        })}
        {loading && (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            loading…
          </p>
        )}
      </div>
      )}
      {sampled && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Showing {visibleCount.toLocaleString()} of {points.length.toLocaleString()} points
          (every C/D/E point shown; A/B subsampled for performance). Percentages
          computed from the full set.
        </p>
      )}
    </div>
  );
}

/** Standalone Clarke zone legend — meant to live in a side column next to the
 *  grid. Renders the same badge + name + meaning + percentage rows used inside
 *  the grid component, but separately so the layout can place it anywhere. */
export function ClarkeZoneLegend({ zonePct }: { zonePct: ZonePctEntry[] }) {
  return (
    <div className="flex flex-col">
      {ZONE_INFO.map(({ zone, name, meaning }) => {
        const pct = zonePct.find((z) => z.zone === zone)?.pct ?? 0;
        const color = ZONE_COLORS[zone];
        return (
          <div
            key={zone}
            className="flex items-start gap-3 border-b border-border/40 py-3 last:border-0"
          >
            <div
              aria-hidden
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-sm font-semibold"
              style={{ borderColor: color, color }}
            >
              {zone}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground">{name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{meaning}</p>
            </div>
            <div
              className="shrink-0 self-center text-base font-semibold tabular-nums"
              style={{
                color: pct > 0 ? color : "var(--color-muted-foreground)",
              }}
            >
              {pct === 0 ? "0%" : `${pct.toFixed(1)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
