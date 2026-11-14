"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * The hero's pattern for every section: children marked `.pz-piece` start scattered and snap together the first time
 * the section scrolls into view, then stay assembled (calm: no re-scatter on every pass).
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
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let assembled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // data-visible: lets looping animations (orbit) pause off-screen.
        el.setAttribute("data-visible", String(entry.isIntersecting));
        // data-assembled: false only until the first time the section is seen; then it stays assembled.
        if (reduced || assembled) return;
        assembled = entry.isIntersecting;
        el.setAttribute("data-assembled", String(entry.isIntersecting));
      },
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
