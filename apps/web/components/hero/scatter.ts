import { LOGO_PIECES, LOGO_VIEWBOX } from "./logo-pieces";

/** Deterministic pseudo-random in [0, 1) so server and client agree (no hydration mismatch). */
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export type Scatter = {
  /** Start offset from the final position, in viewBox units. */
  dx: number;
  dy: number;
  /** Start depth for 3D (viewBox units, + is toward the viewer). */
  dz: number;
  /** Start rotation in degrees (2D) / radians are derived in 3D. */
  rotate: number;
  tiltX: number;
  tiltY: number;
  /** Seconds before this piece starts flying in. */
  delay: number;
};

export const ASSEMBLE = {
  /** Seconds each piece takes to fly in and snap. */
  pieceDuration: 0.9,
  /** Seconds between consecutive pieces starting. */
  stagger: 0.09,
} as const;

/** When the last piece has snapped and the K pops out. */
export const POP_AT = (LOGO_PIECES.length - 1) * ASSEMBLE.stagger + ASSEMBLE.pieceDuration;

/** Each piece starts pushed outward from the logo centre (like an exploded puzzle), with a random twist. */
export const SCATTER: readonly Scatter[] = LOGO_PIECES.map((piece, i) => {
  const cx = LOGO_VIEWBOX.width / 2;
  const cy = LOGO_VIEWBOX.height / 2;
  const angle = Math.atan2(piece.cy - cy, piece.cx - cx) + (rand(i + 1) - 0.5) * 0.9;
  const distance = 650 + rand(i + 11) * 550;
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance),
    dz: Math.round(300 + rand(i + 21) * 900),
    rotate: Math.round((rand(i + 31) - 0.5) * 160),
    tiltX: Math.round((rand(i + 41) - 0.5) * 140),
    tiltY: Math.round((rand(i + 51) - 0.5) * 140),
    delay: +(i * ASSEMBLE.stagger).toFixed(2),
  };
});
