"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Behaviour for the server-rendered header (the markup stays on the server, this adds the "smart" parts):
 * - hides while scrolling down, returns on scroll up (never while the hero K is flying into the logo slot);
 * - "scrolled" glass state, a reading-progress bar (--progress), and the active section link (aria-current);
 * - mobile menu open/close (Escape, link tap).
 * All updates are attribute / CSS-variable writes in one rAF-throttled scroll handler: no React re-render per scroll.
 */
export function SmartNav({ children, menuLabel, closeLabel }: { children: ReactNode; menuLabel: string; closeLabel: string }) {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty("--progress", max > 0 ? (y / max).toFixed(4) : "0");
      header.dataset.scrolled = String(y > 24);
      const logoFlying = document.documentElement.dataset.logo === "flying";
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > 160 && !logoFlying) header.dataset.hidden = "true";
      else if (goingUp || y <= 160 || logoFlying) header.dataset.hidden = "false";
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Active section: the one crossing the upper third of the viewport.
    const links = new Map<string, HTMLElement>();
    header.querySelectorAll<HTMLElement>("[data-section]").forEach((a) => links.set(a.dataset.section!, a));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          links.forEach((a, id) => (id === entry.target.id ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
        }
      },
      { rootMargin: "-30% 0px -65% 0px" },
    );
    links.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      ref={ref}
      className="smart-nav"
      data-open={open}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-section]")) setOpen(false);
      }}
    >
      {children}
      <button
        type="button"
        className="smart-nav__toggle"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? closeLabel : menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden className="smart-nav__burger" />
      </button>
      <span aria-hidden className="smart-nav__progress" />
    </header>
  );
}
