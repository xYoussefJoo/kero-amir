import { pieceStyle } from "./scatter";

/** "02 // ABOUT" label + display title, both assembling like puzzle pieces. */
export function SectionHeader({ label, title, intro }: { label: string; title: string; intro?: string }) {
  return (
    <header className="flex max-w-3xl flex-col gap-4">
      <p className="pz-piece type-label" style={pieceStyle(0, 1)}>
        {label}
      </p>
      <h2 className="pz-piece type-h2" style={pieceStyle(1, 1)}>
        {title}
      </h2>
      {intro && (
        <p className="pz-piece type-lead" style={pieceStyle(2, 1)}>
          {intro}
        </p>
      )}
    </header>
  );
}
