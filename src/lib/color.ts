// Colour maths for the branding settings. Pure functions, no server-only
// imports, so the settings form can show the same result the server will apply.

export const HEX = /^#[0-9a-f]{6}$/i;
export const DEFAULT_ACCENT = "#0b5a6b";
export const DEFAULT_PANEL = "#10222b";

/** Smallest contrast the accent must have against white (WCAG AA for text). */
export const MIN_ACCENT_CONTRAST = 4.5;

const WHITE = "#ffffff";
const INK = "#0b1318";
// Dark-mode surfaces the accent has to read against.
const DARK_PAGE = "#0d1418";
const DARK_CARD = "#151e24";

type RGB = [number, number, number];

function parse(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}

function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** t = 0 gives `a`, t = 1 gives `b`. */
export function mix(a: string, b: string, t: number): string {
  const [x, y] = [parse(a), parse(b)];
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
}

/** White or near-black, whichever reads better on `bg`. */
export function readableOn(bg: string): string {
  return contrast(bg, WHITE) >= contrast(bg, INK) ? WHITE : INK;
}

/** Moves `fg` toward `target` until it reaches `min` contrast on `bg`. */
function ensureContrast(fg: string, bg: string, min: number, target: string): string {
  let out = fg;
  for (let t = 0; t <= 1 && contrast(out, bg) < min; t += 0.05) out = mix(fg, target, t);
  return contrast(out, bg) >= min ? out : target;
}

export function isDark(hex: string) {
  return luminance(hex) < 0.18;
}

export type Mode = "light" | "dark";

/** Every theme variable the branding controls, for one mode. */
export function themeVars(accentIn: string, panelIn: string, mode: Mode): Record<string, string> {
  const accent = accentIn.toLowerCase();
  const panelBase = panelIn.toLowerCase();

  let primary = accent;
  let panel = panelBase;
  let surface = WHITE; // what accent-coloured text sits on
  if (mode === "dark") {
    surface = DARK_CARD;
    primary = ensureContrast(accent, DARK_CARD, MIN_ACCENT_CONTRAST, WHITE);
    // A light brand panel becomes a very dark tint of itself in dark mode.
    panel = isDark(panelBase) ? mix(panelBase, "#000000", 0.4) : mix(panelBase, DARK_PAGE, 0.85);
  }

  const tint = mode === "light" ? mix(primary, WHITE, 0.88) : mix(primary, surface, 0.8);
  const strong = readableOn(panel); // names, headings and icons on the panel
  const body = ensureContrast(mix(strong, panel, 0.15), panel, 7, strong);
  const muted = ensureContrast(mix(strong, panel, 0.35), panel, 4.5, strong);
  // Highlight for the current menu item: lighter on dark panels. On a mid-tone
  // panel that would hurt readability, so the highlight goes the other way.
  let highlight = mix(panel, strong, 0.12);
  if (contrast(strong, highlight) < 4.5) highlight = mix(panel, strong === WHITE ? INK : WHITE, 0.12);

  return {
    "--primary": primary,
    "--primary-foreground": readableOn(primary),
    "--ring": primary,
    "--accent": tint,
    "--accent-foreground": ensureContrast(primary, tint, 4.5, mode === "light" ? INK : WHITE),
    "--sidebar": panel,
    "--sidebar-foreground": body,
    "--sidebar-strong": strong,
    "--sidebar-muted": muted,
    "--sidebar-accent": highlight,
    "--sidebar-accent-foreground": strong,
    "--sidebar-border": mix(panel, strong, 0.14),
  };
}

const block = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

/** CSS that overrides the default theme. `html:root` outranks the plain `:root` defaults. */
export function themeCss(accent: string, panel: string): string {
  return (
    `html:root{${block(themeVars(accent, panel, "light"))}}` +
    `@media (prefers-color-scheme: dark){html:root{${block(themeVars(accent, panel, "dark"))}}}`
  );
}
