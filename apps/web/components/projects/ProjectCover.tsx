import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Card cover: the project's image when it has one, otherwise a branded cover in its accent color with puzzle-knob
 * shapes and its initials, so a grid without photos still looks designed (no stock or placeholder images).
 */
export function ProjectCover({ title, image, accent, priority }: {
  title: string;
  image?: string | null;
  accent?: string | null;
  priority?: boolean;
}) {
  if (image) {
    return (
      <Image src={image} alt="" fill priority={priority} sizes="(min-width: 1024px) 50vw, 100vw"
        className="project-card__img object-cover" />
    );
  }
  const initials = title.split(/[\s:]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div aria-hidden className="project-cover" style={{ "--accent-c": accent ?? "var(--primary)" } as CSSProperties}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="project-cover__shapes">
        <path d="M-20 210 H90 C90 180 110 165 130 165 C150 165 170 180 170 210 H280 V320 H-20 Z" />
        <path d="M250 -20 V70 C280 70 295 90 295 110 C295 130 280 150 250 150 V240 H430 V-20 Z" />
        <circle cx="330" cy="250" r="22" />
      </svg>
      <span className="project-cover__initials">{initials}</span>
    </div>
  );
}
