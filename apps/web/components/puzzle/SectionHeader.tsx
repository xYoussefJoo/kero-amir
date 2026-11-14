import { pieceStyle } from "./scatter";

/** "02 // ABOUT" label + display title, both assembling like puzzle pieces. */
export function SectionHeader({ label, title, intro }: { label: string; title: string; intro?: string }) {
  return (
    <header className="flex max-w-3xl flex-col gap-4">
      <p className="pz-piece font-mono text-xs tracking-[0.2em] text-muted" style={pieceStyle(0, 1)}>
        {label}
      </p>
      <h2 className="pz-piece font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl" style={pieceStyle(1, 1)}>
        {title}
      </h2>
      {intro && (
        <p className="pz-piece max-w-2xl text-lg text-muted" style={pieceStyle(2, 1)}>
          {intro}
        </p>
      )}
    </header>
  );
}
