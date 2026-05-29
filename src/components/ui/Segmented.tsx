import { useEffect, useState, useTransition } from "react";
import { cn } from "../../lib/cn";

interface SegmentedOption<V extends string | number> {
  value: V;
  label: string;
}

interface SegmentedProps<V extends string | number> {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel?: string;
}

/**
 * Segmented control with a sliding accent thumb that translates between the
 * active option. Updates its thumb position OPTIMISTICALLY on click via local
 * state, and wraps the parent `onChange` in `startTransition` so any heavy
 * downstream work (chart re-render, fetches) doesn't block the slide paint -
 * the thumb moves immediately, the data catches up.
 */
export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedProps<V>) {
  const [localValue, setLocalValue] = useState(value);
  const [, startTransition] = useTransition();

  // Stay in sync when the controlled value changes from outside (e.g. reset).
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === localValue),
  );

  const handleClick = (v: V) => {
    if (v === localValue) return;
    setLocalValue(v);                          // urgent - paint the thumb
    startTransition(() => onChange(v));        // deferred - heavy downstream
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative inline-grid auto-cols-fr grid-flow-col rounded-md border border-border bg-card p-1"
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-sm bg-primary transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((opt) => {
        const isActive = opt.value === localValue;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(opt.value)}
            className={cn(
              // No transition on text color - it should snap instantly on
              // click. Only the thumb behind slides; interpolating the text
              // colors caused a brief dark-gray midpoint that reads as
              // unreadable.
              "relative z-10 cursor-pointer rounded-sm px-3.5 py-1 font-mono text-sm tabular-nums",
              isActive
                ? "font-semibold text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
