"use client";

import { useRef, type ReactNode } from "react";

/**
 * Leans its child toward the pointer (3D tilt + small pull) and springs back on leave, like the hero's magnet.
 * Writes two CSS variables per animation frame; the transform itself is CSS (see .pz-tilt in globals.css).
 * Ignored on touch devices and with reduced motion.
 */
export function MagneticTilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const box = el.getBoundingClientRect();
      el.style.setProperty("--mx", (((clientX - box.left) / box.width) * 2 - 1).toFixed(3));
      el.style.setProperty("--my", (((clientY - box.top) / box.height) * 2 - 1).toFixed(3));
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    ref.current?.style.setProperty("--mx", "0");
    ref.current?.style.setProperty("--my", "0");
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`pz-tilt ${className}`}>
      {children}
    </div>
  );
}
