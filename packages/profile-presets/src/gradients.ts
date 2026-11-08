import type { ProfilePageStyle, ProfileBlockStyle } from "@urlinks/types";

export const BACKGROUND_GRADIENTS: { name: string; gradient: NonNullable<ProfilePageStyle["backgroundGradient"]> }[] = [
  { name: "Peach", gradient: { type: "linear", angle: 160, stops: [{ color: "#FFE3D3", position: 0 }, { color: "#FFC8B4", position: 1 }] } },
  { name: "Blush", gradient: { type: "linear", angle: 160, stops: [{ color: "#FFE0EC", position: 0 }, { color: "#FFC2D6", position: 1 }] } },
  { name: "Mint", gradient: { type: "linear", angle: 160, stops: [{ color: "#D9F7E8", position: 0 }, { color: "#B8ECD8", position: 1 }] } },
  { name: "Sky", gradient: { type: "linear", angle: 160, stops: [{ color: "#DBEAFE", position: 0 }, { color: "#BFD9FF", position: 1 }] } },
  { name: "Lilac", gradient: { type: "linear", angle: 160, stops: [{ color: "#EDE4FF", position: 0 }, { color: "#D7C4FF", position: 1 }] } },
  { name: "Citrus", gradient: { type: "linear", angle: 160, stops: [{ color: "#FFF3C4", position: 0 }, { color: "#FFE08A", position: 1 }] } },
  { name: "Sunset", gradient: { type: "linear", angle: 160, stops: [{ color: "#FFD3A5", position: 0 }, { color: "#FD9B8E", position: 1 }] } },
  { name: "Dusk", gradient: { type: "linear", angle: 160, stops: [{ color: "#C7D2FE", position: 0 }, { color: "#A5B4FC", position: 1 }] } },
];

export const BUTTON_GRADIENTS: { name: string; gradient: NonNullable<ProfileBlockStyle["backgroundGradient"]> }[] = [
  { name: "Sunset", gradient: { type: "linear", angle: 135, stops: [{ color: "#FF8A65", position: 0 }, { color: "#FF5E8A", position: 1 }] } },
  { name: "Ocean", gradient: { type: "linear", angle: 135, stops: [{ color: "#2E5BFF", position: 0 }, { color: "#27C4E8", position: 1 }] } },
  { name: "Grape", gradient: { type: "linear", angle: 135, stops: [{ color: "#7B4DFF", position: 0 }, { color: "#C84DFF", position: 1 }] } },
  { name: "Lime", gradient: { type: "linear", angle: 135, stops: [{ color: "#2BB673", position: 0 }, { color: "#9BE15D", position: 1 }] } },
  { name: "Peach", gradient: { type: "linear", angle: 135, stops: [{ color: "#FFB36B", position: 0 }, { color: "#FFD93D", position: 1 }] } },
  { name: "Berry", gradient: { type: "linear", angle: 135, stops: [{ color: "#C8417B", position: 0 }, { color: "#7B2FF7", position: 1 }] } },
  { name: "Night", gradient: { type: "linear", angle: 135, stops: [{ color: "#1F2547", position: 0 }, { color: "#4B3F8F", position: 1 }] } },
];

export const COLOR_SWATCHES = [
  "#2D2B2E", "#1A1F2E", "#000000", "#FFFFFF", "#F4F1EA", "#0270EE",
  "#2F6FB0", "#0EA5E9", "#1FA67A", "#16A34A", "#10B981", "#14B8A6",
  "#C2703D", "#F59E0B", "#F4C44C", "#EF4444", "#E5638F", "#EC4899",
  "#B23267", "#7C5CFF", "#8B5CF6", "#6366F1",
];
