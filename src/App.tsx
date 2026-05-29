import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "./components/ui/Card";
import { Field } from "./components/ui/Field";
import { Select } from "./components/ui/Select";
import { Toggle } from "./components/ui/Toggle";
import { Segmented } from "./components/ui/Segmented";
import { Table, type Column } from "./components/ui/Table";
import { Tooltip } from "./components/ui/Tooltip";
import { LinkButton } from "./components/ui/LinkButton";
import { PredictionChart } from "./components/PredictionChart";
import { ClarkeGrid, ClarkeZoneLegend, type ZonePctEntry } from "./components/ClarkeGrid";
import { FaGithub, FaLinkedin } from "react-icons/fa6";

const GITHUB_URL = "https://github.com/wahdanz1/glucopred-demo";
const LINKEDIN_URL = "https://linkedin.com/in/dwahlgren";
import {
  fetchDatasetCount,
  fetchMetrics,
  fetchModels,
  fetchPredictions,
  fetchRange,
  setDataset,
  type MetricRow,
  type PredictionPoint,
} from "./lib/api";
import { colorFor, lineStyleFor, prettyName, sortModels } from "./lib/models";

// In the public demo only the synthetic test slice is bundled, so offer test only.
const DEMO = import.meta.env.VITE_DEMO_MODE === "true";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60.70068 83.793335"
      fill="currentColor"
      role="img"
      aria-label="GlucoPred logo"
      className={className}
    >
      <g transform="translate(-73.926231,-107.33505)">
        <path d="m 134.20059,165.94904 c -0.52712,0.0584 -1.04639,0.13201 -1.55804,0.2248 -1.19738,0.21714 -2.57251,0.59543 -4.08192,0.83974 -1.50941,0.24431 -3.27734,0.42046 -5.14852,-0.40204 -1.87117,-0.82249 -2.9074,-2.21111 -3.72484,-3.37706 -0.81744,-1.16594 -1.45445,-2.24185 -1.97249,-2.87321 -0.35277,-0.42991 -0.34614,-0.39565 -0.39274,-0.44545 -0.0564,0.0782 -0.0157,0.0424 -0.154,0.22686 -0.62413,0.83274 -1.72925,3.0793 -2.87682,5.3945 -1.14757,2.3152 -2.32528,4.75097 -4.23437,6.66006 -1.90909,1.90908 -5.06289,2.90208 -7.64295,1.72858 -2.580048,-1.1735 -4.158426,-3.60343 -5.353158,-6.81457 -1.194733,-3.21114 -1.937569,-7.19051 -2.639115,-10.70684 -0.27832,-1.39502 -0.537197,-2.57738 -0.794784,-3.69177 -0.447642,0.71876 -0.764934,1.28182 -1.331701,2.00195 -1.187937,1.50939 -2.957627,2.38449 -4.052983,2.62723 -1.095355,0.24273 -1.257627,0.19368 -1.734261,0.45682 -0.476649,0.26315 -1.771407,1.31446 -3.318661,2.51974 -1.547254,1.20528 -3.451137,2.58545 -5.790861,3.56257 -1.075671,0.44923 -2.173744,0.78901 -3.28507,1.04645 2.050726,14.80311 14.755882,26.20099 30.123224,26.20099 15.01202,0 27.4836,-10.87653 29.96406,-25.17935 z" />
        <path d="m 104.68198,107.33505 c -11.703942,20.27183 -29.260825,35.24325 -30.755743,51.21134 0.37769,-0.11493 0.738686,-0.24281 1.081588,-0.38602 1.500946,-0.62683 2.984132,-1.65206 4.371309,-2.73265 1.387177,-1.08058 2.573182,-2.19575 4.132564,-3.05666 1.559396,-0.86091 2.986964,-0.993 3.388941,-1.0821 0.185286,-0.0411 0.207908,-5.7e-4 0.225826,-0.005 0.02052,-0.007 0.03915,-0.0772 0.295589,-0.40308 0.482728,-0.61335 1.504599,-2.49975 2.728516,-4.11137 0.611958,-0.80581 1.189915,-1.70148 2.755904,-2.31046 0.391497,-0.15224 0.882583,-0.25048 1.399914,-0.26148 0.51733,-0.011 1.060058,0.0648 1.554944,0.26562 0.989773,0.40161 1.631697,1.10843 2.056722,1.76165 0.85005,1.30644 1.134303,2.51556 1.511536,4.00802 0.377234,1.49246 0.71958,3.19097 1.07229,4.95887 0.70543,3.53579 1.4896,7.39294 2.36936,9.75754 0.87977,2.36459 1.92312,3.24947 2.10943,3.33417 0.18631,0.0847 -0.0557,0.2784 0.69143,-0.46871 0.7471,-0.7471 1.9702,-2.82364 3.06442,-5.03121 1.09422,-2.20757 2.07099,-4.49465 3.46852,-6.35931 1.39752,-1.86467 3.66779,-3.17387 5.84202,-2.8515 2.17422,0.32236 3.47339,1.6518 4.46071,2.85512 0.98733,1.20331 1.66025,2.39409 2.25774,3.24631 0.59748,0.85222 1.0817,1.23553 1.1405,1.26143 0.0588,0.0258 0.62952,0.12462 1.6645,-0.0429 1.03499,-0.16752 2.41167,-0.53603 3.96668,-0.81803 1.04835,-0.19013 2.07882,-0.31458 3.08973,-0.39584 -0.7067,-16.39653 -17.96487,-31.59349 -29.94494,-52.34358 z" />
      </g>
    </svg>
  );
}

