/**
 * One helper: a cube-headed builder in a hard hat, drawn front-on so it reads
 * at 60px. The engine poses it by rotating the named groups (data-p) about
 * their joints; idle motion (blinks, dangling legs, waving, the propeller)
 * is CSS, so a still page still breathes.
 *
 * A helper on a themed block dresses for it (`outfit`): scuba, runner, tennis,
 * chef, watchmaker or dj. The outfit swaps the hat, what's on the torso, the feet
 * and anything carried; `--hat` stays the accent colour throughout.
 *
 * Geometry is local to the feet: (0,0) is between the soles, up is -y.
 *   shoulders (±7,-27) · hips (±4,-16) · head -50..-31
 */
function Foot({ side, outfit }) {
  const m = side; // -1 left, 1 right
  if (outfit === "scuba") return <path className="fin" d={`M${2 * m} -3.6H${6.5 * m}L${13 * m} 0.4H${1.4 * m}Z`} />;
  if (outfit === "runner")
    return (
      <g className="shoe">
        <rect x={m < 0 ? -9.2 : 1.2} y="-3.8" width="8" height="3.8" rx="1.9" />
        <path d={`M${m < 0 ? -7.6 : 2.6} -2h3.6`} />
      </g>
    );
  return <rect className="foot" x={m < 0 ? -8.5 : 1.5} y="-3.2" width="7" height="3.2" rx="1.6" />;
}

function Headgear({ outfit, prop }) {
  switch (outfit) {
    case "scuba":
      return (
        <g className="scuba-head">
          <path className="mask-strap" d="M-11.5 -41.5H11.5" />
          <rect className="mask" x="-9.6" y="-45" width="19.2" height="9" rx="3.6" />
          <path className="mask-glint" d="M-7.4 -42.8l2.2 -1.2" />
          <path className="snorkel" d="M9 -34.6H11.6V-55.5" />
          <circle className="bubble" cx="12" cy="-58" r="1.5" />
          <circle className="bubble" cx="10" cy="-58" r="1.1" />
          <circle className="bubble" cx="13" cy="-58" r="0.9" />
        </g>
      );
    case "runner":
      return (
        <g className="headband">
          <path className="tails" d="M-11.4 -46.6l-4.6 -2.8M-11.4 -45.4l-5 0.8" />
          <rect x="-12" y="-48.2" width="24" height="3.6" rx="1.2" />
        </g>
      );
    case "tennis":
      return (
        <g className="visor">
          <path className="band" d="M-11.6 -45.8H11.6" />
          <path className="brim" d="M-12.8 -46.6C-6 -51 6 -51 12.8 -46.6L11 -44.4C5 -47.6 -5 -47.6 -11 -44.4Z" />
        </g>
      );
    case "chef":
      return (
        <g className="toque">
          <path d="M-8.4 -49.6C-14 -50 -14.4 -58.4 -8 -58C-7.4 -64.4 2.6 -64.6 3.6 -59C9.6 -61.4 14 -55 8.4 -49.6Z" />
          <rect x="-9.2" y="-51.6" width="18.4" height="4" rx="1.2" />
          <path className="pleat" d="M-3.6 -51.2V-55M0 -51.2V-56M3.6 -51.2V-55" />
        </g>
      );
    case "dj":
      return (
        <g className="headphones">
          <path className="band" d="M-12 -40C-12.6 -57 12.6 -57 12 -40" />
          <rect x="-15" y="-44.5" width="5" height="9" rx="2.2" />
          <rect x="10" y="-44.5" width="5" height="9" rx="2.2" />
        </g>
      );
    case "watchmaker":
      return (
        <g className="loupe">
          <path className="loupe-band" d="M-11.5 -45.2H2.6" />
          <rect x="1.2" y="-44.6" width="6.4" height="6.2" rx="1.8" />
          <circle className="lens" cx="4.4" cy="-41.5" r="1.9" />
        </g>
      );
    default:
      return (
        <>
          <path className="hat" d="M-11 -48.6C-11 -57.8 11 -57.8 11 -48.6Z" />
          <rect className="hat" x="-14" y="-50.2" width="28" height="2.8" rx="1.4" />
          {prop && (
            <g className="prop">
              <path className="limb thin" d="M0 -55.5v-4.5" />
              <path className="prop-blade" d="M-9 -60.5h18" />
            </g>
          )}
        </>
      );
  }
}

function TorsoDetail({ outfit }) {
  switch (outfit) {
    case "scuba":
      return <path className="zip" d="M0 -30.5V-15" />;
    case "runner":
      return (
        <g className="bib">
          <rect x="-4.8" y="-27" width="9.6" height="7.2" rx="1.1" />
          <path d="M-2.8 -24.6h5.6M-2.8 -22.2h3.4" />
        </g>
      );
    case "tennis":
      return <path className="collar" d="M-4 -31L0 -27.6L4 -31M0 -27.6v3.4" />;
    case "chef":
      return (
        <g className="chef-coat">
          <path className="kerchief" d="M-4.4 -31L0 -26.8L4.4 -31Z" />
          <circle cx="-2.6" cy="-23.6" r="0.95" />
          <circle cx="2.6" cy="-23.6" r="0.95" />
          <circle cx="-2.6" cy="-19.4" r="0.95" />
          <circle cx="2.6" cy="-19.4" r="0.95" />
        </g>
      );
    case "watchmaker":
      return <path className="apron" d="M-4.2 -31v4.6h8.4v-4.6M-6 -21.4h12" />;
    default:
      return (
        <>
          <path className="strap" d="M-4 -31v7M4 -31v7" />
          <rect className="pocket" x="-3" y="-24" width="6" height="4" rx="1.2" />
        </>
      );
  }
}

