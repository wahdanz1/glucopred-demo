import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input(props: InputProps) {
  return (
    <input
      className="h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground focus:border-primary focus:outline-none"
      {...props}
    />
  );
}
