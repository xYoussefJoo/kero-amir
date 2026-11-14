"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PuzzleLogo2D } from "./PuzzleLogo2D";
import { POP_AT } from "./scatter";

// three.js (~180 KB gzip) is only downloaded when the 3D version is chosen.
const PuzzleLogo3D = dynamic(() => import("./PuzzleLogo3D"), { ssr: false });

/** "fallback": started in 3D but this GPU was too slow; shows the finished 2D logo without replaying it. */
type Mode = "pending" | "2d" | "3d" | "fallback";

/** Remembered for the visit, so a slow GPU doesn't try 3D again on every page load. */
const SLOW_GPU_KEY = "kero:3d-too-slow";

/** Strong desktops get 3D (decision #5 in docs/brief.md); `?3d` forces it, `?2d` forces 2D. */
function chooseMode(): "2d" | "3d" {
  const params = new URLSearchParams(window.location.search);
  if (params.has("2d")) return "2d";
  if (params.has("3d")) return "3d";
  try {
    if (sessionStorage.getItem(SLOW_GPU_KEY)) return "2d";
  } catch {
    // storage blocked: just decide by device below
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return "2d";
  const desktop = matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return desktop && cores >= 6 && memory >= 4 && hasWebGL() ? "3d" : "2d";
}

function hasWebGL(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function HeroLogo() {
  const [mode, setMode] = useState<Mode>("pending");
  const [threeReady, setThreeReady] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Runs after hydration: decide once, client-side only (no server/client mismatch).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMode(chooseMode()), []);

  return (
    <div
      ref={box}
      className={`relative aspect-[1534/1856] w-full max-w-[22rem] lg:max-w-[26rem] ${mode === "3d" ? "cursor-pointer" : ""}`}
      data-play={mode === "2d" || (mode === "3d" && threeReady) ? "" : undefined}
      data-static={mode === "3d" || mode === "fallback" ? "" : undefined}
      title={mode === "3d" ? "Click me" : undefined}
      style={{ "--pop-at": `${POP_AT}s` } as CSSProperties}
    >
      <div aria-hidden className="hero-glow pointer-events-none absolute -inset-[20%] rounded-full" />

      {/* 2D: plays on phones / weak devices; on 3D devices it is the still placeholder until WebGL is ready. */}
      <PuzzleLogo2D
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
          mode === "pending" || (mode === "3d" && threeReady) ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* 3D: a full-screen, click-through canvas that aligns the K to this box every frame. */}
      {mode === "3d" && (
        <PuzzleLogo3D
          anchor={box}
          onReady={() => setThreeReady(true)}
          onSlow={() => {
            try {
              sessionStorage.setItem(SLOW_GPU_KEY, "1");
            } catch {
              // storage blocked: fall back for this page only
            }
            setMode("fallback");
          }}
        />
      )}
    </div>
  );
}
