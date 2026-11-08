import type { ProfilePageStyle } from "@urlinks/types";

// Coordinated color sets. Unlike the loose swatch grid (one role at a time), a
// palette recolors every role together — background, text, name/accent, button,
// button text — so any pick lands on a harmonious, contrast-checked result.
// Deliberately *only* colors: font, texture, layout and avatar shape are left
// untouched, so swapping a palette never undoes the user's other choices.
export type PaletteSet = {
  key: string;
  name: string;
  /** [background, accent/name, button] for the picker chip. */
  swatch: [string, string, string];
  style: Partial<ProfilePageStyle>;
};

const clearBg = { backgroundGradient: undefined, backgroundScene: undefined, backgroundImage: "" } as const;

// Buttons are forced to a solid `fill` so a palette is honored regardless of the
// page's current button style (a "card" style ignores buttonColor and would
// render an invisible light label on a dark palette). Every fill/label pair below
// clears WCAG AA.
function p(key: string, name: string, bg: string, text: string, accent: string, btn: string, btnText: string): PaletteSet {
  return {
    key,
    name,
    swatch: [bg, accent, btn],
    style: { ...clearBg, backgroundColor: bg, defaultTextColor: text, nameColor: accent, buttonStyle: "fill", buttonColor: btn, buttonTextColor: btnText },
  };
}

export const PALETTE_SETS: PaletteSet[] = [
  // ─── Light ───
  p("cream", "Cream", "#F7F5F1", "#2D2B2E", "#2D2B2E", "#2D2B2E", "#FFFFFF"),
  p("snow", "Snow", "#FFFFFF", "#111111", "#111111", "#111111", "#FFFFFF"),
  p("sand", "Sand", "#F3ECE0", "#3A2E22", "#8A5A2B", "#3A2E22", "#FFFFFF"),
  p("sky", "Sky", "#ECF3FC", "#15314E", "#0270EE", "#0270EE", "#FFFFFF"),
  p("sage", "Sage", "#EDF3EC", "#21392C", "#2F7D5B", "#2F7D5B", "#FFFFFF"),
  p("blush", "Blush", "#FBEEF1", "#5A2536", "#C44D72", "#BC4068", "#FFFFFF"),
  p("butter", "Butter", "#FBF3DE", "#5A4412", "#B5780C", "#5A4412", "#FFFFFF"),
  p("lilac", "Lilac", "#F1ECFB", "#38275E", "#7C5CFF", "#6A47DB", "#FFFFFF"),
  // ─── Dark ───
  p("ink", "Ink", "#15141A", "#ECEAE6", "#8FB7FF", "#ECEAE6", "#15141A"),
  p("midnight", "Midnight", "#0D1117", "#C9D1D9", "#58A6FF", "#58A6FF", "#08101A"),
  p("forest", "Forest", "#0F1A14", "#D6E4DB", "#5BBF8A", "#5BBF8A", "#08110C"),
  p("plum", "Plum", "#17121F", "#E8DDF1", "#C08AE0", "#C08AE0", "#1A1126"),
];
