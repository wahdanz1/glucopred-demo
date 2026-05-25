import {
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
import { colorFor, prettyName } from "../lib/models";

interface PredictionChartProps {
  points: PredictionPoint[];
  models: string[];
  horizon: number;
}

const TIR_LOW = 3.9;
const TIR_HIGH = 10.0;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function PredictionChart({ points, models, horizon }: PredictionChartProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        No data in this range.
      </div>
    );
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 11 }}
            minTickGap={48}
          />
          <YAxis
            domain={["auto", "auto"]}
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
            labelFormatter={(v) => new Date(v).toLocaleString()}
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
