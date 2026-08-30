"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ERA_RENDERERS } from "./eras";

/**
 * One era, full-bleed in the stage. Each layer scales itself to fit the locked
 * stage height; two layers are alive at once so scrolling crossfades between
 * them rather than snapping.
 */
export default function EraLayer({ era, jobs, opacity, offset, blur }) {
  const layerRef = useRef(null);
  const sceneRef = useRef(null);
  const [scale, setScale] = useState(1);
  const Era = ERA_RENDERERS[era.id];
  const stretches = era.id === "future";

  useLayoutEffect(() => {
    if (stretches) {
      setScale(1);
      return;
    }
    const fit = () => {
      const layer = layerRef.current;
      const scene = sceneRef.current;
      if (!layer || !scene) return;

      // Measure the era's own box rather than the fixed-width scene: a phone is
      // only ~312px wide inside a 640px scene, and sizing it off the scene would
      // shrink it as though it were the full width.
      const art = scene.firstElementChild;
      if (!art) return;
      // offsetWidth/Height ignore transforms, so this cannot feed back on itself
      const w = art.offsetWidth;
      const h = art.offsetHeight;
      if (!w || !h) return;

      // measure the layer's content box so the padding that clears the nav is
      // excluded from the space an era may occupy
      const cs = getComputedStyle(layer);
      const shadow = 24; // a little slack for each era's drop shadow
      const availH =
        layer.clientHeight -
        parseFloat(cs.paddingTop) -
        parseFloat(cs.paddingBottom) -
        shadow;
      const availW =
        layer.clientWidth -
        parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight) -
        shadow;

      const MAX = 1.5;
      setScale(Math.max(0.1, Math.min(MAX, availH / h, availW / w)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (layerRef.current) ro.observe(layerRef.current);
    if (sceneRef.current) ro.observe(sceneRef.current);
    if (document.fonts?.ready) document.fonts.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [era.id, stretches]);

  return (
    <div
      className="lab-layer"
      ref={layerRef}
      data-era={era.id}
      style={{ opacity, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}
    >
      <div
        className="lab-scene"
        ref={sceneRef}
        style={{ transform: `translateY(${offset}px) scale(${scale})` }}
      >
        <Era jobs={jobs} />
      </div>
    </div>
  );
}
