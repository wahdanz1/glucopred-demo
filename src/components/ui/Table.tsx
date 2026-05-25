import type { ReactNode } from "react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
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
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th
                key={String(c.key)}
                className={c.align === "right" ? "py-2 pr-4 text-right" : "py-2 pr-4"}
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
              {columns.map((c) => {
                const value = c.render
                  ? c.render(row)
                  : ((row as Record<string, unknown>)[c.key as string] as ReactNode);
                return (
                  <td
                    key={String(c.key)}
                    className={
                      c.align === "right"
                        ? "py-2 pr-4 text-right font-mono"
                        : "py-2 pr-4"
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
