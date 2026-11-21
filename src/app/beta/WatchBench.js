"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The watch I'm designing, case first: each CAD export turns slowly in
 * brushed steel, and you can drag it over to see the back.
 *
 * The meshes are the original STLs packed by scripts/pack-stl.mjs into a
 * small indexed format (16-bit positions), about a fifth of the size:
 *   u32 vertexCount · u32 triangleCount · f32[3] min · f32[3] max
 *   u16[vertexCount·3] positions (quantized to the box) · u16|u32 indices
 * three.js loads only when the tile is first on screen.
 */
export const CASES = [
  { id: "no1", label: "No.1", detail: "31.5 mm", src: "/beta/watch-no1.bin" },
  { id: "tonneau", label: "Tonneau", detail: "v3.2", src: "/beta/watch-tonneau.bin" },
];

async function loadCase(THREE, creased, src) {
  const buf = await (await fetch(src)).arrayBuffer();
  const dv = new DataView(buf);
  const nv = dv.getUint32(0, true);
  const nt = dv.getUint32(4, true);
  const min = [0, 1, 2].map((i) => dv.getFloat32(8 + i * 4, true));
  const max = [0, 1, 2].map((i) => dv.getFloat32(20 + i * 4, true));
  const q = new Uint16Array(buf, 32, nv * 3);
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < pos.length; i++) {
    const a = i % 3;
    pos[i] = min[a] + (q[i] / 65535) * (max[a] - min[a]) - (min[a] + max[a]) / 2;
  }
  const at = 32 + nv * 6;
  const index = nv > 65535 ? new Uint32Array(buf.slice(at, at + nt * 12)) : new Uint16Array(buf.slice(at, at + nt * 6));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  // keep the machined edges crisp and the curved flanks smooth
  return creased(geo, (35 * Math.PI) / 180);
}

export default function WatchBench() {
  const canvas = useRef(null);
  const api = useRef(null);
  const [current, setCurrent] = useState(CASES[0].id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    let alive = true;
    let cleanup = () => {};

    const start = async () => {
      const [THREE, { toCreasedNormals }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/utils/BufferGeometryUtils.js"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      if (!alive) return;

      const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.8;
      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
      const camera = new THREE.PerspectiveCamera(28, 1, 1, 1000);
      camera.position.set(0, 0, 92);
      const key = new THREE.DirectionalLight(0xfff1d6, 1.4);
      key.position.set(-30, 40, 60);
      scene.add(key);

      const steel = new THREE.MeshPhysicalMaterial({ color: 0xcfccc5, metalness: 1, roughness: 0.32, clearcoat: 0.2 });
      const turn = new THREE.Group();
      scene.add(turn);
      let mesh = null;
      const cache = {};

      const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const view = { yaw: -0.55, pitch: -0.32, vYaw: 0, vPitch: 0, drag: null, swap: 1 };
      let visible = false;
      let raf = 0;
      let last = performance.now();

      const size = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // wide tile: the case sits right of the copy; narrow: below it
        const wide = w / h > 1.05;
        camera.position.z = wide ? 120 : 148 / Math.min(1, w / h);
        turn.position.set(wide ? 13 : 0, wide ? -2 : -7, 0);
        camera.updateProjectionMatrix();
      };

      const frame = (now) => {
        raf = 0;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!view.drag) {
          view.yaw += view.vYaw * dt + (still ? 0 : 0.35 * dt);
          view.pitch += view.vPitch * dt;
          view.vYaw *= Math.pow(0.04, dt);
          view.vPitch *= Math.pow(0.04, dt);
          // drift back toward a flattering three-quarter tilt
          view.pitch += (-0.32 - view.pitch) * Math.min(1, dt * 1.5);
        }
        view.swap = Math.min(1, view.swap + dt * 3.5);
        const pop = 0.9 + 0.1 * (1 - Math.pow(1 - view.swap, 3));
        turn.rotation.set(view.pitch, view.yaw, 0, "YXZ");
        turn.scale.setScalar(pop);
        renderer.render(scene, camera);
        if (visible && !document.hidden) raf = requestAnimationFrame(frame);
      };
      const wake = () => {
        if (!raf && visible) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      };

      const show = async (id) => {
        const c = CASES.find((x) => x.id === id);
        cache[id] ??= loadCase(THREE, toCreasedNormals, c.src);
        const geo = await cache[id];
        if (!alive) return;
        if (mesh) turn.remove(mesh);
        mesh = new THREE.Mesh(geo, steel);
        turn.add(mesh);
        view.swap = 0;
        setReady(true);
        wake();
      };

      const down = (e) => {
        view.drag = { x: e.clientX, y: e.clientY, t: performance.now() };
        el.setPointerCapture?.(e.pointerId);
      };
      const move = (e) => {
        const d = view.drag;
        if (!d) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        const dtm = Math.max(1, performance.now() - d.t) / 1000;
        view.yaw += dx * 0.012;
        view.pitch = Math.max(-1.3, Math.min(1.3, view.pitch + dy * 0.008));
        view.vYaw = (dx * 0.012) / dtm;
        view.vPitch = (dy * 0.008) / dtm;
        view.drag = { x: e.clientX, y: e.clientY, t: performance.now() };
        wake();
      };
      const up = () => {
        view.drag = null;
        wake();
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);

      const io = new IntersectionObserver(([en]) => {
        visible = en.isIntersecting;
        wake();
      });
      io.observe(el);
      const ro = new ResizeObserver(() => {
        size();
        wake();
      });
      ro.observe(el);
      document.addEventListener("visibilitychange", wake);
      size();

      api.current = { show };
      show(CASES[0].id);

      cleanup = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", wake);
        el.removeEventListener("pointerdown", down);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        renderer.dispose();
        pmrem.dispose();
      };
    };

    // load three.js only once the tile is about to be seen
    const gate = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        gate.disconnect();
        start();
      },
      { rootMargin: "600px" },
    );
    gate.observe(el);
    return () => {
      alive = false;
      gate.disconnect();
      cleanup();
    };
  }, []);

  const pick = (id) => {
    setCurrent(id);
    api.current?.show(id);
  };

  return (
    <div className="asm-bench">
      <canvas ref={canvas} className="asm-bench-canvas" aria-label="A 3D model of the watch case, slowly turning. Drag to rotate it." role="img" />
      {!ready && <span className="asm-bench-wait">Polishing the case…</span>}
      <div className="asm-bench-copy">
        <div className="eyebrow">On the bench</div>
        <div className="asm-big">My own watch</div>
        <p className="asm-note">I&rsquo;m designing one from scratch, starting with the case. Drag to turn it over.</p>
      </div>
      <div className="asm-bench-pick" role="group" aria-label="Case design">
        {CASES.map((c) => (
          <button key={c.id} type="button" aria-pressed={current === c.id} onClick={() => pick(c.id)}>
            {c.label} <span>{c.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
