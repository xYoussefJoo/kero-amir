"use client";
/* eslint-disable react-hooks/immutability --
   three.js scene objects (meshes, materials, camera, springs) are mutated in useFrame by design: per-frame updates
   must not go through React state (that would re-render 60x per second). */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { LOGO_PIECES, LOGO_VIEWBOX } from "./logo-pieces";
import { ASSEMBLE, POP_AT, SCATTER } from "./scatter";

const DEPTH = 70; // extrusion depth, viewBox units
const DEG = Math.PI / 180;
const FOV = 35;
const CAMERA_Z = 12;

const COLORS = {
  orange: "#FF6535",
  blue: "#2546EB",
  creamDark: "#F4F0E7",
  creamLight: "#0E1120",
} as const;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Overshoots then settles, like a piece clicking into place. */
const easeOutBack = (x: number) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

type Theme = "light" | "dark";

function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** One extruded, bevelled geometry per piece, centred on the piece so it spins around itself. */
function usePieceGeometries() {
  return useMemo(() => {
    const loader = new SVGLoader();
    return LOGO_PIECES.map((piece) => {
      const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${piece.d}"/></svg>`);
      const geometry = new THREE.ExtrudeGeometry(data.paths.flatMap((p) => p.toShapes()), {
        depth: DEPTH, curveSegments: 10, bevelEnabled: true, bevelThickness: 12, bevelSize: 6, bevelSegments: 4,
      });
      geometry.translate(-piece.cx, -piece.cy, -DEPTH / 2);
      return geometry;
    });
  }, []);
}

/** Studio reflections from a procedural room: no HDR file to download. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    // Enough for glossy highlights, low enough that brand colors stay true (no tone mapping, see flat).
    scene.environmentIntensity = 0.45;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/** Per-piece state: spring offset (scroll / magnet / burst), snap flash, and landing flags. */
type Spring = { pos: THREE.Vector3; vel: THREE.Vector3; flashAt: number; introLanded: boolean; returning: boolean };

type Props = {
  /** The hero box the logo sits in; the full-screen canvas aligns the K to it every frame. */
  anchor: RefObject<HTMLElement | null>;
  theme: Theme;
};

