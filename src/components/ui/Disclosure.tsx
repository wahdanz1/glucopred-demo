import type { ReactNode } from "react";
import { FaChevronRight } from "react-icons/fa6";

interface DisclosureProps {
  summary: string;
  children: ReactNode;
}

export function Disclosure({ summary, children }: DisclosureProps) {
  return (
    <details className="group rounded-md border border-border bg-muted px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <FaChevronRight
          size={11}
          className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="mt-2 pl-5 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}
