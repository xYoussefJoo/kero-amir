import type { CSSProperties } from "react";

/** Deterministic pseudo-random in [0, 1): server and client agree, so no hydration mismatch. */
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * CSS variables that place a piece "scattered" before its section assembles: pushed out in a seeded direction,
 * twisted, and delayed by its index so pieces snap in one after another (see .pz-piece in globals.css).
 */
export function pieceStyle(index: number, seed = 0, spread = 1): CSSProperties {
  const s = index * 7 + seed * 31 + 1;
  const angle = rand(s) * Math.PI * 2;
  const distance = (40 + rand(s + 3) * 50) * spread;
  return {
    "--dx": `${Math.round(Math.cos(angle) * distance)}px`,
    "--dy": `${Math.round(Math.sin(angle) * distance)}px`,
    "--r": `${Math.round((rand(s + 5) - 0.5) * 16)}deg`,
    "--d": `${(index * 0.05).toFixed(2)}s`,
  } as CSSProperties;
}
