/**
 * The page, typeset into the canvas.
 *
 * Once the camera is inside the window there is no second document to cut to —
 * the copy scrolls up through the same room the fly-in lands in, in the same
 * ink. Everything here is measured once per layout and then only drawn, so a
 * scroll frame costs a few dozen fillText calls and no text measurement.
 *
 * The words come from the same data files the rest of the site reads, and
 * Skyline mirrors them into hidden markup, so nothing here is the only copy.
 */
import { EXPERIENCE } from "../data/experience";
import { ABOUT, SOCIALS } from "../data/site";
import { clamp } from "./util";

const FACE = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const INK = "#efe6d6";
const DIM = "#a99d89";
const RULE = "rgba(239, 230, 214, 0.16)";

/** the year the page is written in — what the clock reads outside the history */
const PRESENT = 2026;

const yearOf = (s = "") => Number(s.match(/\d{4}/)?.[0]) || null;

/** the copy in reading order, each part carrying the year it belongs to */
export function blocks() {
  const out = ABOUT.lead.map((text) => ({ kind: "lead", text, year: PRESENT }));

  out.push({ kind: "heading", text: "Now", year: PRESENT });
  for (const b of ABOUT.bullets) {
    out.push({ kind: "bullet", emoji: b.emoji, text: b.label });
  }

  out.push({ kind: "heading", text: "Watches" });
  out.push({
    kind: "body",
    text: ABOUT.watches.before + ABOUT.watches.handle + ABOUT.watches.after,
  });

  out.push({ kind: "heading", text: "Where I have worked" });
  for (const j of EXPERIENCE) {
    out.push({
      kind: "job",
      role: `${j.role}, ${j.org}`,
      dates: `${j.start} — ${j.end}`,
      note: j.note,
      year: yearOf(j.start),
    });
  }

  out.push({ kind: "heading", text: "Contact" });
  for (const s of SOCIALS) {
    out.push({ kind: "link", text: s.text || s.label, href: s.href, year: PRESENT });
  }

  return out;
}

/**
 * Measure and place every line. Returns draw instructions in document space
 * plus the two things the rest of the engine needs out of it: where each year
 * starts, and where the one real link ended up.
 */
export function layoutContent(ctx, W, H) {
  const s = clamp(W / 1000, 0.86, 1.1);
  const maxW = Math.min(W - 40, 660 * s);
  const x0 = Math.round((W - maxW) / 2);

  /* the copy starts below the middle of the frame, so when the music stops and
     the room settles the first line is already sitting in the lamplight */
  const padTop = H * 0.55;
  /* Deep enough that the eye line below can travel past the last line rather
     than stopping short of it — otherwise the clock never reaches the oldest
     job, because scrolling runs out while it is still under the reader. */
  const padBottom = H * 0.62;

  const font = (px, weight = 400) => `${weight} ${Math.round(px)}px ${FACE}`;
  const items = [];
  const marks = [];
  let link = null;
  let y = padTop;

  const wrap = (text, width) => {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(next).width > width) {
        lines.push(line);
        line = w;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const paragraph = (text, px, color, x = x0, width = maxW) => {
    const f = font(px);
    ctx.font = f;
    const lh = px * 1.62;
    for (const line of wrap(text, width)) {
      items.push({ x, y, text: line, font: f, color });
      y += lh;
    }
  };

  for (const b of blocks()) {
    if (b.year) marks.push({ y, year: b.year });

    if (b.kind === "lead") {
      paragraph(b.text, 21 * s, INK);
      y += 14 * s;
    } else if (b.kind === "body") {
      paragraph(b.text, 17 * s, INK);
      y += 14 * s;
    } else if (b.kind === "heading") {
      y += 34 * s;
      const px = 14 * s;
      ctx.font = font(px);
      items.push({ x: x0, y, text: b.text, font: font(px), color: DIM });
      y += px * 0.75;
      items.push({ rule: true, x: x0, y, w: maxW });
      y += 26 * s;
    } else if (b.kind === "bullet") {
      const px = 17 * s;
      const gap = px * 1.7;
      ctx.font = font(px);
      items.push({ x: x0, y, text: b.emoji, font: font(px), color: INK });
      paragraph(b.text, px, INK, x0 + gap, maxW - gap);
      y += 6 * s;
    } else if (b.kind === "job") {
      const px = 17 * s;
      const dpx = 14 * s;
      ctx.font = font(dpx);
      const dateW = ctx.measureText(b.dates).width;
      items.push({ x: x0 + maxW, y, text: b.dates, font: font(dpx), color: DIM, align: "right" });
      paragraph(b.role, px, INK, x0, maxW - dateW - 16 * s);
      paragraph(b.note, 15 * s, DIM);
      y += 16 * s;
    } else if (b.kind === "link") {
      const px = 17 * s;
      const f = font(px);
      ctx.font = f;
      const w = ctx.measureText(b.text).width;
      items.push({ x: x0, y, text: b.text, font: f, color: INK });
      // underline, since nothing else marks it as a link
      items.push({ rule: true, x: x0, y: y + px * 0.34, w, color: "rgba(239,230,214,0.4)" });
      link = { href: b.href, x: x0, y: y - px * 0.9, w, h: px * 1.5 };
      y += px * 1.62;
    }
  }

  const height = y + padBottom;
  return { items, marks, link, height, scroll: Math.max(200, Math.round(height - H)) };
}

/** the year the reader is currently level with, for the clock in the corner */
export function yearAtOffset(layout, offsetY, H) {
  const eye = offsetY + H * 0.45;
  let year = null;
  for (const m of layout.marks) {
    if (m.y <= eye) year = m.year;
  }
  return year ?? layout.marks[0]?.year ?? PRESENT;
}

/**
 * The light of the room the camera just landed in, receding as the reader
 * moves away from the window. Drawn under the copy in both phases, which is
 * what stops the intro and the page looking like two different surfaces.
 */
export function drawRoomLight(ctx, W, H, alpha, recede) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#1a1208";
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(
    W * 0.42, H * 0.34, 0,
    W * 0.42, H * 0.34, Math.max(W, H) * 0.9
  );
  const lit = clamp(1 - recede, 0, 1);
  glow.addColorStop(0, `rgba(255, 214, 150, ${0.30 * lit})`);
  glow.addColorStop(0.35, `rgba(224, 168, 101, ${0.14 * lit})`);
  glow.addColorStop(1, "rgba(42, 26, 10, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** draw whatever part of the copy is on screen */
export function drawContent(ctx, layout, offsetY, W, H, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "alphabetic";

  for (const it of layout.items) {
    const y = it.y - offsetY;
    if (y < -60 || y > H + 60) continue;

    if (it.rule) {
      ctx.fillStyle = it.color || RULE;
      ctx.fillRect(it.x, Math.round(y), it.w, 1);
      continue;
    }

    ctx.font = it.font;
    ctx.fillStyle = it.color;
    ctx.textAlign = it.align || "left";
    ctx.fillText(it.text, it.x, y);
  }

  ctx.textAlign = "left";
  ctx.restore();
}
