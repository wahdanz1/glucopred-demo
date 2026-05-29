import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PredictionPoint } from "../lib/api";
import { MODEL_ORDER, colorFor, lineStyleFor, prettyName } from "../lib/models";
import { useIsMobile } from "../lib/useIsMobile";
import { useTDeferred, useLang } from "../lib/i18n";

interface PredictionChartProps {
  points: PredictionPoint[];
  models: string[];
  horizon: number;
  /** Initial zoom (and reset target) expressed as a trailing hour count from
   *  the data's last sample. When unset, the view opens to the full data span. */
  defaultZoomHours?: number;
}

const TIR_LOW = 3.9;
const TIR_HIGH = 10.0;
const MIN_SPAN_MS = 30 * 60 * 1000; // don't zoom tighter than 30 minutes

function formatTime(ms: number, lang: string): string {
  return new Date(ms).toLocaleTimeString(lang, {
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

function rankEntry(key: string | number | undefined): number {
  if (key === "actual") return -1;
  const i = MODEL_ORDER.indexOf(String(key));
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

// Sorted ("Actual" first), styled tooltip rows. Pure body - caller wraps it
// in whatever chrome fits (floating card for the desktop inline tooltip;
// the dedicated mobile panel above the chart).
function TooltipBody({
  payload,
  label,
  lang,
}: {
  payload: TooltipEntry[];
  label?: number | string;
  lang: string;
}) {
  const ordered = [...payload].sort(
    (a, b) => rankEntry(a.dataKey) - rankEntry(b.dataKey),
  );
  return (
    <>
      <div className="mb-1 text-muted-foreground">
        {label != null ? new Date(Number(label)).toLocaleString(lang) : ""}
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
    </>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  lang,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number | string;
  lang: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border border-border bg-card px-3 py-2 text-xs"
      style={{ animation: "tooltipFadeIn 140ms ease-out" }}
    >
      <TooltipBody payload={payload} label={label} lang={lang} />
    </div>
  );
}

export function PredictionChart({
  points,
  models,
  horizon,
  defaultZoomHours,
}: PredictionChartProps) {
  const t = useTDeferred();
  const { lang } = useLang();
  const isMobile = useIsMobile();
  const [hover, setHover] = useState<{
    payload: TooltipEntry[];
    label: number | string;
  } | null>(null);
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
  // Recharts' touch handler exposes activeIndex but not activePayload - that
  // field is mouse-only. Reconstruct the payload from data[activeIndex] so the
  // mobile readout panel can render the same content the desktop tooltip does.
  const buildPayload = (idx: number): TooltipEntry[] => {
    const point = data[idx];
    if (!point) return [];
    const out: TooltipEntry[] = [];
    const actualVal = (point as Record<string, unknown>).actual;
    if (typeof actualVal === "number" && Number.isFinite(actualVal)) {
      out.push({
        dataKey: "actual",
        name: t.predictions.actualSeriesName,
        value: actualVal,
        color: colorFor("actual"),
      });
    }
    for (const m of models) {
      const v = (point as Record<string, unknown>)[m];
      if (typeof v === "number" && Number.isFinite(v)) {
        out.push({
          dataKey: m,
          name: t.predictions.modelSeriesName(prettyName(m), horizon),
          value: v,
          color: colorFor(m),
        });
      }
    }
    return out;
  };

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

  // Default zoom: a trailing window from the data's last sample. When the user
  // double-clicks to reset, they land here, not back at the full 24h fetched.
  const defaultDomain = useMemo<[number, number] | null>(() => {
    if (!data.length || !defaultZoomHours) return null;
    const end = data[data.length - 1].t;
    const start = Math.max(end - defaultZoomHours * 3600_000, data[0].t);
    return [start, end];
  }, [data, defaultZoomHours]);

  const [domain, setDomain] = useState<[number, number] | null>(null);
  const view = domain ?? defaultDomain ?? full;

  // Reset the view whenever the underlying data changes; null defers to the
  // default zoom (or full range if there's no default).
  useEffect(() => setDomain(null), [points]);

  // Map the time-based view onto data indices so Recharts' <Brush> can render
  // a controlled window that mirrors our wheel/drag-driven domain state.
  const [startIndex, endIndex] = useMemo(() => {
    if (!data.length) return [0, 0];
    let s = 0;
    while (s < data.length - 1 && data[s].t < view[0]) s++;
    let e = data.length - 1;
    while (e > 0 && data[e].t > view[1]) e--;
    return [s, e];
  }, [data, view]);

  const onBrushChange = (range: { startIndex?: number; endIndex?: number }) => {
    if (range.startIndex == null || range.endIndex == null) return;
    const lo = data[range.startIndex]?.t;
    const hi = data[range.endIndex]?.t;
    if (lo != null && hi != null && lo < hi) setDomain([lo, hi]);
  };

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
        const [lo, hi] = cur ?? defaultDomain ?? full;
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
  }, [full, defaultDomain]);

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
        {t.predictions.noData}
      </div>
    );
  }

  return (
    <>
      {isMobile && (
        // Dedicated readout above the chart so the floating tooltip doesn't
        // cover the lines on a narrow viewport. Fixed minimum height keeps
        // the chart from jumping as the user moves their finger.
        <div className="mb-2 min-h-[8.5rem] rounded-md border border-border bg-card px-3 py-2 text-xs">
          {hover ? (
            <TooltipBody payload={hover.payload} label={hover.label} lang={lang} />
          ) : (
            <span className="text-muted-foreground">
              {t.predictions.mobileHint}
            </span>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onDoubleClick={() => setDomain(null)}
        tabIndex={-1}
        className="h-[28rem] w-full cursor-grab select-none outline-none focus:outline-none active:cursor-grabbing md:h-[32rem]"
      >
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 8, left: -8 }}
            onMouseMove={(state: {
              activePayload?: TooltipEntry[];
              activeLabel?: number | string;
              activeIndex?: number | string | null;
            } | undefined) => {
              // Recharts' mouse handler typically populates activePayload; the
              // index fallback below is mostly for parity with the touch path.
              let payload = state?.activePayload;
              const idxNum =
                state?.activeIndex == null ? NaN : Number(state.activeIndex);
              if (
                (!payload || payload.length === 0) &&
                Number.isFinite(idxNum)
              ) {
                payload = buildPayload(idxNum);
              }
              if (payload?.length && state?.activeLabel != null) {
                setHover({ payload, label: state.activeLabel });
              }
            }}
            onTouchMove={(state: {
              activePayload?: TooltipEntry[];
              activeLabel?: number | string;
              activeIndex?: number | string | null;
            } | undefined) => {
              // Recharts' touch state returns activeIndex as a STRING and
              // omits activePayload - rebuild the payload from data[idx]
              // ourselves so the mobile readout panel can render values.
              let payload = state?.activePayload;
              const idxNum =
                state?.activeIndex == null ? NaN : Number(state.activeIndex);
              if (
                (!payload || payload.length === 0) &&
                Number.isFinite(idxNum)
              ) {
                payload = buildPayload(idxNum);
              }
              if (payload?.length && state?.activeLabel != null) {
                setHover({ payload, label: state.activeLabel });
              }
            }}
            onClick={(state: {
              activePayload?: TooltipEntry[];
              activeLabel?: number | string;
              activeIndex?: number | string | null;
            } | undefined) => {
              let payload = state?.activePayload;
              const idxNum =
                state?.activeIndex == null ? NaN : Number(state.activeIndex);
              if (
                (!payload || payload.length === 0) &&
                Number.isFinite(idxNum)
              ) {
                payload = buildPayload(idxNum);
              }
              if (payload?.length && state?.activeLabel != null) {
                setHover({ payload, label: state.activeLabel });
              }
            }}
            onMouseLeave={() => {
              if (!isMobile) setHover(null);
            }}
          >
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={view}
              allowDataOverflow
              tickFormatter={(ms) => formatTime(ms as number, lang)}
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 11 }}
              minTickGap={48}
            />
            <YAxis
              domain={[0, yMax]}
              allowDataOverflow
              width={36}
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 11 }}
            />
            <ReferenceArea
              y1={TIR_LOW}
              y2={TIR_HIGH}
              fill="var(--color-band)"
              stroke="none"
              ifOverflow="extendDomain"
            />
            {/* Tooltip stays fully active (with real content) so Recharts
                populates activePayload in the chart state we read in
                onMouseMove. On mobile we hide the popover via wrapperStyle,
                keeping the cursor + active dots visible while the dedicated
                panel above the chart shows the values. */}
            <Tooltip
              content={(props) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as unknown as TooltipEntry[] | undefined}
                  label={props.label}
                  lang={lang}
                />
              )}
              isAnimationActive={false}
              wrapperStyle={isMobile ? { display: "none" } : undefined}
            />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={colorFor("actual")}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name={t.predictions.actualSeriesName}
          />
          {models.map((m) => {
            const ls = lineStyleFor(m);
            return (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={colorFor(m)}
                strokeWidth={ls.width}
                strokeDasharray={ls.dash === "0" ? undefined : ls.dash}
                strokeLinecap="round"
                dot={false}
                isAnimationActive={false}
                name={t.predictions.modelSeriesName(prettyName(m), horizon)}
                connectNulls
              />
            );
          })}
            <Brush
              dataKey="t"
              height={32}
              stroke="var(--color-border)"
              fill="var(--color-muted)"
              travellerWidth={10}
              tickFormatter={(ts) => formatTime(ts as number, lang)}
              startIndex={startIndex}
              endIndex={endIndex}
              onChange={onBrushChange}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
