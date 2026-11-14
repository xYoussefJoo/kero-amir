"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * The hero's pattern for every section: children marked `.pz-piece` sit scattered while the section is away
 * and snap together when it scrolls into view; scrolling away scatters them again (reversible).
 * Without JS (or before hydration) everything is simply assembled, so content is never hidden from crawlers.
 */
export function PuzzleAssemble({
  as: Tag = "div",
  id,
  className,
  children,
  threshold = 0.25,
}: {
  as?: ElementType;
  id?: string;
  className?: string;
  children: ReactNode;
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => el.setAttribute("data-assembled", String(entry.isIntersecting)),
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
