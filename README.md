# GlucoPred — demo UI

Interactive viewer for blood-glucose prediction: actual vs. per-model predicted
glucose over time (+15 / +30 / +60 min), with model toggles and a metrics table.
React + TypeScript + Vite + Tailwind v4 + Recharts.

> **Synthetic demo data — not real patient data.** The public demo runs entirely
> on a generated synthetic dataset; the numbers carry **no clinical meaning**. It
> exists to demonstrate the application. (It's the front end of a private thesis
> project trained on real CGM data, which is never deployed.)

## Why this repo is separate

The main GlucoPred thesis project trains on a real person's medical data — Type 1
Diabetes CGM and insulin records at 5-minute resolution. That data is sensitive, so
the real app is only ever run locally and is never deployed or made public.

To still have something shareable and linkable, this is a fully separate, **public**
frontend that runs on entirely **synthetic** data — generated to look realistic but
carrying no clinical meaning. The separation is structural, not cosmetic:

- The real data lives in a private repo and never crosses over.
- This repo contains only frontend code plus baked synthetic JSON — no data pipeline,
  no backend, no real records.
- A production build defaults to synthetic demo mode (`.env.production`) as a safety
  guard, so a build can never serve real data by default.

It's a demo of an evolving thesis project, not a finished product.

## Run the demo locally

```bash
npm install
npm run dev      # reads bundled synthetic JSON, no backend
```
Open http://localhost:5173. Demo mode is pinned by `.env.development`, so the dev
server serves the bundled synthetic data with no extra flags.

## How it works

- `src/lib/api.ts` — data layer. With `VITE_DEMO_MODE=true` it serves the bundled
  synthetic JSON via `src/lib/demo.ts`; otherwise it calls a FastAPI backend
  (used only in the full project's local development).
- `public/demo-data/{meta,metrics,predictions}.json` — baked synthetic results
  (committed; this is what the demo renders).
- `src/components/ui/` — primitive library (`Card`, `Select`, `Field`, `Toggle`,
  `Table`, `Banner`); `src/components/PredictionChart.tsx` — the Recharts chart.

The app is fully static — no backend, no environment setup. The synthetic data is
generated and baked by the thesis project's pipeline; this repo ships the baked
result only.
