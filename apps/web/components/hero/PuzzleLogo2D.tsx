import type { CSSProperties } from "react";
import { LOGO_PIECES, LOGO_VIEWBOX } from "./logo-pieces";
import { ASSEMBLE, POP_AT, SCATTER } from "./scatter";

/**
 * The K as SVG puzzle pieces that fly in, snap together, then pop out. Pure SVG + CSS: no JavaScript.
 * Animations start paused and play once HeroLogo sets data-play on the wrapper (so the 3D version can take over
 * on strong desktops without the 2D one having already played).
 */
export function PuzzleLogo2D({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      role="img"
      aria-label="Kero Amir logo"
      className={`puzzle-logo overflow-visible ${className}`}
      style={{ "--pop-at": `${POP_AT}s` } as CSSProperties}
    >
      <g className="puzzle-logo__pop">
        {LOGO_PIECES.map((piece, i) => {
          const s = SCATTER[i];
          return (
            <path
              key={piece.id}
              d={piece.d}
              fillRule="evenodd"
              className={`puzzle-logo__piece puzzle-logo__piece--${piece.color}`}
              style={
                {
                  "--dx": `${s.dx}px`,
                  "--dy": `${s.dy}px`,
                  "--r": `${s.rotate}deg`,
                  "--delay": `${s.delay}s`,
                  "--duration": `${ASSEMBLE.pieceDuration}s`,
                  transformOrigin: `${piece.cx}px ${piece.cy}px`,
                } as CSSProperties
              }
            />
          );
        })}
      </g>
    </svg>
  );
}
