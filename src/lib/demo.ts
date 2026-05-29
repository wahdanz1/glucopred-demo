// Demo-mode data layer: serves the bundled synthetic JSON (frontend/public/
// demo-data/) so the deployed app needs no backend. Mirrors the api.ts contract.
import type {
  ClarkePoint,
  ClarkePolygons,
  MetricRow,
  PredictionPoint,
  PredictionsResponse,
  TimeRange,
} from "./api";

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

// Several independently-generated synthetic datasets are bundled under
// demo-data/<id>/; index.json lists them. The UI flips between them to show the
// predictions aren't hardcoded. Older single-dataset builds (no index.json) fall
// back to the flat demo-data/ root via the empty id.
let _ids: Promise<string[]> | null = null;
let current = 0;
let _meta: Promise<DemoMeta> | null = null;
let _metrics: Promise<MetricRow[]> | null = null;
let _points: Promise<DemoPoint[]> | null = null;
let _clarkePoints: Promise<ClarkePoint[]> | null = null;
// Zone polygons are constant across datasets, so the cache outlives setDemoDataset.
let _clarkeBoundaries: Promise<ClarkePolygons> | null = null;

function datasetIds(): Promise<string[]> {
  return (_ids ??= fetch(`${BASE}/index.json`)
    .then((r) => (r.ok ? (r.json() as Promise<{ ids: string[] }>) : null))
    .then((j) => j?.ids ?? [""])
    .catch(() => [""]));
}

async function load<T>(file: string): Promise<T> {
  const ids = await datasetIds();
  const sub = ids[current] ? `/${ids[current]}` : "";
  const r = await fetch(`${BASE}${sub}/${file}`);
  if (!r.ok) throw new Error(`demo data ${file}: ${r.status}`);
  return r.json() as Promise<T>;
}

const meta = () => (_meta ??= load<DemoMeta>("meta.json"));
const metrics = () => (_metrics ??= load<MetricRow[]>("metrics.json"));
const points = () => (_points ??= load<DemoPoint[]>("predictions.json"));
const clarkePoints = () => (_clarkePoints ??= load<ClarkePoint[]>("clarke_points.json"));

export async function demoDatasetCount(): Promise<number> {
  return (await datasetIds()).length;
}

export function setDemoDataset(i: number): void {
  current = i;
  // Force reload of per-dataset files; boundaries are constant and stay cached.
  _meta = _metrics = _points = _clarkePoints = null;
}

export function demoClarkeBoundaries(): Promise<ClarkePolygons> {
  return (_clarkeBoundaries ??= fetch(`${BASE}/clarke_boundaries.json`).then((r) => {
    if (!r.ok) throw new Error(`demo data clarke_boundaries.json: ${r.status}`);
    return r.json() as Promise<ClarkePolygons>;
  }));
}

export async function demoClarkePoints(params: {
  model: string;
  horizon: number;
  split: string;
}): Promise<ClarkePoint[]> {
  const all = await clarkePoints();
  return all.filter((p) => p.model === params.model && p.horizon === params.horizon);
}

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
