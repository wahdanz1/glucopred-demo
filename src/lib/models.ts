export const MODEL_COLORS: Record<string, string> = {
  actual: "var(--color-actual)",
  ar_2: "var(--color-ar-2)",
  persistence: "var(--color-persistence)",
  moving_average_5: "var(--color-moving-average-5)",
  linear_extrapolation: "var(--color-linear-extrapolation)",
};

export function colorFor(model: string): string {
  return MODEL_COLORS[model] ?? "var(--color-muted-foreground)";
}

export function prettyName(model: string): string {
  return model
    .split("_")
    .map((p) => (p.length <= 2 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(" ");
}
