export interface MetricRow {
  model: string;
  split: string;
  horizon: number;
  n: number;
  rmse: number;
  mae: number;
  tir_agreement: number;
  clarke_A: number;
  clarke_B: number;
  clarke_C: number;
  clarke_D: number;
  clarke_E: number;
  clarke_unsafe: number;
}

export interface PredictionPoint {
  timestamp: string;
  actual: number | null;
  [model: string]: number | string | null;
}

export interface PredictionsResponse {
  horizon: number;
  split: string;
  points: PredictionPoint[];
}

export interface TimeRange {
  start: string;
  end: string;
}

export type ZoneKey = "A" | "B" | "C" | "D" | "E";

export interface ClarkePoint {
  model: string;
  horizon: number;
  actual: number;
  pred: number;
  zone: ZoneKey;
}

// Polygons per zone in (ref_mmol, pred_mmol). Zone B is the implicit background.
export type ClarkePolygons = Record<"A" | "B" | "C" | "D" | "E", [number, number][][]>;

import * as demo from "./demo";

// Demo mode (Vercel deploy) serves bundled synthetic JSON; otherwise hit the
// FastAPI backend. Local dev leaves VITE_DEMO_MODE unset -> backend path, unchanged.
const DEMO = import.meta.env.VITE_DEMO_MODE === "true";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Demo-only: how many bundled synthetic datasets exist, and which is active.
// The backend path has a single live dataset, so count is 1 and selection is a no-op.
export function fetchDatasetCount(): Promise<number> {
  return DEMO ? demo.demoDatasetCount() : Promise.resolve(1);
}

export function setDataset(i: number): void {
  if (DEMO) demo.setDemoDataset(i);
}

export function fetchModels(): Promise<string[]> {
  if (DEMO) return demo.demoModels();
  return getJson<string[]>("/api/models");
}

export function fetchRange(split: string): Promise<TimeRange> {
  if (DEMO) return demo.demoRange(split);
  return getJson<TimeRange>(`/api/range?split=${split}`);
}

export function fetchMetrics(split: string): Promise<MetricRow[]> {
  if (DEMO) return demo.demoMetrics(split);
  return getJson<MetricRow[]>(`/api/metrics?split=${split}`);
}

export function fetchClarkeBoundaries(): Promise<ClarkePolygons> {
  if (DEMO) return demo.demoClarkeBoundaries();
  return getJson<ClarkePolygons>("/api/clarke-boundaries");
}

export function fetchClarkePoints(
  params: { model: string; horizon: number; split: string },
  signal?: AbortSignal,
): Promise<ClarkePoint[]> {
  if (DEMO) return demo.demoClarkePoints(params);
  const q = new URLSearchParams({
    model: params.model,
    horizon: String(params.horizon),
    split: params.split,
  });
  return fetch(`/api/clarke-points?${q}`, { signal }).then(async (res) => {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
    return res.json() as Promise<ClarkePoint[]>;
  });
}

export function fetchPredictions(params: {
  models: string[];
  horizon: number;
  split: string;
  start: string;
  end: string;
}): Promise<PredictionsResponse> {
  if (DEMO) return demo.demoPredictions(params);
  const q = new URLSearchParams({
    models: params.models.join(","),
    horizon: String(params.horizon),
    split: params.split,
    start: params.start,
    end: params.end,
  });
  return getJson<PredictionsResponse>(`/api/predictions?${q}`);
}
