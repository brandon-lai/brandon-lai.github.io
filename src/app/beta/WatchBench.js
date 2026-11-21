"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The watch I'm designing, case first: each CAD export turns slowly, and you
 * can drag it over to see the back or take it apart into its pieces.
 *
 * The meshes are the original STLs packed by scripts/pack-stl.mjs. Every
 * separate shell in the STL stays its own part, largest first, which is the
 * order `parts` names them in below. Format (little endian):
 *   "WCH2" · u32 partCount, then per part
 *   u32 vertexCount · u32 triangleCount · f32[3] min · f32[3] max
 *   u16[vertexCount·3] positions (quantized to the part's box) · u16|u32 indices, padded to 4 bytes
 * three.js loads only when the tile is first on screen.
 */
export const CASES = [
  {
    id: "no1",
    label: "No.1",
    detail: "31.5 mm",
    src: "/beta/watch-no1.bin",
    parts: [
      ["Case", "steel"],
      ["Caseback", "steel"],
      ["Crystal", "glass"],
    ],
  },
  {
    id: "tonneau",
    label: "Tonneau",
    detail: "v3.2",
    src: "/beta/watch-tonneau.bin",
    parts: [
      ["Gasket", "rubber"],
      ["Case", "steel"],
      ["Dial", "dial"],
      ["Crystal", "glass"],
      ["Crown", "steel"],
      ["Movement", "brass"],
    ],
  },
];

const CLEAR = 5; // mm of air between neighbouring parts when the watch is apart
const STEP = 6; // and at least this far between their positions
const PULL = 9; // mm a side part (the crown) slides out

async function loadCase(THREE, creased, c) {
  const buf = await (await fetch(c.src)).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x32484357) throw new Error("not a WCH2 watch file");
  const count = dv.getUint32(4, true);
  const raw = [];
  let at = 8;
  for (let p = 0; p < count; p++) {
    const nv = dv.getUint32(at, true);
    const nt = dv.getUint32(at + 4, true);
    const min = [0, 1, 2].map((i) => dv.getFloat32(at + 8 + i * 4, true));
    const max = [0, 1, 2].map((i) => dv.getFloat32(at + 20 + i * 4, true));
    at += 32;
    const q = new Uint16Array(buf.slice(at, at + nv * 6));
    at += nv * 6;
    const wide = nv > 65535;
    const bytes = nt * 3 * (wide ? 4 : 2);
    const index = wide ? new Uint32Array(buf.slice(at, at + bytes)) : new Uint16Array(buf.slice(at, at + bytes));
    at += bytes + ((4 - ((nv * 6 + bytes) % 4)) % 4);
    raw.push({ q, index, min, max });
  }

  // centre the assembled watch, then lay each part out for the exploded view
  const lo = [0, 1, 2].map((a) => Math.min(...raw.map((r) => r.min[a])));
  const hi = [0, 1, 2].map((a) => Math.max(...raw.map((r) => r.max[a])));
  const mid = lo.map((v, a) => (v + hi[a]) / 2);
  const parts = raw.map(({ q, index, min, max }, i) => {
    const pos = new Float32Array(q.length);
    for (let k = 0; k < q.length; k++) {
      const a = k % 3;
      pos[k] = min[a] + (q[k] / 65535) * (max[a] - min[a]) - mid[a];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    const [name, kind] = c.parts[i] ?? [`Part ${i + 1}`, "steel"];
    const center = new THREE.Vector3(...[0, 1, 2].map((a) => (min[a] + max[a]) / 2 - mid[a]));
    // keep the machined edges crisp and the curved flanks smooth
    const lo = min[2] - mid[2], hi = max[2] - mid[2];
    return { name, kind, center, lo, hi, geo: creased(geo, (35 * Math.PI) / 180), apart: new THREE.Vector3() };
  });

  // parts on the axis stack up along it, around the case; off-axis parts slide outward
  const side = (p) => Math.hypot(p.center.x, p.center.y) > 4;
  const stack = parts.filter((p) => !side(p)).sort((a, b) => a.center.z - b.center.z);
  const home = Math.max(0, stack.findIndex((p) => p.name === "Case"));
  // each part clears its neighbour nearer the case, however deep it sat inside it
  for (let r = home + 1; r < stack.length; r++) {
    const [p, q] = [stack[r], stack[r - 1]];
    p.apart.z = Math.max(q.apart.z + STEP, q.apart.z + q.hi + CLEAR - p.lo);
  }
  for (let r = home - 1; r >= 0; r--) {
    const [p, q] = [stack[r], stack[r + 1]];
    p.apart.z = Math.min(q.apart.z - STEP, q.apart.z + q.lo - CLEAR - p.hi);
  }
  stack.forEach((p, r) => (p.rank = Math.abs(r - home)));
  const shift = -(stack[0].apart.z + stack[stack.length - 1].apart.z) / 2;
  for (const p of parts) {
    if (side(p)) {
      p.apart.set(p.center.x, p.center.y, 0).setLength(PULL);
      p.rank = 1;
    }
    p.apart.z += shift;
  }
  return parts;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.max(0, Math.min(1, t));

export default function WatchBench() {
  const canvas = useRef(null);
  const tags = useRef(null);
  const api = useRef(null);
  const [current, setCurrent] = useState(CASES[0].id);
  const [ready, setReady] = useState(false);
  const [apart, setApart] = useState(false);
  const [names, setNames] = useState([]);

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
      const key = new THREE.DirectionalLight(0xfff1d6, 1.4);
      key.position.set(-30, 40, 60);
      scene.add(key);

      const materials = {
        steel: new THREE.MeshPhysicalMaterial({ color: 0xcfccc5, metalness: 1, roughness: 0.32, clearcoat: 0.2 }),
        glass: new THREE.MeshPhysicalMaterial({
          color: 0xe8f2f4,
          metalness: 0,
          roughness: 0.04,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          envMapIntensity: 1.6,
          side: THREE.DoubleSide,
        }),
        rubber: new THREE.MeshStandardMaterial({ color: 0x1c1f1d, metalness: 0, roughness: 0.65 }),
        dial: new THREE.MeshPhysicalMaterial({ color: 0x9aa09b, metalness: 0.7, roughness: 0.42 }),
        brass: new THREE.MeshPhysicalMaterial({ color: 0xc9a467, metalness: 1, roughness: 0.4 }),
      };

      // turn: camera-facing tilt · spin: the turntable · lie: face-up when apart
      const turn = new THREE.Group();
      const spin = new THREE.Group();
      const lie = new THREE.Group();
      scene.add(turn);
      turn.add(spin);
      spin.add(lie);
      let model = { parts: [], meshes: [], reach: 18 };
      const cache = {};

      const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const view = { yaw: -0.55, pitch: -0.32, vYaw: 0, vPitch: 0, drag: null, swap: 1, apart: 0, goal: 0 };
      let visible = false;
      let raf = 0;
      let last = performance.now();
      let w = 1, h = 1, wide = true;

      const size = () => {
        w = el.clientWidth;
        h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        wide = w / h > 1.05;
        camera.updateProjectionMatrix();
      };

      const v = new THREE.Vector3();
      const placeTags = (t) => {
        const box = tags.current;
        if (!box) return;
        box.style.opacity = String(t);
        box.style.visibility = t > 0.01 ? "visible" : "hidden";
        if (t <= 0.01) return;
        // a column of labels just right of the watch, each level with its part
        turn.updateMatrixWorld();
        const axis = turn.getWorldPosition(new THREE.Vector3()).project(camera);
        const edge = turn.localToWorld(new THREE.Vector3(model.reach, 0, 0)).project(camera);
        const x = Math.min(w - 96, ((Math.max(axis.x, edge.x) + 1) / 2) * w + 14);
        const rows = model.meshes.map((m, i) => {
          v.copy(model.parts[i].center);
          m.localToWorld(v).project(camera);
          return { el: box.children[i], y: ((1 - v.y) / 2) * h };
        });
        rows.sort((a, b) => a.y - b.y);
        let prev = -Infinity;
        for (const r of rows) {
          if (!r.el) continue;
          r.y = Math.max(r.y, prev + 19);
          prev = r.y;
          r.el.style.transform = `translate3d(${x.toFixed(1)}px, ${(r.y - 8).toFixed(1)}px, 0)`;
        }
      };

      const frame = (now) => {
        raf = 0;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const rest = view.goal ? 0.42 : -0.32;
        if (!view.drag) {
          view.yaw += view.vYaw * dt + (still ? 0 : 0.35 * dt);
          view.pitch += view.vPitch * dt;
          view.vYaw *= Math.pow(0.04, dt);
          view.vPitch *= Math.pow(0.04, dt);
          // drift back toward a flattering three-quarter tilt
          view.pitch += (rest - view.pitch) * Math.min(1, dt * (view.goal !== view.apart ? 3 : 1.5));
        }
        view.apart = still ? view.goal : view.goal ? Math.min(1, view.apart + dt / 1.1) : Math.max(0, view.apart - dt / 0.8);
        view.swap = Math.min(1, view.swap + dt * 3.5);

        const e = ease(view.apart);
        // the outermost parts lift first, so it comes apart like someone's doing it
        model.meshes.forEach((m, i) => {
          const p = model.parts[i];
          const lag = Math.min(0.3, 0.12 * Math.max(0, 3 - p.rank));
          m.position.copy(p.apart).multiplyScalar(ease(clamp01((view.apart - lag) / (1 - lag))));
        });
        lie.rotation.x = (-Math.PI / 2) * e;
        spin.rotation.y = view.yaw;
        turn.rotation.x = view.pitch;
        const pop = 0.9 + 0.1 * (1 - Math.pow(1 - view.swap, 3));
        turn.scale.setScalar(pop);
        // wide tile: the case sits right of the copy; narrow: below it. Apart, it needs more room.
        const z = wide ? 120 : 148 / Math.min(1, w / h);
        camera.position.set(0, 0, z * (1 + (wide ? 0.32 : 0.12) * e));
        turn.position.set(wide ? 13 - 9 * e : -7 * e, (wide ? -2 : -7) - 4 * e, 0);

        renderer.render(scene, camera);
        placeTags(clamp01((view.apart - 0.65) / 0.35));
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
        cache[id] ??= loadCase(THREE, toCreasedNormals, c);
        const parts = await cache[id];
        if (!alive) return;
        for (const m of model.meshes) lie.remove(m);
        const meshes = parts.map((p) => {
          const m = new THREE.Mesh(p.geo, materials[p.kind] ?? materials.steel);
          if (p.kind === "glass") m.renderOrder = 1;
          lie.add(m);
          return m;
        });
        const reach = Math.max(...parts.map((p) => p.geo.boundingBox ?? (p.geo.computeBoundingBox(), p.geo.boundingBox)).map((b) => Math.max(b.max.x, b.max.y)));
        model = { parts, meshes, reach };
        setNames(parts.map((p) => p.name));
        view.swap = 0;
        setReady(true);
        wake();
      };
      const setApartNow = (on) => {
        view.goal = on ? 1 : 0;
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

      api.current = { show, apart: setApartNow };
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
        Object.values(materials).forEach((m) => m.dispose());
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
  const toggle = () => {
    setApart(!apart);
    api.current?.apart(!apart);
  };

  return (
    <div className="asm-bench" data-apart={apart || undefined}>
      <canvas
        ref={canvas}
        className="asm-bench-canvas"
        aria-label={`A 3D model of the watch case, slowly turning${apart ? ", taken apart into its pieces" : ""}. Drag to rotate it.`}
        role="img"
      />
      <div ref={tags} className="asm-bench-tags" aria-hidden="true">
        {names.map((n, i) => (
          <span key={`${current}-${i}`}>{n}</span>
        ))}
      </div>
      {!ready && <span className="asm-bench-wait">Polishing the case…</span>}
      <div className="asm-bench-copy">
        <div className="eyebrow">On the bench</div>
        <div className="asm-big">My own watch</div>
        <p className="asm-note">I&rsquo;m designing one from scratch, starting with the case. Drag to turn it over, or take it apart.</p>
      </div>
      <div className="asm-bench-bar">
        <div className="asm-bench-pick" role="group" aria-label="Case design">
          {CASES.map((c) => (
            <button key={c.id} type="button" aria-pressed={current === c.id} onClick={() => pick(c.id)}>
              {c.label} <span>{c.detail}</span>
            </button>
          ))}
        </div>
        <button type="button" className="asm-bench-apart" aria-pressed={apart} onClick={toggle} disabled={!ready}>
          {apart ? "Put it back" : "Take it apart"}
        </button>
      </div>
    </div>
  );
}
