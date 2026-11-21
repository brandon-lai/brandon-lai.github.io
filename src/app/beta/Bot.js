/**
 * One helper: a cube-headed builder in a hard hat, drawn front-on so it reads
 * at 60px. The engine poses it by rotating the named groups (data-p) about
 * their joints; idle motion (blinks, dangling legs, waving, the propeller)
 * is CSS, so a still page still breathes.
 *
 * Geometry is local to the feet: (0,0) is between the soles, up is -y.
 *   shoulders (±7,-27) · hips (±4,-16) · head -50..-31
 */
export function Bot({ id, hat, tool, prop, outfit }) {
  // the scuba tile's helper dives in: wetsuit, mask, snorkel, tank, fins, bubbles
  const scuba = outfit === "scuba";
  return (
    <svg
      className={scuba ? "bot is-scuba" : "bot"}
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
        <g data-p="body">
          <g data-p="legL">
            <g className="leg-swing">
              <path className="limb" d="M-4 -16V-3" />
              {scuba ? (
                <path className="fin" d="M-2 -3.6H-6.5L-13 0.4H-1.4Z" />
              ) : (
                <rect className="foot" x="-8.5" y="-3.2" width="7" height="3.2" rx="1.6" />
              )}
            </g>
          </g>
          <g data-p="legR">
            <g className="leg-swing leg-swing-b">
              <path className="limb" d="M4 -16V-3" />
              {scuba ? (
                <path className="fin" d="M2 -3.6H6.5L13 0.4H1.4Z" />
              ) : (
                <rect className="foot" x="1.5" y="-3.2" width="7" height="3.2" rx="1.6" />
              )}
            </g>
          </g>
          <g data-p="armL">
            <g className="arm-wave arm-wave-l">
              <path className="limb" d="M-7 -27V-16" />
              <circle className="hand" cx="-7" cy="-15" r="2.3" />
              {tool === "batons" && <rect className="baton" x="-8" y="-15" width="2.2" height="11" rx="1" />}
            </g>
          </g>
          {scuba && (
            <g className="tank">
              <rect x="-12.5" y="-34" width="7.5" height="19" rx="3.4" />
              <rect className="valve" x="-10.4" y="-37" width="3.2" height="3.4" rx="0.8" />
            </g>
          )}
          <rect className="torso" x="-7.5" y="-31" width="15" height="17" rx="4.5" />
          {scuba ? (
            <path className="zip" d="M0 -30.5V-15" />
          ) : (
            <>
              <path className="strap" d="M-4 -31v7M4 -31v7" />
              <rect className="pocket" x="-3" y="-24" width="6" height="4" rx="1.2" />
            </>
          )}
          <g data-p="head">
            <rect className="face" x="-11.5" y="-50" width="23" height="19.5" rx="5.5" />
            <g className="eyes">
              <circle cx="-4.2" cy="-40" r="1.8" />
              <circle cx="4.2" cy="-40" r="1.8" />
            </g>
            <path className="cheek" d="M-8.6 -36.4h2.4M6.2 -36.4h2.4" />
            {scuba ? (
              <g className="scuba-head">
                <path className="mask-strap" d="M-11.5 -41.5H11.5" />
                <rect className="mask" x="-9.6" y="-45" width="19.2" height="9" rx="3.6" />
                <path className="mask-glint" d="M-7.4 -42.8l2.2 -1.2" />
                <path className="snorkel" d="M9 -34.6H11.6V-55.5" />
                <circle className="bubble" cx="12" cy="-58" r="1.5" />
                <circle className="bubble" cx="10" cy="-58" r="1.1" />
                <circle className="bubble" cx="13" cy="-58" r="0.9" />
              </g>
            ) : (
              <>
                <path className="hat" d="M-11 -48.6C-11 -57.8 11 -57.8 11 -48.6Z" />
                <rect className="hat" x="-14" y="-50.2" width="28" height="2.8" rx="1.4" />
              </>
            )}
            {prop && (
              <g className="prop">
                <path className="limb thin" d="M0 -55.5v-4.5" />
                <path className="prop-blade" d="M-9 -60.5h18" />
              </g>
            )}
          </g>
          <g data-p="armR">
            <g className="arm-wave arm-wave-r">
              <path className="limb" d="M7 -27V-16" />
              <circle className="hand" cx="7" cy="-15" r="2.3" />
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