const SPLITS = DEMO
  ? [{ value: "test", label: "Test" }]
  : [
      { value: "test", label: "Test" },
      { value: "val", label: "Validation" },
    ];

const HORIZONS = [
  { value: 15, label: "+15" },
  { value: 30, label: "+30" },
  { value: 60, label: "+60" },
];

const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_ZOOM_HOURS = 6;

function toDatetimeLocalValue(iso: string): string {
  return iso.slice(0, 16);
}

function shiftHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString().slice(0, 16);
}

function modelDescription(modelId: string, horizon: number): string {
  switch (modelId) {
    case "persistence":
      return `Predicts that glucose will stay the same ${horizon} minutes from now. The simplest baseline - every other model has to beat it to justify its existence.`;
    case "moving_average_5":
      return "Predicts the average of the last 5 CGM readings (25 minutes). Smooths sensor noise but lags behind actual changes.";
    case "ar_2":
      return "A second-order autoregression: a linear combination of the previous two readings. Captures local trend while staying mean-reverting, so it rarely overshoots.";
    case "linear_extrapolation":
      return "Extends the slope between the last two readings forward in time. Aggressive - overshoots when glucose is rising sharply, undershoots when it's falling.";
    case "lstm":
      return "A neural network trained per horizon. Reads the previous 2 hours of glucose plus insulin context (8 channels including bolus and basal IOB) and predicts ahead. The only model that's aware of insulin.";
    default:
      return "";
  }
}

function metricColumns(
  rows: MetricRow[],
  best: Record<string, number>,
): Column<MetricRow>[] {
  const fmt = (n: number, d = 3) => n.toFixed(d);
  const isBest = (key: string, row: MetricRow) =>
    rows[best[key]]?.model === row.model;
  const numCell = (val: string, best: boolean, danger?: boolean) => (
    <span
      className={
        danger
          ? "font-semibold text-[color:var(--color-zone-e)]"
          : best
            ? "font-semibold text-primary"
            : ""
      }
    >
      {val}
    </span>
  );
  return [
    {
      key: "model",
      header: "Model",
      render: (r) => (
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: colorFor(r.model) }}
          />
          <span className="font-medium text-foreground">
            {prettyName(r.model)}
          </span>
          {r.model === "lstm" && (
            <span className="shrink-0 rounded-sm border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              neural
            </span>
          )}
        </span>
      ),
    },
    { key: "n", header: "N", align: "right", render: (r) => r.n.toLocaleString() },
    {
      key: "rmse",
      header: (
        <Tooltip align="end" content="Root-mean-squared error in mmol/L. Heavily penalises large misses. Lower is better.">
          RMSE
        </Tooltip>
      ),
      align: "right",
      render: (r) => numCell(fmt(r.rmse), isBest("rmse", r)),
    },
    {
      key: "mae",
      header: (
        <Tooltip align="end" content="Mean absolute error in mmol/L. The model's typical miss size. Lower is better.">
          MAE
        </Tooltip>
      ),
      align: "right",
      render: (r) => numCell(fmt(r.mae), isBest("mae", r)),
    },
    {
      key: "tir_agreement",
      header: (
        <Tooltip align="end" content="Time-in-range agreement: share of predictions that agree with reality on whether glucose is in the 3.9–10.0 mmol/L target band. Higher is better.">
          TIR agr.
        </Tooltip>
      ),
      align: "right",
      render: (r) =>
        numCell(`${(r.tir_agreement * 100).toFixed(1)}%`, isBest("tir", r)),
    },
    {
      key: "clarke_AB",
      header: (
        <Tooltip align="end" content="Share of predictions landing in Clarke zones A or B — clinically acceptable: accurate or off in a way that wouldn't lead to harmful action. Higher is better.">
          A+B
        </Tooltip>
      ),
      align: "right",
      render: (r) =>
        numCell(`${(r.clarke_A + r.clarke_B).toFixed(1)}%`, isBest("ab", r)),
    },
    {
      key: "clarke_unsafe",
      header: (
        <Tooltip align="end" content="Share of predictions in Clarke zones C, D, or E — would lead to a wrong or harmful action. Lower is better; ≥ 5 % is flagged red.">
          Unsafe
        </Tooltip>
      ),
      align: "right",
      render: (r) =>
        numCell(
          `${r.clarke_unsafe.toFixed(1)}%`,
          isBest("unsafe", r),
          r.clarke_unsafe >= 5,
        ),
    },
  ];
}

