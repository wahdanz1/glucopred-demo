import type { ReactNode } from "react";

interface BannerProps {
  children: ReactNode;
}

export function Banner({ children }: BannerProps) {
  return (
    <div className="rounded-md border border-border border-l-4 border-l-accent bg-muted px-4 py-2 text-sm text-foreground">
      {children}
    </div>
  );
}