function Logo({ anchor, theme }: Props) {
  const geometries = usePieceGeometries();
  const root = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const start = useRef<number | null>(null);
  const burstAt = useRef(-Infinity);
  const burstHandled = useRef(-Infinity);
  const { camera, size, pointer } = useThree();

  // One material per piece so each can flash on its own when it snaps in.
  const materials = useMemo(
    () => LOGO_PIECES.map((piece) => new THREE.MeshPhysicalMaterial({
      color: piece.color === "orange" ? COLORS.orange : piece.color === "cream" ? COLORS.creamLight : COLORS.blue,
      roughness: piece.color === "cream" ? 0.38 : 0.3,
      metalness: 0.05,
      clearcoat: 0.8,
      clearcoatRoughness: 0.18,
      emissive: new THREE.Color(COLORS.orange),
      emissiveIntensity: 0,
      side: THREE.DoubleSide,
    })),
    [],
  );

  const springs = useMemo<Spring[]>(
    () => LOGO_PIECES.map(() => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), flashAt: -Infinity, introLanded: false, returning: false })),
    [],
  );

  useEffect(() => {
    LOGO_PIECES.forEach((piece, i) => {
      if (piece.color === "cream") materials[i].color.set(theme === "dark" ? COLORS.creamDark : COLORS.creamLight);
    });
  }, [theme, materials]);

  useEffect(() => () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }, [geometries, materials]);

  // Click on the logo box: burst the K apart; the springs snap it back together.
  useEffect(() => {
    const el = anchor.current;
    if (!el) return;
    const onClick = () => { burstAt.current = performance.now() / 1000; };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [anchor]);

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), target: new THREE.Vector3() }), []);

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const now = state.clock.elapsedTime;
    const startedAt = (start.current ??= now);
    const t = now - startedAt;
    const box = anchor.current?.getBoundingClientRect();
    if (!root.current || !box) return;

    // ---- Align: world units per CSS pixel at z = 0, then place and size the K over its hero box.
    const worldPerPx = (2 * CAMERA_Z * Math.tan((FOV / 2) * DEG)) / size.height;
    const scale = (box.height * worldPerPx) / LOGO_VIEWBOX.height;
    const baseX = (box.left + box.width / 2 - size.width / 2) * worldPerPx;
    const baseY = -(box.top + box.height / 2 - size.height / 2) * worldPerPx;

    // ---- Scroll: 0 while the hero is in place, 1 once it has scrolled about a box height up.
    const scroll = clamp01(-box.top / (box.height * 1.1) + 0.15);
    const explode = scroll * scroll;

    // ---- Pointer in logo space (viewBox units), for the magnet effect.
    const pointerX = ((pointer.x * size.width) / 2) * worldPerPx;
    const pointerY = ((pointer.y * size.height) / 2) * worldPerPx;
    const localPX = (pointerX - baseX) / scale + LOGO_VIEWBOX.width / 2;
    const localPY = -(pointerY - baseY) / scale + LOGO_VIEWBOX.height / 2;

    // A click is applied exactly once (one impulse), however many frames follow it.
    const burstNow = burstAt.current > burstHandled.current;
    burstHandled.current = burstAt.current;

    LOGO_PIECES.forEach((piece, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const s = SCATTER[i];
      const spring = springs[i];

      // 1. Intro: fly in from deep in the scene along a curve, snap with an overshoot.
      const p = clamp01((t - s.delay) / ASSEMBLE.pieceDuration);
      const e = easeOutBack(p);
      const away = 1 - e;
      const swirl = Math.sin(p * Math.PI) * (1 - p);
      if (p >= 1 && !spring.introLanded) {
        spring.introLanded = true;
        // The "click": dated to the scheduled landing, so a late or dropped frame never shows a stale flash.
        spring.flashAt = startedAt + s.delay + ASSEMBLE.pieceDuration;
      }

      // 2. Scroll explode + 3. magnet + 4. click burst all move a spring target; the spring smooths everything.
      tmp.target.set(s.dx * explode * 1.4, s.dy * explode * 1.4, s.dz * explode * 1.6);
      const dx = piece.cx - localPX;
      const dy = piece.cy - localPY;
      const dist = Math.hypot(dx, dy);
      const reach = 520;
      if (dist < reach && p >= 1 && explode < 0.05) {
        const push = (1 - dist / reach) ** 2 * 110;
        tmp.target.x += (dx / (dist || 1)) * push;
        tmp.target.y += (dy / (dist || 1)) * push;
        tmp.target.z += push * 1.6;
      }
      if (burstNow) {
        spring.vel.x += s.dx * 4.2;
        spring.vel.y += s.dy * 4.2;
        spring.vel.z += s.dz * 3.5;
        spring.returning = true; // flash again when it lands
      }

      // Damped spring toward the target (stiffness, damping tuned for a snappy settle).
      tmp.v.copy(tmp.target).sub(spring.pos).multiplyScalar(90).addScaledVector(spring.vel, -13);
      spring.vel.addScaledVector(tmp.v, dt);
      spring.pos.addScaledVector(spring.vel, dt);
      if (spring.returning && spring.pos.lengthSq() < 400 && spring.vel.lengthSq() < 4000) {
        spring.returning = false;
        spring.flashAt = now;
      }

      const offset = spring.pos;
      mesh.position.set(
        piece.cx - LOGO_VIEWBOX.width / 2 + s.dx * away + s.dy * swirl * 0.35 + offset.x,
        piece.cy - LOGO_VIEWBOX.height / 2 + s.dy * away - s.dx * swirl * 0.35 + offset.y,
        -s.dz * 1.8 * away + offset.z,
      );
      const spin = away + explode * 0.9 + Math.min(1, offset.length() / 600) * 0.4;
      mesh.rotation.set(s.tiltX * DEG * spin, s.tiltY * DEG * spin, s.rotate * DEG * spin);
      mesh.scale.setScalar(0.6 + 0.4 * Math.min(1, e));
      mesh.visible = p > 0;

      // Snap flash: a quick orange glow on the piece that just locked in. Timed by the clock, not by frames,
      // so it fades in 0.35 s at any frame rate.
      const flash = clamp01(1 - (now - spring.flashAt) / 0.35);
      materials[i].emissiveIntensity = flash * flash * 0.9;
    });

    // ---- Pop: once assembled, the whole K punches toward the viewer and settles (damped spring).
    const k = Math.max(0, t - POP_AT);
    const pop = k > 0 ? Math.sin(k * 9) * Math.exp(-k * 4) : 0;
    const s = scale * (1 + pop * 0.18);
    root.current.scale.set(s, -s, s);

    // Intro dolly: the K travels in from depth while the pieces assemble.
    const intro = easeOutCubic(clamp01(t / (POP_AT + 0.2)));
    const float = Math.sin(now * 1.1) * 0.05 * clamp01(k);
    root.current.position.set(baseX, baseY + float, -3 * (1 - intro) + pop * 0.8);

    // Idle tilt toward the pointer; a small kick on the pop.
    const settled = clamp01(k / 0.8) * (1 - explode);
    const targetY = pointer.x * 0.4 * settled + pop * 0.15;
    const targetX = -pointer.y * 0.28 * settled;
    root.current.rotation.y += (targetY - root.current.rotation.y) * 0.08;
    root.current.rotation.x += (targetX - root.current.rotation.x) * 0.08;
    root.current.rotation.z = (1 - intro) * -0.35;

    // Tiny camera shake on impact.
    camera.position.x = pop * 0.05 * Math.sin(now * 60);
    camera.position.y = pop * 0.05 * Math.cos(now * 55);
  });

  return (
    <group ref={root}>
      {LOGO_PIECES.map((piece, i) => (
        <mesh
          key={piece.id}
          ref={(m) => { meshes.current[i] = m; }}
          geometry={geometries[i]}
          material={materials[i]}
          visible={false}
        />
      ))}
    </group>
  );
}

