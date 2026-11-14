/**
 * A pen-tool curve between sections: the path, its square anchor points and the Bézier handles with round ends,
 * in the same language as the pen nib in Kero's logo. Static SVG, decorative only.
 */
export function BezierDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div aria-hidden className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <svg viewBox="0 0 1200 90" className={`bezier-divider ${flip ? "-scale-x-100" : ""}`} preserveAspectRatio="none">
        <path className="bezier-divider__curve" d="M0 45 C 260 5, 440 85, 600 45 S 940 5, 1200 45" vectorEffect="non-scaling-stroke" />
        {/* Handles of the middle anchor */}
        <line className="bezier-divider__handle" x1="440" y1="85" x2="760" y2="5" vectorEffect="non-scaling-stroke" />
        <circle className="bezier-divider__knob" cx="440" cy="85" r="5" />
        <circle className="bezier-divider__knob" cx="760" cy="5" r="5" />
        {/* Anchor points */}
        <rect className="bezier-divider__anchor" x="-6" y="39" width="12" height="12" />
        <rect className="bezier-divider__anchor bezier-divider__anchor--active" x="594" y="39" width="12" height="12" />
        <rect className="bezier-divider__anchor" x="1194" y="39" width="12" height="12" />
      </svg>
    </div>
  );
}
