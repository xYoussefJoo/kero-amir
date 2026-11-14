"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO_PIECES, LOGO_VIEWBOX } from "./logo-pieces";
import { ASSEMBLE, POP_AT, SCATTER } from "./scatter";

// Logo height in scene units: with the camera below and the canvas at 160% of the box, this matches the 2D size.
const WORLD_HEIGHT = 3.55;
const SCALE = WORLD_HEIGHT / LOGO_VIEWBOX.height;
const DEPTH = 70; // extrusion depth in viewBox units
const DEG = Math.PI / 180;

const COLORS = {
  orange: "#FF6535",
  blue: "#2546EB",
  blueLight: "#2546EB",
  creamDark: "#F4F0E7", // on the dark theme
  creamLight: "#0E1120", // cream parts turn ink on the cream background
} as const;

/** Overshoots then settles, like a piece clicking into place. */
const easeOutBack = (x: number) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function useTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** One extruded geometry per piece, centred on the piece so it rotates around itself. */
function usePieceGeometries() {
  return useMemo(() => {
    const loader = new SVGLoader();
    return LOGO_PIECES.map((piece) => {
      const data = loader.parse(
        `<svg xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${piece.d}"/></svg>`,
      );
      const shapes = data.paths.flatMap((path) => path.toShapes());
      const geometry = new THREE.ExtrudeGeometry(shapes, {
        depth: DEPTH,
        curveSegments: 8,
        bevelEnabled: true,
        bevelThickness: 10,
        bevelSize: 5,
        bevelSegments: 3,
      });
      geometry.translate(-piece.cx, -piece.cy, -DEPTH / 2);
      return geometry;
    });
  }, []);
}

function Logo({ theme }: { theme: "light" | "dark" }) {
  const geometries = usePieceGeometries();
  const root = useRef<THREE.Group>(null);
  const pieces = useRef<(THREE.Mesh | null)[]>([]);
  const start = useRef<number | null>(null);

  const materials = useMemo(
    () => ({
      orange: new THREE.MeshStandardMaterial({ color: COLORS.orange, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide }),
      blue: new THREE.MeshStandardMaterial({ color: COLORS.blue, roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide }),
      cream: new THREE.MeshStandardMaterial({ color: COLORS.creamLight, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide }),
    }),
    [],
  );

  useEffect(() => {
    materials.cream.color.set(theme === "dark" ? COLORS.creamDark : COLORS.creamLight);
  }, [theme, materials]);

  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
    },
    [geometries, materials],
  );

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    start.current ??= now;
    const t = now - start.current;

    // 1. Assemble: each piece flies from its scatter point and snaps in.
    LOGO_PIECES.forEach((piece, i) => {
      const mesh = pieces.current[i];
      if (!mesh) return;
      const s = SCATTER[i];
      const p = clamp01((t - s.delay) / ASSEMBLE.pieceDuration);
      const e = easeOutBack(p);
      const away = 1 - e;
      mesh.position.set(
        piece.cx - LOGO_VIEWBOX.width / 2 + s.dx * away,
        piece.cy - LOGO_VIEWBOX.height / 2 + s.dy * away,
        s.dz * away,
      );
      mesh.rotation.set(s.tiltX * DEG * away, s.tiltY * DEG * away, s.rotate * DEG * away);
      mesh.scale.setScalar(0.55 + 0.45 * Math.min(1, e));
      mesh.visible = p > 0;
    });

    if (!root.current) return;

    // 2. Pop: once assembled, the K jumps toward the viewer and settles (damped spring).
    const k = Math.max(0, t - POP_AT);
    const pop = k > 0 ? Math.sin(k * 9) * Math.exp(-k * 4.2) : 0;
    root.current.scale.set(SCALE * (1 + pop * 0.16), -SCALE * (1 + pop * 0.16), SCALE * (1 + pop * 0.16));
    root.current.position.z = pop * 0.9;

    // 3. Idle: tilt toward the pointer and float gently.
    const assembled = clamp01((t - POP_AT) / 0.8);
    const targetY = state.pointer.x * 0.45 * assembled;
    const targetX = -state.pointer.y * 0.3 * assembled;
    root.current.rotation.y += (targetY - root.current.rotation.y) * 0.08;
    root.current.rotation.x += (targetX - root.current.rotation.x) * 0.08;
    root.current.position.y = Math.sin(now * 1.1) * 0.06 * assembled;
  });

  return (
    // y is flipped: SVG y grows down, three.js y grows up.
    <group ref={root} scale={[SCALE, -SCALE, SCALE]}>
      {LOGO_PIECES.map((piece, i) => (
        <mesh
          key={piece.id}
          ref={(m) => {
            pieces.current[i] = m;
          }}
          geometry={geometries[i]}
          material={piece.color === "orange" ? materials.orange : piece.color === "cream" ? materials.cream : materials.blue}
          visible={false}
        />
      ))}
    </group>
  );
}

/** The 3D puzzle K. Loaded only on capable desktops (see HeroLogo). Stops rendering when off-screen. */
export default function PuzzleLogo3D({ onReady }: { onReady?: () => void }) {
  const theme = useTheme();
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="absolute inset-0">
      <Canvas
        frameloop={visible ? "always" : "never"}
        // flat = no tone mapping, so brand colors render exactly (#FF6535, #2546EB).
        flat
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 9], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => onReady?.()}
        aria-hidden
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[-4, 5, 6]} intensity={2.4} />
        <directionalLight position={[5, -2, 4]} intensity={0.6} />
        {/* Orange rim light from behind: the "glow" when the K pops. */}
        <pointLight position={[0, 0, -2.5]} intensity={18} distance={9} color={COLORS.orange} />
        <Logo theme={theme} />
      </Canvas>
    </div>
  );
}
