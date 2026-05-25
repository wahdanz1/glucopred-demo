import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "./components/ui/Card";
import { Field } from "./components/ui/Field";
import { Select } from "./components/ui/Select";
import { Toggle } from "./components/ui/Toggle";
import { Table, type Column } from "./components/ui/Table";
import { Banner } from "./components/ui/Banner";
import { LinkButton } from "./components/ui/LinkButton";
import { Disclosure } from "./components/ui/Disclosure";
import { PredictionChart } from "./components/PredictionChart";
import logoUrl from "./assets/glucopred-logo.svg";
import { FaGithub, FaLinkedin } from "react-icons/fa6";

const GITHUB_URL = "https://github.com/wahdanz1/glucopred-demo";
const LINKEDIN_URL = "https://linkedin.com/in/dwahlgren";
import {
  fetchMetrics,
  fetchModels,
  fetchPredictions,
  fetchRange,
  type MetricRow,
  type PredictionPoint,
} from "./lib/api";
import { colorFor, prettyName } from "./lib/models";

// In the public demo only the synthetic test slice is bundled, so offer test only.
const DEMO = import.meta.env.VITE_DEMO_MODE === "true";

const SPLITS = DEMO
  ? [{ value: "test", label: "Test" }]
  : [
      { value: "test", label: "Test" },
      { value: "val", label: "Validation" },
    ];

const HORIZONS = [
  { value: "15", label: "+15 min" },
  { value: "30", label: "+30 min" },
  { value: "60", label: "+60 min" },
];

const DEFAULT_WINDOW_HOURS = 72;

const WINDOWS = [
  { value: "24", label: "Last 1 day" },
  { value: "72", label: "Last 3 days" },
  { value: "168", label: "Last 7 days" },
  { value: "336", label: "Last 14 days" },
  { value: "720", label: "Last 30 days" },
];

function toDatetimeLocalValue(iso: string): string {
  return iso.slice(0, 16);
}

function shiftHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString().slice(0, 16);
}

function metricColumns(): Column<MetricRow>[] {
  const fmt = (n: number, d = 3) => n.toFixed(d);
  return [
    { key: "model", header: "Model", render: (r) => prettyName(r.model) },
    { key: "horizon", header: "Horizon", align: "right", render: (r) => `+${r.horizon}m` },
    { key: "n", header: "N", align: "right", render: (r) => r.n.toLocaleString() },
    { key: "rmse", header: "RMSE", align: "right", render: (r) => fmt(r.rmse) },
    { key: "mae", header: "MAE", align: "right", render: (r) => fmt(r.mae) },
    {
      key: "tir_agreement",
      header: "TIR agr.",
      align: "right",
      render: (r) => `${(r.tir_agreement * 100).toFixed(1)}%`,
    },
    {
      key: "clarke_A",
      header: "Clarke A",
      align: "right",
      render: (r) => `${r.clarke_A.toFixed(1)}%`,
    },
    {
      key: "clarke_D",
      header: "Clarke D",
      align: "right",
      render: (r) => `${r.clarke_D.toFixed(1)}%`,
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

  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [points, setPoints] = useState<PredictionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The visible window is the most recent `windowHours` of the split's data.
  const end = rangeEnd ? toDatetimeLocalValue(rangeEnd) : "";
  const start = rangeEnd ? shiftHours(rangeEnd, -windowHours) : "";

  useEffect(() => {
    (async () => {
      try {
        const [allModels, range] = await Promise.all([
          fetchModels(),
          fetchRange(split),
        ]);
        setModels(allModels);
        setSelected(new Set(allModels));
        setRangeEnd(range.end);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [split]);

  const refreshMetrics = useCallback(async () => {
    try {
      setMetrics(await fetchMetrics(split));
    } catch (e) {
      setError(String(e));
    }
  }, [split]);

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
  }, [selected, horizon, split, start, end]);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    refreshPredictions();
  }, [refreshPredictions]);

  const filteredMetrics = useMemo(
    () => metrics.filter((m) => m.horizon === horizon),
    [metrics, horizon],
  );

  const toggleModel = (m: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 p-6">
      {DEMO && (
        <Banner>
          <strong>Synthetic demo data</strong> - not real patient data. Generated to
          demonstrate the app; the numbers carry no clinical meaning.
        </Banner>
      )}
      <Card>
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-medium text-foreground">GlucoPred</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Degree thesis (examensarbete) by Daniel Wahlgren
            </p>
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              Forecasting blood glucose 15–60 minutes ahead from continuous glucose
              monitor and insulin-pump data. Choose a prediction horizon and which models
              to overlay; each model's forecast is compared against the glucose that was
              actually measured.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href={GITHUB_URL} icon={<FaGithub size={16} />}>
                Source
              </LinkButton>
              <LinkButton href={LINKEDIN_URL} icon={<FaLinkedin size={16} />}>
                Contact
              </LinkButton>
            </div>
          </div>
          <img src={logoUrl} alt="GlucoPred logo" className="mr-2 h-20 w-auto shrink-0" />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Predictions vs actual"
          subtitle={loading ? "loading…" : `${points.length} points`}
        />
        <p className="mb-3 text-xs text-muted-foreground">
          Solid line is the measured glucose; dashed lines are each model's prediction
          for that moment, made {horizon} min earlier. The shaded band is the
          3.9–10.0 mmol/L target range. Scroll to zoom, drag to pan, double-click to reset.
        </p>
        <div className="mb-4 flex flex-col gap-2">
          <Disclosure summary="What am I looking at?">
            The solid white line is the real, measured glucose. Each dashed line is a
            model's prediction for that same moment, made {horizon} minutes earlier.
            Where a dashed line meets the white line, that prediction was exactly right
            for that instant.
          </Disclosure>
          <Disclosure summary="How does the model predict?">
            At any moment it reads the previous 2 hours of glucose and insulin data and
            outputs the glucose it expects {horizon} minutes later. It only ever uses the
            past - never the future it's trying to predict.
          </Disclosure>
          <Disclosure summary="Why do the dashed lines lag behind the white line?">
            Predicting further ahead is harder, so a model leans on the recent trend and
            tends to reach peaks and drops a little late - and that lag grows with the
            horizon (+15 → +30 → +60 min). A perfect model would sit exactly on the white
            line; the gap is how far from perfect it is. The "persistence" baseline
            (predict "same as now") is the clearest case and the bar every model must beat.
          </Disclosure>
        </div>
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <PredictionChart
            points={points}
            models={Array.from(selected)}
            horizon={horizon}
          />
        )}

        <div className="mt-5 border-t border-border pt-4">
          <h3 className="mb-3 text-sm font-medium text-foreground">Filters</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Field label="Split">
              <Select
                options={SPLITS}
                value={split}
                onChange={(e) => setSplit(e.target.value)}
              />
            </Field>
            <Field label="Horizon">
              <Select
                options={HORIZONS}
                value={String(horizon)}
                onChange={(e) => setHorizon(Number(e.target.value))}
              />
            </Field>
            <Field label="Window">
              <Select
                options={WINDOWS}
                value={String(windowHours)}
                onChange={(e) => setWindowHours(Number(e.target.value))}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {models.map((m) => (
              <Toggle
                key={m}
                label={prettyName(m)}
                active={selected.has(m)}
                swatch={colorFor(m)}
                onClick={() => toggleModel(m)}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Metrics" subtitle={`${split} split · +${horizon} min`} />
        <Table
          columns={metricColumns()}
          rows={filteredMetrics}
          rowKey={(r) => `${r.model}-${r.horizon}`}
        />
      </Card>
    </main>
  );
}
