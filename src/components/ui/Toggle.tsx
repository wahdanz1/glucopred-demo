import { FaCheck } from "react-icons/fa6";
import type { LineStyle } from "../../lib/models";
import { cn } from "../../lib/cn";

interface ToggleProps {
  label: string;
  active: boolean;
  swatch?: string;
  /** "multi" shows a colored checkbox (multi-select set); "single" shows a
   *  colored dot (radio-style choice). Default: single. Ignored when
   *  `lineStyle` is provided (the line preview takes over). */
  mode?: "single" | "multi";
  /** When provided + `swatch`, the chip becomes a chart-legend style: a small
   *  filled colored square. Active state uses a neutral lifted background;
   *  the colored swatch alone communicates model identity. */
  lineStyle?: LineStyle;
  /** "outline" (default): bordered chip, neutral lifted bg when active.
   *  "filled": segmented-style; active fills with the brand accent and dark
   *  text - used for the global Horizon segmented control. */
  variant?: "outline" | "filled";
  onClick: () => void;
}

export function Toggle({
  label,
  active,
  swatch,
  mode = "single",
  lineStyle,
  variant = "outline",
  onClick,
}: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm transition-colors",
        variant === "filled" && active
          ? "bg-primary font-semibold text-background"
          : active
            ? "bg-muted text-foreground"
            : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {lineStyle && swatch ? (
        // Colored square swatch - dimmed when chip is inactive so the active
        // chips read brighter without a per-model background tint.
        <span
          aria-hidden
          className={cn(
            "inline-block h-2.5 w-2.5 shrink-0 rounded-sm transition-opacity",
            !active && "opacity-50",
          )}
          style={{ background: swatch }}
        />
      ) : mode === "multi" && swatch ? (
        <span
          aria-hidden
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border-2"
          style={{
            borderColor: swatch,
            background: active ? swatch : "transparent",
          }}
        >
          {active && <FaCheck size={8} className="text-foreground" />}
        </span>
      ) : (
        swatch && (
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: swatch }}
          />
        )
      )}
      <span>{label}</span>
    </button>
  );
}
