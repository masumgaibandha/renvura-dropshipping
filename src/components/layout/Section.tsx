import { clsx } from "clsx";
import type { ReactNode } from "react";

import { Container } from "./Container";

interface SectionProps {
  children: ReactNode;
  className?: string;
  /** Skip the built-in Container wrapper, e.g. for full-bleed backgrounds. */
  fullBleed?: boolean;
  containerClassName?: string;
}

/**
 * Consistent vertical rhythm between page sections. Centralizes the
 * "section spacing" scale from docs/DESIGN-SYSTEM.md instead of repeating
 * py-* values per section.
 */
export function Section({ children, className, fullBleed = false, containerClassName }: SectionProps) {
  const content = fullBleed ? children : <Container className={containerClassName}>{children}</Container>;

  return <section className={clsx("py-10 sm:py-14 lg:py-20", className)}>{content}</section>;
}
