// The two style types the profile presets use, taken from the shared
// @urlinks/types package in the URLinks app.

export interface ProfileBlockStyle {
  backgroundColor?: string;
  backgroundGradient?: {
    type: "linear" | "radial";
    angle?: number;
    stops: { color: string; position: number }[];
  };
  /** Image fill (e.g. a button "made of" a photo). Rendered cover/centered; sits
   *  over backgroundColor and under the label. */
  backgroundImage?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  padding?: [number, number, number, number];
  margin?: [number, number, number, number];
  maxWidth?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  shadow?: { x: number; y: number; color: string } | null;
  hoverEffect?: "none" | "lift" | "glow" | "press" | "scale" | "shadow-grow";
  /** Idle attention animation that loops periodically (Linktree-style). Distinct from
   *  hoverEffect, which only fires on hover. Auto-disabled under prefers-reduced-motion. */
  animation?: "none" | "shake" | "bounce" | "pulse" | "wobble" | "tada" | "glow";
  visible?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
}

export interface ProfilePageStyle {
  backgroundColor: string;
  backgroundGradient?: {
    type: string;
    angle?: number;
    stops: { color: string; position: number }[];
  };
  backgroundImage?: string;
  /**
   * Subtle film-grain texture over the background color/gradient. "grain" is the
   * neutral default — barely-there character so the page doesn't read as a flat
   * white document. Skipped automatically when backgroundImage is set.
   */
  backgroundTexture?: "none" | "grain" | "dots" | "grid";
  /** Curated rich background ("aurora", "galaxy", …) — resolves to a multi-layer
      CSS background, animated by default. Takes precedence over gradient/color
      (but not over an uploaded backgroundImage). See SCENES in profileStyles. */
  backgroundScene?: string;
  /** Freeze scene animation (also auto-frozen under prefers-reduced-motion). */
  reduceMotion?: boolean;
  /** Dark scrim over an uploaded backgroundImage so text stays readable.
      Default on (undefined = on); set false to show the raw photo. */
  backgroundScrim?: boolean;
  defaultTextColor: string;
  defaultFontFamily: string;
  defaultFontSize: number;
  defaultLinkStyle?: Partial<ProfileBlockStyle>;
  maxWidth: number;
  contentAlign: "left" | "center";
  blockGap: number;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerFocus?: [number, number];
  /** Banner runs edge-to-edge across the viewport on desktop. Default true
      (undefined is treated as full-bleed); set false to cap it to the content
      column width. */
  bannerFullBleed?: boolean;
  avatarShape: "circle" | "rounded" | "square";
  headerLayout?: "normal" | "hero";
  /**
   * "standard" (default) renders all blocks stacked. "gallery" turns the profile
   * into a whole-page photo wall: only gallery blocks render (links/text/etc. are
   * hidden), with the avatar/name/bio header still on top.
   */
  profileLayout?: "standard" | "gallery";
  buttonStyle?: "card" | "fill" | "outline" | "soft" | "shadow" | "rounded-fill" | "rounded-outline";
  buttonColor?: string;
  buttonTextColor?: string;
  buttonRadius?: number;
  displayName: string;
  bio?: string;
  bioColor?: string;
  bioStrokeWidth?: number;
  bioStrokeColor?: string;
  nameColor?: string;
  nameFontFamily?: string;
  nameStrokeWidth?: number;
  nameStrokeColor?: string;
  showLinkIcons?: boolean;
  /**
   * How the profile-level social row is rendered. "brand" (default) uses each
   * platform's brand color + glyph, falling back to the linked site's favicon for
   * non-platform links. "theme" recolors every icon to the page's button color;
   * "outline" draws theme-colored outlined icons. Both unify the row to the theme.
   */
  socialIconStyle?: "brand" | "theme" | "outline";
}
