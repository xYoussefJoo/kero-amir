"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-scrubbed pencil line: writes --progress (0..1) on the list as it passes the reading line (60% down the
 * viewport) and marks each [data-node] as reached once the pencil passes it. Reversible on scroll up.
 * One passive scroll listener, throttled to animation frames; idle when the list is off-screen.
 */
export function JourneyLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--progress", "1");
      el.querySelectorAll("[data-node]").forEach((n) => n.setAttribute("data-reached", "true"));
      return;
    }

    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const box = el.getBoundingClientRect();
      const readingLine = window.innerHeight * 0.6;
      const progress = Math.min(1, Math.max(0, (readingLine - box.top) / box.height));
      el.style.setProperty("--progress", progress.toFixed(4));
      const pencilY = box.top + progress * box.height;
      el.querySelectorAll<HTMLElement>("[data-node]").forEach((node) => {
        node.setAttribute("data-reached", String(node.getBoundingClientRect().top <= pencilY));
      });
    };
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) onScroll();
    });
    observer.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <ol ref={ref} className={`journey ${className}`}>
      <li aria-hidden className="journey__track">
        <span className="journey__ink" />
        <span className="journey__pencil" />
      </li>
      {children}
    </ol>
  );
}
