import type {
  CanvasElement,
  ResizeHandle,
  SidebarTool,
} from "./types";

export const CANVAS_WIDTH = 520;
export const SNAP_THRESHOLD = 6;
export const MIN_WIDTH = 40;
export const MIN_HEIGHT = 24;
export const HISTORY_LIMIT = 100;

export const sidebarTools: Array<{
  id: SidebarTool;
  label: string;
  icon: string;
}> = [
  { id: "templates", label: "Templates", icon: "▦" },
  { id: "uploads", label: "Uploads", icon: "↑" },
  { id: "ai", label: "AI Images", icon: "✦" },
  { id: "text", label: "Text", icon: "T" },
  { id: "brand", label: "Brand Kit", icon: "◆" },
  { id: "elements", label: "Layers", icon: "○" },
  { id: "background", label: "Background", icon: "▨" },
];

export const templates = [
  {
    name: "Luxury Nightlife",
    style: "Luxury",
    prompt:
      "Luxury nightlife party with a stylish crowd, velvet rope exclusivity, cinematic lighting and premium event branding",
  },
  {
    name: "Afrobeats Night",
    style: "Afrobeats",
    prompt:
      "Afrobeats party with premium cultural nightlife energy, dancing crowd, warm luxury lighting and modern editorial styling",
  },
  {
    name: "Rooftop Social",
    style: "Rooftop",
    prompt:
      "Luxury rooftop event with skyline views, champagne atmosphere, elegant guests and cinematic sunset lighting",
  },
  {
    name: "Festival Energy",
    style: "Festival",
    prompt:
      "Large outdoor music festival with stage lights, crowd energy, confetti and premium campaign design",
  },
];

export const formats = [
  { id: "poster", label: "Poster", height: 780 },
  { id: "square", label: "Square", height: 520 },
  { id: "story", label: "Story", height: 924 },
];


export const backgroundPresets = [
  {
    id: "aurora",
    label: "Aurora",
    backgroundImage:
      "radial-gradient(circle at 20% 10%, rgba(124,58,237,.9), transparent 35%), radial-gradient(circle at 85% 85%, rgba(249,115,22,.7), transparent 40%), linear-gradient(145deg, #111, #26113e 55%, #190b10)",
  },
  {
    id: "sunset",
    label: "Sunset",
    backgroundImage:
      "radial-gradient(circle at 78% 22%, rgba(251,146,60,.95), transparent 32%), radial-gradient(circle at 20% 85%, rgba(190,24,93,.75), transparent 42%), linear-gradient(145deg, #241017, #541c39 58%, #171018)",
  },
  {
    id: "ocean",
    label: "Ocean",
    backgroundImage:
      "radial-gradient(circle at 22% 18%, rgba(14,165,233,.8), transparent 35%), radial-gradient(circle at 82% 82%, rgba(99,102,241,.7), transparent 40%), linear-gradient(145deg, #071923, #102a46 58%, #101323)",
  },
  {
    id: "mono",
    label: "Monochrome",
    backgroundImage:
      "radial-gradient(circle at 75% 18%, rgba(161,161,170,.35), transparent 36%), linear-gradient(145deg, #09090b, #27272a 58%, #111113)",
  },
] as const;

export const styleOptions = [
  "Luxury",
  "Underground",
  "Festival",
  "Rooftop",
  "EDM",
  "Afrobeats",
  "College",
];

export const resizeHandles: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

export const initialElements: CanvasElement[] = [
  {
    id: "kicker",
    kind: "text",
    name: "Kicker",
    text: "FUNCTION HOUR PRESENTS",
    x: 40,
    y: 44,
    width: 430,
    height: 28,
    fontSize: 12,
    fontWeight: 900,
    color: "#ffffff",
    align: "left",
    uppercase: true,
    letterSpacing: 4.2,
  },
  {
    id: "headline",
    kind: "text",
    name: "Headline",
    text: "NIGHT MOVES",
    x: 40,
    y: 105,
    width: 430,
    height: 168,
    fontSize: 58,
    fontWeight: 900,
    color: "#ffffff",
    align: "left",
    uppercase: true,
    letterSpacing: -3,
  },
  {
    id: "subheadline",
    kind: "text",
    name: "Description",
    text: "A premium event experience curated for the city.",
    x: 40,
    y: 300,
    width: 360,
    height: 78,
    fontSize: 16,
    fontWeight: 400,
    color: "#ffffff",
    align: "left",
  },
  {
    id: "venue",
    kind: "text",
    name: "Venue",
    text: "NEW ORLEANS",
    x: 40,
    y: 668,
    width: 250,
    height: 24,
    fontSize: 12,
    fontWeight: 500,
    color: "#ffffff",
    align: "left",
    uppercase: true,
    letterSpacing: 3,
  },
  {
    id: "style",
    kind: "text",
    name: "Style",
    text: "LUXURY",
    x: 40,
    y: 702,
    width: 250,
    height: 34,
    fontSize: 20,
    fontWeight: 900,
    color: "#ffffff",
    align: "left",
    uppercase: true,
  },
  {
    id: "cta",
    kind: "button",
    name: "Call to action",
    text: "GET TICKETS",
    x: 350,
    y: 687,
    width: 130,
    height: 48,
    fontSize: 12,
    fontWeight: 900,
    color: "#000000",
    align: "center",
    uppercase: true,
    borderRadius: 999,
    background: "#ffffff",
  },
];
