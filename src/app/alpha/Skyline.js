"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sound, SoundOff } from "../components/Icons";
import { createSkyline } from "./manhattan";

/** how long the intro runs, and so how long the soundtrack plays */
const INTRO_SECONDS = 25;
/** the track is longer than the intro, so it is faded rather than cut */
const FADE_SECONDS = 2.2;
/** has to outlast the gate's opacity transition in alpha.css */
const GATE_FADE_MS = 900;
/** keys that mean "I want to scroll this myself" */
const SCROLL_KEYS = new Set([
  " ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown",
]);

/**
 * Owns the DOM the canvas engine draws into. The copy is passed in as
 * `children` so the page itself stays a server component — only the
 * scroll-driven chrome below runs on the client.
 *
 * The intro is a gate: nothing scrolls until you press Enter. That click is
 * also the gesture browsers require before audio may play, so the soundtrack
 * and the scroll can start together and finish together — the page drives
 * itself off the audio clock, landing on the copy as the music fades out.
 */
export default function Skyline({ children }) {
  const canvas = useRef(null);
  const spacer = useRef(null);
  const hud = useRef(null);
  const year = useRef(null);
  const caption = useRef(null);
  const hint = useRef(null);
  const audio = useRef(null);
  const drive = useRef(0);
  const fade = useRef(0);

  const [entered, setEntered] = useState(false);
  const [gateGone, setGateGone] = useState(false);
  const [auto, setAuto] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const skyline = createSkyline({
      canvas: canvas.current,
      spacer: spacer.current,
      hudEl: hud.current,
      yearEl: year.current,
      capEl: caption.current,
      hintEl: hint.current,
    });
    return () => skyline.destroy();
  }, []);

  /* The sky runs past the top and bottom of the scroll, so the page behind it
     has to be night rather than the site's default paper. The page also starts
     pinned: the gate is in front, and there is nothing to scroll through yet. */
  useEffect(() => {
    const { style } = document.body;
    const bg = style.background;
    const bounce = style.overscrollBehaviorY;
    const flow = style.overflow;
    style.background = "#06091a";
    style.overscrollBehaviorY = "none";
    style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      style.background = bg;
      style.overscrollBehaviorY = bounce;
      style.overflow = flow;
    };
  }, []);

  const stopAuto = useCallback(() => {
    cancelAnimationFrame(drive.current);
    drive.current = 0;
    setAuto(false);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(drive.current);
      cancelAnimationFrame(fade.current);
    },
    []
  );

  /* Reaching for the scroll hands it back — the music plays out, but from here
     on you are the one moving through the years. Tabbing around the chrome is
     not reaching for the scroll, so only scroll keys count. */
  useEffect(() => {
    if (!auto) return undefined;
    const take = () => stopAuto();
    const takeOnKey = (e) => {
      if (SCROLL_KEYS.has(e.key)) stopAuto();
    };
    window.addEventListener("wheel", take, { passive: true });
    window.addEventListener("touchstart", take, { passive: true });
    window.addEventListener("keydown", takeOnKey);
    return () => {
      window.removeEventListener("wheel", take);
      window.removeEventListener("touchstart", take);
      window.removeEventListener("keydown", takeOnKey);
    };
  }, [auto, stopAuto]);

  /* drop the gate out of the tree once it has finished fading */
  useEffect(() => {
    if (!entered) return undefined;
    const t = setTimeout(() => setGateGone(true), GATE_FADE_MS + 50);
    return () => clearTimeout(t);
  }, [entered]);

  /* Start the track and let it pull the page through four hundred years, so
     the copy arrives exactly as the music runs out. */
  const runIntro = useCallback(() => {
    cancelAnimationFrame(drive.current);
    cancelAnimationFrame(fade.current);
    window.scrollTo(0, 0);

    const track = audio.current;
    if (track) {
      track.currentTime = 0;
      track.volume = 1;
      track
        .play()
        .then(() => {
          // the recording outlasts the intro, so bring it down and stop it on
          // the same beat the copy arrives rather than letting it run on
          const step = () => {
            if (track.paused) return;
            const left = INTRO_SECONDS - track.currentTime;
            if (left <= 0) {
              track.pause();
              return;
            }
            track.volume = Math.min(1, left / FADE_SECONDS);
            fade.current = requestAnimationFrame(step);
          };
          fade.current = requestAnimationFrame(step);
        })
        .catch(() => {});
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // the music still plays; the scrolling stays yours
    }

    setAuto(true);
    const began = performance.now();
    const step = () => {
      // the audio clock is the source of truth, but it stands still if playback
      // was blocked or is buffering, so fall back to the wall clock
      const elapsed =
        track && !track.paused ? track.currentTime : (performance.now() - began) / 1000;

      const t = Math.min(1, elapsed / INTRO_SECONDS);
      window.scrollTo(0, spacer.current.offsetHeight * t);

      if (t < 1) drive.current = requestAnimationFrame(step);
      else stopAuto();
    };
    drive.current = requestAnimationFrame(step);
  }, [stopAuto]);

  const enter = () => {
    setEntered(true);
    document.body.style.overflow = "";
    runIntro();
  };

  const toggleSound = () => {
    const track = audio.current;
    if (!track) return;
    track.muted = !track.muted;
    setMuted(track.muted);
  };

  return (
    <>
      <canvas className="alpha-sky" ref={canvas} aria-hidden="true" />

      <audio ref={audio} src="/audio/nyc.mp3" preload="auto" />

      {entered && (
        <button
          type="button"
          className="alpha-sound"
          onClick={toggleSound}
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <SoundOff /> : <Sound />}
        </button>
      )}

      <div className="alpha-hud" ref={hud} aria-hidden="true">
        <div className="alpha-year" ref={year}>
          1609
        </div>
        <div className="alpha-caption" ref={caption} />
      </div>
      <div className="alpha-hint" ref={hint} data-auto={auto ? "true" : "false"} aria-hidden="true">
        scroll
      </div>

      {!gateGone && (
        <div className="alpha-gate" data-open={entered ? "false" : "true"}>
          <button type="button" className="alpha-enter" onClick={enter}>
            Enter
          </button>
        </div>
      )}

      {/* empty on purpose — its height is the length of the intro */}
      <div className="alpha-spacer" ref={spacer} aria-hidden="true" />

      <section className="alpha-content">
        <div className="alpha-inner">
          {children}

          <button type="button" className="alpha-replay" onClick={runIntro}>
            Replay the intro
          </button>
        </div>
      </section>
    </>
  );
}
