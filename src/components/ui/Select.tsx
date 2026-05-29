import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { FaChevronDown } from "react-icons/fa6";
import { cn } from "../../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  /** Emits a synthetic event-shape so existing call sites that read
   *  `e.target.value` keep working without changes. */
  onChange: (event: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  // Close on click outside the trigger+menu cluster.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Place keyboard focus on the current value when opening.
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActive(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  const emit = (val: string) => onChange({ target: { value: val } });

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active >= 0 && active < options.length) {
        emit(options[active].value);
        setOpen(false);
        buttonRef.current?.focus();
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-block", className)}
      onKeyDown={onKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex h-10 w-fit min-w-[7rem] items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 text-base text-foreground transition-colors hover:border-foreground/30 focus:border-primary focus:outline-none disabled:opacity-50"
      >
        <span>{selected?.label ?? ""}</span>
        <FaChevronDown
          size={11}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-30 max-h-64 min-w-full origin-top animate-[selectMenuIn_180ms_ease-out] overflow-y-auto rounded-md border border-border bg-card py-1 shadow-lg shadow-background/40"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                // mousedown (not click) so we win over the document outside-click
                // handler that's also listening for mousedown.
                e.preventDefault();
                emit(o.value);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer whitespace-nowrap px-3 py-1.5 text-base",
                i === active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground",
                o.value === value && "font-medium text-foreground",
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
