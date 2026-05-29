import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  align?: "center" | "start" | "end";
}

/**
 * Portal-rendered tooltip. The popover lives on `document.body`, positioned
 * from the trigger's bounding rect, so it can never be clipped by an
 * ancestor's overflow (notably tables wrapped in overflow-x-auto, which the
 * CSS spec implicitly forces overflow-y on as well).
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, transform: "" });

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    let left: number;
    let xTransform: string;
    if (align === "center") {
      left = r.left + r.width / 2;
      xTransform = "translateX(-50%)";
    } else if (align === "end") {
      left = r.right;
      xTransform = "translateX(-100%)";
    } else {
      left = r.left;
      xTransform = "";
    }
    const top = side === "top" ? r.top - gap : r.bottom + gap;
    const yTransform = side === "top" ? "translateY(-100%)" : "";
    setPos({
      left,
      top,
      transform: `${xTransform} ${yTransform}`.trim(),
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-block cursor-help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </span>
      {open &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-50 w-max max-w-[260px] rounded-md border border-border bg-background px-3 py-2 text-xs font-normal normal-case tracking-normal text-foreground shadow-lg"
            style={{
              left: pos.left,
              top: pos.top,
              transform: pos.transform,
            }}
          >
            {content}
          </span>,
          document.body,
        )}
    </>
  );
}
