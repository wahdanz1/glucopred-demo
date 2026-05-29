import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({ icon, children, className = "", ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