export function Bot({ id, hat, tool, prop, outfit }) {
  return (
    <svg
      className={outfit ? `bot is-${outfit}` : "bot"}
      data-bot={id}
      viewBox="0 0 48 70"
      width="48"
      height="70"
      aria-hidden="true"
      style={{ "--hat": hat }}
    >
      <ellipse className="bot-shadow" cx="24" cy="67.5" rx="11" ry="2.2" />
      <g transform="translate(24 66)">
        <g className="bot-hop">
        <g className="bot-jig">
        <g data-p="body">
          <g data-p="legL">
            <g className="leg-swing">
              <path className="limb" d="M-4 -16V-3" />
              <Foot side={-1} outfit={outfit} />
            </g>
          </g>
          <g data-p="legR">
            <g className="leg-swing leg-swing-b">
              <path className="limb" d="M4 -16V-3" />
              <Foot side={1} outfit={outfit} />
            </g>
          </g>
          <g data-p="armL">
            <g className="arm-wave arm-wave-l">
              <path className="limb" d="M-7 -27V-16" />
              <circle className="hand" cx="-7" cy="-15" r="2.3" />
              {tool === "batons" && <rect className="baton" x="-8" y="-15" width="2.2" height="11" rx="1" />}
            </g>
          </g>
          {outfit === "scuba" && (
            <g className="tank">
              <rect x="-12.5" y="-34" width="7.5" height="19" rx="3.4" />
              <rect className="valve" x="-10.4" y="-37" width="3.2" height="3.4" rx="0.8" />
            </g>
          )}
          <rect className="torso" x="-7.5" y="-31" width="15" height="17" rx="4.5" />
          <TorsoDetail outfit={outfit} />
          {outfit === "runner" && <rect className="shorts" x="-7" y="-16.6" width="14" height="4.6" rx="1.6" />}
          <g data-p="head">
            <rect className="face" x="-11.5" y="-50" width="23" height="19.5" rx="5.5" />
            <g className="eyes">
              <circle cx="-4.2" cy="-40" r="1.8" />
              <circle cx="4.2" cy="-40" r="1.8" />
            </g>
            <path className="cheek" d="M-8.6 -36.4h2.4M6.2 -36.4h2.4" />
            <Headgear outfit={outfit} prop={prop} />
          </g>
          <g data-p="armR">
            <g className="arm-wave arm-wave-r">
              <path className="limb" d="M7 -27V-16" />
              <circle className="hand" cx="7" cy="-15" r="2.3" />
              {outfit === "tennis" && (
                <g className="racket" transform="rotate(-28 7 -15)">
                  <path className="grip" d="M7 -15.5V-9.4" />
                  <ellipse cx="7" cy="-3.6" rx="4.4" ry="5.8" />
                  <path className="strings" d="M4.4 -5.2h5.2M4.4 -2h5.2M7 -8.8V1.6" />
                </g>
              )}
              {tool === "spray" && (
                <g className="can">
                  <rect x="4.2" y="-15.5" width="5.6" height="10" rx="1.6" />
                  <rect className="nozzle" x="5.8" y="-6" width="2.4" height="2.4" rx=".6" />
                </g>
              )}
              {tool === "batons" && <rect className="baton" x="6" y="-15" width="2.2" height="11" rx="1" />}
              {tool === "tray" && (
                <g className="tray">
                  <path className="cloche" d="M1.5 -11.6A5.5 5.5 0 0 0 12.5 -11.6Z" />
                  <circle className="cloche" cx="7" cy="-5.2" r="1.2" />
                  <rect className="plate" x="-1.5" y="-13.6" width="17" height="2.2" rx="1.1" />
                </g>
              )}
            </g>
          </g>
          {tool === "laptop" && (
            <g className="laptop">
              <rect x="-11" y="-29" width="22" height="13" rx="2" />
              <circle cx="0" cy="-22.5" r="1.6" />
            </g>
          )}
        </g>
        </g>
        </g>
      </g>
    </svg>
  );
}

/** an isometric cube, the site's own motif, for the parallax layers */
export function IsoCube({ top, left, right, line }) {
  return (
    <svg viewBox="-40 -46 80 92" aria-hidden="true">
      <path d="M0 -40L35 -20L0 0L-35 -20Z" fill={top} />
      <path d="M-35 -20L0 0V40L-35 20Z" fill={left} />
      <path d="M35 -20L0 0V40L35 20Z" fill={right} />
      <path
        d="M0 -40L35 -20V20L0 40L-35 20V-20ZM0 0L35 -20M0 0L-35 -20M0 0V40"
        fill="none"
        stroke={line}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
