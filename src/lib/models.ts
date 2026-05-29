export const MODEL_COLORS: Record<string, string> = {
  actual: "var(--color-actual)",
  ar_2: "var(--color-ar-2)",
  persistence: "var(--color-persistence)",
  moving_average_5: "var(--color-moving-average-5)",
  linear_extrapolation: "var(--color-linear-extrapolation)",
  lstm: "var(--color-lstm)",
};

// Canonical display order across toggles, legends, tables, and accordions.
// Sorted ascending by model complexity so a reader scanning top-to-bottom sees
// the simplest baseline first and the trained network last.
export const MODEL_ORDER = [
  "persistence",
  "moving_average_5",
  "ar_2",
  "linear_extrapolation",
  "lstm",
];

export function sortModels<T>(items: T[], pick: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    const ai = MODEL_ORDER.indexOf(pick(a));
    const bi = MODEL_ORDER.indexOf(pick(b));
    if (ai === -1 && bi === -1) return pick(a).localeCompare(pick(b));
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function colorFor(model: string): string {
  return MODEL_COLORS[model] ?? "var(--color-muted-foreground)";
}

// Per-model line drawing style. Different dash patterns make the lines
// distinguishable even on a colorblind viewer or B&W printout, and let each
// toggle chip render the exact stroke that draws on the chart - so the chip
// doubles as a legend. LSTM gets the solid "hero" treatment.
export type LineStyle = { dash: string; width: number };

export const MODEL_LINE_STYLE: Record<string, LineStyle> = {
  actual: { dash: "0", width: 2 },
  persistence: { dash: "2 5", width: 1.4 },
  moving_average_5: { dash: "5 4", width: 1.5 },
  ar_2: { dash: "1 5", width: 1.4 },
  linear_extrapolation: { dash: "8 4", width: 1.6 },
  lstm: { dash: "0", width: 2.2 },
};

export function lineStyleFor(model: string): LineStyle {
  return MODEL_LINE_STYLE[model] ?? { dash: "4 3", width: 1.4 };
}

const PRETTY_OVERRIDES: Record<string, string> = {
  lstm: "LSTM",
};

export function prettyName(model: string): string {
  if (PRETTY_OVERRIDES[model]) return PRETTY_OVERRIDES[model];
  return model
    .split("_")
    .map((p) => (p.length <= 2 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(" ");
}
