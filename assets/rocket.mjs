// The DYOR "rocket-O": a rocket climbing through an orbital ring.
// Recreated as vector art so it stays crisp at every icon size.

export const TEAL = "#17A2A8";
export const TEAL_DARK = "#0F7A80";

/**
 * Build an SVG string of the rocket-O.
 * @param {object} opts
 * @param {string} [opts.bg]      Background fill (omit for transparent).
 * @param {string} [opts.rocket]  Rocket fill color.
 * @param {string} [opts.window]  Porthole fill color.
 * @param {number} [opts.pad]     Padding fraction (0-0.4) around the art.
 */
export function rocketSvg({ bg, rocket = TEAL, window: win = "#FFFFFF", pad = 0.06 } = {}) {
  const scale = 1 - pad * 2;
  const bgRect = bg ? `<rect width="100" height="100" fill="${bg}"/>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  ${bgRect}
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <!-- orbital rings (the O), tilted like Saturn's -->
    <g transform="rotate(-24 50 50)" fill="none" stroke="${rocket}" stroke-linecap="round">
      <ellipse cx="50" cy="52" rx="45" ry="16" stroke-width="6"/>
      <ellipse cx="50" cy="52" rx="31" ry="9.5" stroke-width="4.5" opacity="0.85"/>
    </g>

    <!-- rocket, climbing to the upper-right -->
    <g transform="rotate(45 50 50)">
      <!-- exhaust -->
      <path d="M43 69 Q50 92 57 69 Q50 78 43 69 Z" fill="${rocket}" opacity="0.55"/>
      <!-- fins -->
      <path d="M40 55 L29 69 L40 66 Z" fill="${TEAL_DARK}"/>
      <path d="M60 55 L71 69 L60 66 Z" fill="${TEAL_DARK}"/>
      <!-- body + nose -->
      <path d="M50 13
               C58 21 61 32 61 45
               L61 60
               C61 67 56 71 50 71
               C44 71 39 67 39 60
               L39 45
               C39 32 42 21 50 13 Z" fill="${rocket}"/>
      <!-- porthole -->
      <circle cx="50" cy="38" r="7.5" fill="${win}"/>
      <circle cx="50" cy="38" r="7.5" fill="none" stroke="${TEAL_DARK}" stroke-width="1.5" opacity="0.4"/>
    </g>
  </g>
</svg>`;
}