/**
 * The 3D puzzle K on a full-screen, fixed, click-through canvas, aligned every frame to its hero box (`anchor`),
 * so pieces can fly anywhere on screen. Loaded only on capable desktops (see HeroLogo). Stops rendering when the
 * hero is off-screen.
 */
export default function PuzzleLogo3D({ anchor, onReady }: { anchor: RefObject<HTMLElement | null>; onReady?: () => void }) {
  const theme = useTheme();
  const [active, setActive] = useState(true);
  // Client-only component (loaded with ssr: false), so document is always available here.
  const [eventSource] = useState<HTMLElement>(() => document.body);

  useEffect(() => {
    const el = anchor.current?.closest("section") ?? anchor.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchor]);

  return (
    // Hidden while paused: a frozen last frame (pieces mid-flight) must never sit over the sections below.
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-10 ${active ? "visible" : "invisible"}`}>
      <Canvas
        frameloop={active ? "always" : "never"}
        // flat = no tone mapping, so brand colors render exactly.
        flat
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, CAMERA_Z], fov: FOV }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        // Pointer events come from the whole page, so the canvas never blocks clicks on the hero.
        eventSource={eventSource}
        eventPrefix="client"
        onCreated={() => onReady?.()}
      >
        <StudioEnvironment />
        <ambientLight intensity={0.2} />
        <directionalLight position={[-4, 6, 8]} intensity={1.6} />
        {/* Orange rim light from behind. */}
        <pointLight position={[2, 1, -4]} intensity={40} distance={14} color={COLORS.orange} />
        <Logo anchor={anchor} theme={theme} />
      </Canvas>
    </div>
  );
}