export default function App() {
  const [models, setModels] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [split, setSplit] = useState("test");
  const [horizon, setHorizon] = useState(30);
  const [rangeEnd, setRangeEnd] = useState("");
  const [windowHours, setWindowHours] = useState(DEFAULT_WINDOW_HOURS);
  const [datasetCount, setDatasetCount] = useState(1);
  const [datasetIndex, setDatasetIndex] = useState(0);
  const [gridModel, setGridModel] = useState<string>("");
  const [clarkeZonePct, setClarkeZonePct] = useState<ZonePctEntry[]>([]);

  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [points, setPoints] = useState<PredictionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The visible window is the most recent `windowHours` of the split's data.
  const end = rangeEnd ? toDatetimeLocalValue(rangeEnd) : "";
  const start = rangeEnd ? shiftHours(rangeEnd, -windowHours) : "";

  // Only offer window presets that fit the data on hand, plus an "All" option,
  useEffect(() => {
    fetchDatasetCount().then(setDatasetCount).catch(() => setDatasetCount(1));
  }, []);

  useEffect(() => {
    setDataset(datasetIndex);
    (async () => {
      try {
        const [allModels, range] = await Promise.all([
          fetchModels(),
          fetchRange(split),
        ]);
        const orderedModels = sortModels(allModels, (m) => m);
        setModels(orderedModels);
        setSelected(new Set(orderedModels));
        setRangeEnd(range.end);
        setWindowHours(DEFAULT_WINDOW_HOURS);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [split, datasetIndex]);

  const refreshMetrics = useCallback(async () => {
    try {
      setMetrics(await fetchMetrics(split));
    } catch (e) {
      setError(String(e));
    }
  }, [split, datasetIndex]);

  const refreshPredictions = useCallback(async () => {
    if (!start || !end || selected.size === 0) {
      setPoints([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPredictions({
        models: Array.from(selected),
        horizon,
        split,
        start,
        end,
      });
      setPoints(res.points);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [selected, horizon, split, start, end, datasetIndex]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    refreshPredictions();
  }, [refreshPredictions]);

  // Default the Clarke grid to a known model whenever the model list loads or
  // shifts. Independent of Predictions' multi-select - selection in one card
  // shouldn't make options vanish in the other.
  useEffect(() => {
    if (models.length === 0) {
      setGridModel("");
      return;
    }
    if (!models.includes(gridModel)) {
      setGridModel(models[0]);
    }
  }, [models, gridModel]);

  const filteredMetrics = useMemo(
    () => sortModels(metrics.filter((m) => m.horizon === horizon), (r) => r.model),
    [metrics, horizon],
  );

  // Best-per-column indices for the metrics table highlight.
  const metricsBest = useMemo(() => {
    const r = filteredMetrics;
    if (!r.length) return {} as Record<string, number>;
    const argmin = (f: (x: MetricRow) => number) =>
      r.reduce((bi, x, i) => (f(x) < f(r[bi]) ? i : bi), 0);
    const argmax = (f: (x: MetricRow) => number) =>
      r.reduce((bi, x, i) => (f(x) > f(r[bi]) ? i : bi), 0);
    return {
      rmse: argmin((x) => x.rmse),
      mae: argmin((x) => x.mae),
      tir: argmax((x) => x.tir_agreement),
      ab: argmax((x) => x.clarke_A + x.clarke_B),
      unsafe: argmin((x) => x.clarke_unsafe),
    };
  }, [filteredMetrics]);

  const toggleModel = (m: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  return (
    <main className="mx-auto flex max-w-[1220px] flex-col gap-5 p-6">
      <Card>
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
          <div className="flex min-w-0 gap-4">
            <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-md border border-border bg-card md:grid">
              <LogoMark className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="cal mb-2 block">
                Degree thesis · Predictive CGM
                {DEMO && " · Synthetic data"}
              </span>
              <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
                <LogoMark className="h-8 w-8 shrink-0 text-primary md:hidden" />
                GlucoPred
              </h1>
              <p className="mt-3 max-w-[52ch] text-sm text-muted-foreground">
                Short-horizon blood-glucose forecasting from continuous-monitor
                and insulin-pump signals — five models evaluated head-to-head at
                +15, +30 and +60 minutes.
                {DEMO && (
                  <>
                    {" "}Curves run the project's real model code on simulated
                    patients; no real medical data.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-start justify-start gap-2 md:justify-end">
            <LinkButton href={GITHUB_URL} icon={<FaGithub size={16} />}>
              Source repo
            </LinkButton>
            <LinkButton href={LINKEDIN_URL} icon={<FaLinkedin size={16} />}>
              Contact
            </LinkButton>
          </div>
        </div>
      </Card>

      <div className="sticky top-2 z-20 rounded-md border border-border bg-background/70 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-6">
          {DEMO && datasetCount > 1 && (
            <div className="flex items-center gap-3">
              <span className="cal">Dataset</span>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: datasetCount }).map((_, i) => (
                  <Toggle
                    key={i}
                    label={`Set ${i + 1}`}
                    active={datasetIndex === i}
                    onClick={() => setDatasetIndex(i)}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 md:ml-auto">
            <span className="cal">Horizon</span>
            <Segmented
              options={HORIZONS}
              value={horizon}
              onChange={setHorizon}
              ariaLabel="Prediction horizon"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Predictions vs actual"
          subtitle={loading ? "loading…" : undefined}
        />
        <p className="mb-3 max-w-[82ch] text-sm text-muted-foreground">
          The white line is the actual glucose. Every dashed line is a model's
          forecast for that same moment, made {horizon} minutes earlier from
          the previous 2 hours of data — never the future. Where a dashed line
          lands on the white, the prediction was right; the gap is how far off
          the model was. The shaded band is the in-range target
          (3.9–10.0 mmol/L).
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {models.map((m) => (
            <Toggle
              key={m}
              label={prettyName(m)}
              active={selected.has(m)}
              swatch={colorFor(m)}
              lineStyle={lineStyleFor(m)}
              mode="multi"
              onClick={() => toggleModel(m)}
            />
          ))}
        </div>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <PredictionChart
            points={points}
            models={Array.from(selected)}
            horizon={horizon}
            defaultZoomHours={DEFAULT_ZOOM_HOURS}
          />
        )}
        {SPLITS.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm text-muted-foreground">
            <Field label="Split">
              <Select
                options={SPLITS}
                value={split}
                onChange={(e) => setSplit(e.target.value)}
              />
            </Field>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Per-model metrics"
          subtitle={`${split} split · +${horizon} min`}
        />
        <p className="mb-4 text-sm text-muted-foreground">
          Accuracy and clinical-safety scores for every model at the selected
          horizon.
        </p>
        <Table
          columns={metricColumns(filteredMetrics, metricsBest)}
          rows={filteredMetrics}
          rowKey={(r) => `${r.model}-${r.horizon}`}
        />
        <p className="mt-4 text-xs text-muted-foreground">
          RMSE / MAE in mmol/L ·{" "}
          <strong className="text-foreground">TIR agr.</strong> share of points
          where forecast and truth agree on in-range vs. out ·{" "}
          <strong className="text-foreground">A+B</strong> clinically acceptable
          (Clarke) · <strong className="text-foreground">Unsafe</strong> = C+D+E.
          Best value per column is highlighted; Unsafe ≥ 5% flagged in red.
        </p>
      </Card>

      <Card>
        <CardHeader title="Clarke Error Grid" />
        {gridModel ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Every prediction plotted against truth. Distance from the 45°
              line is the error; the zone it lands in is the clinical
              consequence of trusting it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {sortModels(models, (m) => m).map((m) => (
                <Toggle
                  key={m}
                  label={prettyName(m)}
                  active={gridModel === m}
                  swatch={colorFor(m)}
                  lineStyle={lineStyleFor(m)}
                  onClick={() => setGridModel(m)}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start">
              <div className="min-w-0">
                <ClarkeGrid
                  model={gridModel}
                  horizon={horizon}
                  split={split}
                  onZonePctChange={setClarkeZonePct}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {prettyName(gridModel)}{" "}
                    {gridModel === "lstm" ? "· neural net" : "· baseline"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {modelDescription(gridModel, horizon)}
                  </p>
                </div>
                <ClarkeZoneLegend zonePct={clarkeZonePct} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Toggle at least one model above to populate the grid.
          </p>
        )}
      </Card>
    </main>
  );
}
