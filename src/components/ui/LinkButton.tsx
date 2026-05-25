import type { ReactNode } from "react";

interface LinkButtonProps {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function LinkButton({ href, icon, children }: LinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground transition hover:border-primary"
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}
