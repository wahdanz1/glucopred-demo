import { cn } from "../../lib/cn";

interface ToggleProps {
  label: string;
  active: boolean;
  swatch?: string;
  onClick: () => void;
}

export function Toggle({ label, active, swatch, onClick }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition",
        active
          ? "border-primary bg-muted text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {swatch && (
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: swatch }}
        />
      )}
      <span>{label}</span>
    </button>
  );
}
