import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-base">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
