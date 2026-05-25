// Demo-mode data layer: serves the bundled synthetic JSON (frontend/public/
// demo-data/) so the deployed app needs no backend. Mirrors the api.ts contract.
import type { MetricRow, PredictionPoint, PredictionsResponse, TimeRange } from "./api";

interface DemoPoint {
  timestamp: string;
  model: string;
  horizon: number;
  actual: number;
  pred: number;
}

interface DemoMeta {
  models: string[];
  splits: string[];
  range: Record<string, TimeRange>;
}

const BASE = `${import.meta.env.BASE_URL}demo-data`;

function load<T>(file: string): Promise<T> {
  return fetch(`${BASE}/${file}`).then((r) => {
    if (!r.ok) throw new Error(`demo data ${file}: ${r.status}`);
    return r.json() as Promise<T>;
  });
}

let _meta: Promise<DemoMeta> | null = null;
let _metrics: Promise<MetricRow[]> | null = null;
let _points: Promise<DemoPoint[]> | null = null;

const meta = () => (_meta ??= load<DemoMeta>("meta.json"));
const metrics = () => (_metrics ??= load<MetricRow[]>("metrics.json"));
const points = () => (_points ??= load<DemoPoint[]>("predictions.json"));

export async function demoModels(): Promise<string[]> {
  return (await meta()).models;
}

export async function demoRange(split: string): Promise<TimeRange> {
  const r = (await meta()).range[split];
  if (!r) throw new Error(`no demo range for split "${split}"`);
  return r;
}

export async function demoMetrics(split: string): Promise<MetricRow[]> {
  return (await metrics()).filter((m) => m.split === split);
}

export async function demoPredictions(params: {
  models: string[];
  horizon: number;
  split: string;
  start: string;
  end: string;
}): Promise<PredictionsResponse> {
  const all = await points();
  const selected = new Set(params.models);
  const start = Date.parse(params.start);
  const end = Date.parse(params.end);

  // Group rows of the requested horizon/window by timestamp into the wide
  // {timestamp, actual, <model>: pred} shape the chart expects.
  const byTs = new Map<string, PredictionPoint>();
  for (const p of all) {
    if (p.horizon !== params.horizon) continue;
    const t = Date.parse(p.timestamp);
    if (t < start || t >= end) continue;
    let pt = byTs.get(p.timestamp);
    if (!pt) {
      pt = { timestamp: p.timestamp, actual: p.actual };
      byTs.set(p.timestamp, pt);
    }
    if (selected.has(p.model)) pt[p.model] = p.pred;
  }

  const pts = Array.from(byTs.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  return { horizon: params.horizon, split: params.split, points: pts };
}
