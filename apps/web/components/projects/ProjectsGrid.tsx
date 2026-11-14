"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

export type GridItem = { id: string; categories: string[]; featured: boolean; card: ReactNode };

/**
 * Filter chips + bento grid. Cards are rendered on the server and passed in; this only filters them.
 * Changing the filter remounts the visible cards so they snap in again (CSS .project-snap).
 */
export function ProjectsGrid({ items, filters, allLabel, emptyLabel }: {
  items: GridItem[];
  filters: { slug: string; name: string }[];
  allLabel: string;
  emptyLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const visible = active ? items.filter((item) => item.categories.includes(active)) : items;

  return (
    <div className="flex flex-col gap-8">
      <div role="toolbar" aria-label={allLabel} className="flex flex-wrap gap-2">
        {[{ slug: null, name: allLabel }, ...filters].map((f) => (
          <button
            key={f.slug ?? "all"}
            type="button"
            aria-pressed={active === f.slug}
            onClick={() => setActive(f.slug)}
            className="project-chip"
          >
            {f.name}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted">{emptyLabel}</p>
      ) : (
        <ul key={active ?? "all"} className="project-grid">
          {visible.map((item, i) => (
            <li key={item.id} className={`project-snap ${item.featured ? "project-grid__featured" : ""}`} style={{ "--i": i } as CSSProperties}>
              {item.card}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
