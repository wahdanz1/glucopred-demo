import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "./components/ui/Card";
import { Field } from "./components/ui/Field";
import { Input } from "./components/ui/Input";
import { Select } from "./components/ui/Select";
import { Toggle } from "./components/ui/Toggle";
import { Table, type Column } from "./components/ui/Table";
import { Banner } from "./components/ui/Banner";
import { PredictionChart } from "./components/PredictionChart";
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

const WINDOW_HOURS = 24;

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
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [points, setPoints] = useState<PredictionPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [allModels, range] = await Promise.all([
          fetchModels(),
          fetchRange(split),
        ]);
        setModels(allModels);
        setSelected(new Set(allModels));
        setStart(shiftHours(range.end, -WINDOW_HOURS));
        setEnd(toDatetimeLocalValue(range.end));
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
          <strong>Synthetic demo data</strong> — not real patient data. Generated to
          demonstrate the app; the numbers carry no clinical meaning.
        </Banner>
      )}
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-medium text-foreground">GlucoPred</h1>
        <p className="text-sm text-muted-foreground">
          Actual vs predicted glucose over time
        </p>
      </header>

      <Card>
        <CardHeader title="Filters" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
          <Field label="From">
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
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
      </Card>

      <Card>
        <CardHeader
          title="Predictions vs actual"
          subtitle={loading ? "loading…" : `${points.length} points`}
        />
        {error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <PredictionChart
            points={points}
            models={Array.from(selected)}
            horizon={horizon}
          />
        )}
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
