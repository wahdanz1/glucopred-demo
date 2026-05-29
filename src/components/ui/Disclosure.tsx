import { useState, type ReactNode } from "react";
import { FaChevronDown } from "react-icons/fa6";

interface DisclosureProps {
  summary: string;
  children: ReactNode;
  /** Initial open state. Component remains togglable - users can collapse it. */
  defaultOpen?: boolean;
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group rounded-md border border-border bg-card"
    >
      <summary className="group/sum flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-5 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted/40 group-open:rounded-b-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-grid h-5 w-5 place-items-center rounded-sm border border-primary font-mono text-[12px] font-semibold text-primary"
          >
            ?
          </span>
          {summary}
        </span>
        <span className="flex items-center gap-1.5 text-primary">
          <span className="cal hidden text-primary group-open:inline">Hide</span>
          <span className="cal text-primary group-open:hidden">Read</span>
          <FaChevronDown
            size={11}
            className="shrink-0 transition-transform duration-300 ease-out group-open:rotate-180"
          />
        </span>
      </summary>
      <div className="border-t border-border px-5 pb-5 pt-4 text-sm text-muted-foreground">
        {children}
      </div>
    </details>
  );
}
