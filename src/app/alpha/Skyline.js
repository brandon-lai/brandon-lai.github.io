"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOCIALS } from "../data/site";
import { Sound, SoundOff } from "../components/Icons";
import { createSkyline } from "./manhattan";

/** how long the intro runs, and so how long the soundtrack plays */
const INTRO_SECONDS = 25;
/** the track is longer than the intro, so it is faded rather than cut */
const FADE_SECONDS = 2.2;
/** has to outlast the gate's opacity transition in alpha.css */
const GATE_FADE_MS = 900;
/**
 * How far into the tour the drive carries you: past the end of the film and
 * into the first stop, so it comes to rest on his name with the opening lines
 * written out under it rather than on a bare skyline.
 */
const GREETING_HOLD = 0.16;
/**
 * Seconds the drive keeps going after the music has finished.
 *
 * The film owns the whole soundtrack, as it always has. Writing the opening
 * lines inside that window as well left them a second to appear, which is a
 * blur rather than a hand. They get their own quiet stretch at the end
 * instead: the music resolves, and then the words finish.
 */
const WRITE_TAIL = 2.6;
/** keys that mean "I want to scroll this myself" */
const SCROLL_KEYS = new Set([
  " ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown",
]);

/**
 * Owns the DOM the canvas draws into.
 *
 * The page is two scroll regions stacked in one document. The first is the
 * film: pinned until you press Enter, then driven by the soundtrack's own
 * clock so the city finishes building as the music fades. The second is the
 * tour, which the reader steers — the camera moves around the finished
 * skyline and the copy is written onto it in the same hand throughout.
 *
 * `children` is therefore not what anyone sees. It is the same words in
 * markup, for screen readers, search engines and anything else that cannot
 * look at a canvas.
 */
export default function Skyline({ children }) {
  const canvas = useRef(null);
  const spacer = useRef(null);
  const contentSpacer = useRef(null);
  const hud = useRef(null);
  const year = useRef(null);
  const caption = useRef(null);
  const hint = useRef(null);
  const audio = useRef(null);
  const link = useRef(null);
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
      contentSpacer: contentSpacer.current,
      hudEl: hud.current,
      yearEl: year.current,
      capEl: caption.current,
      hintEl: hint.current,
      linkEl: link.current,
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
     the city tops out as the music runs out. The drive stops at the foot of
     the film; the tour below that is yours to steer. */
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
          // the same beat the camera arrives rather than letting it run on
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

      const film = spacer.current.offsetHeight;
      // the tour's own travel, which is a viewport shorter than its spacer
      const travel = Math.max(
        0,
        film + (contentSpacer.current?.offsetHeight || 0) - window.innerHeight - film
      );
      const hold = travel * GREETING_HOLD;

      /* Two stretches, not one: the film gets the whole of the soundtrack at
         the pace it was tuned to, and the writing gets the quiet afterwards. */
      const y =
        elapsed <= INTRO_SECONDS
          ? film * (elapsed / INTRO_SECONDS)
          : film + hold * Math.min(1, (elapsed - INTRO_SECONDS) / WRITE_TAIL);
      window.scrollTo(0, y);

      if (elapsed < INTRO_SECONDS + WRITE_TAIL) drive.current = requestAnimationFrame(step);
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

      {/* parked exactly over the word the canvas drew, so contact still works */}
      <a
        className="alpha-link"
        ref={link}
        href={SOCIALS[0]?.href}
        target="_blank"
        rel="noreferrer"
        aria-hidden="true"
        tabIndex={-1}
      >
        <span className="alpha-sr">{SOCIALS[0]?.label}</span>
      </a>

      {entered && (
        <div className="alpha-controls">
          <button type="button" className="alpha-chip" onClick={runIntro}>
            Replay
          </button>
          <button
            type="button"
            className="alpha-chip alpha-chip-icon"
            onClick={toggleSound}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <SoundOff /> : <Sound />}
          </button>
        </div>
      )}

      {/* the caption sits above the year, not below it: the block is anchored
          by its bottom edge, so anything underneath shoves the year upward
          every time a subject is named */}
      <div className="alpha-hud" ref={hud} aria-hidden="true">
        <div className="alpha-caption" ref={caption} />
        <div className="alpha-year" ref={year}>
          1609
        </div>
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

      {/* both empty on purpose: the length of the film, then of the copy */}
      <div className="alpha-spacer" ref={spacer} aria-hidden="true" />
      <div ref={contentSpacer} aria-hidden="true" />

      {/* the same words the canvas draws, for readers that cannot see it */}
      <div className="alpha-sr">{children}</div>
    </>
  );
}
