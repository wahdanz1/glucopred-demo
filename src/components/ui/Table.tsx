import type { ReactNode } from "react";

export interface Column<T> {
  key: keyof T | string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}

export function Table<T>({ columns, rows, rowKey }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm md:text-base">
        <thead>
          <tr className="cal border-b border-border text-left">
            {columns.map((c, i) => (
              <th
                key={String(c.key)}
                // First (left-aligned) column is sticky so model labels stay
                // visible when the user scrolls horizontally on narrow viewports.
                // Right-aligned numeric columns refuse to wrap; the left column
                // wraps naturally when squeezed.
                className={
                  c.align === "right"
                    ? "whitespace-nowrap py-2.5 pr-4 text-right"
                    : i === 0
                      ? "sticky left-0 z-10 bg-card py-2.5 pr-4"
                      : "py-2.5 pr-4"
                }
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border/60 last:border-0"
            >
              {columns.map((c, i) => {
                const value = c.render
                  ? c.render(row)
                  : ((row as Record<string, unknown>)[c.key as string] as ReactNode);
                return (
                  <td
                    key={String(c.key)}
                    className={
                      c.align === "right"
                        ? "whitespace-nowrap py-2.5 pr-4 text-right font-mono"
                        : i === 0
                          ? "sticky left-0 z-10 bg-card py-2.5 pr-4"
                          : "py-2.5 pr-4"
                    }
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
