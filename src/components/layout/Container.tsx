import { clsx } from "clsx";
import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** Render as a different element, e.g. "section" or "nav". @default "div" */
  as?: "div" | "section" | "nav" | "header" | "footer";
}

/**
 * Centralized max-width + gutter wrapper. Every top-level section should
 * use this instead of hardcoding `max-w-*`/`px-*` inline, so container
 * width stays a single decision (see docs/DESIGN-SYSTEM.md).
 */
export function Container({ children, className, as: As = "div" }: ContainerProps) {
  return <As className={clsx("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</As>;
}
