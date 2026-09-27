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
}> = [
  { id: "templates", label: "Templates" },
  { id: "uploads", label: "Uploads" },
  { id: "elements", label: "Elements" },
  { id: "text", label: "Text" },
  { id: "brand", label: "Brand Kit" },
  { id: "layers", label: "Layers" },
  { id: "background", label: "Background" },
];

export const templates = [
  { name: "Luxury Nightlife", style: "Luxury", category: "Nightlife", prompt: "Luxury nightlife party with a stylish crowd, velvet rope exclusivity, cinematic lighting and premium event branding" },
  { name: "Afrobeats Night", style: "Afrobeats", category: "Nightlife", prompt: "Afrobeats party with premium cultural nightlife energy, dancing crowd, warm luxury lighting and modern editorial styling" },
  { name: "Rooftop Social", style: "Rooftop", category: "Social", prompt: "Luxury rooftop event with skyline views, champagne atmosphere, elegant guests and cinematic sunset lighting" },
  { name: "Festival Energy", style: "Festival", category: "Music", prompt: "Large outdoor music festival with stage lights, crowd energy, confetti and premium campaign design" },
  { name: "Live in Concert", style: "Festival", category: "Music", prompt: "Headline concert poster with dramatic stage lighting, bold artist-focused composition, crowd silhouettes and premium tour-poster energy" },
  { name: "Underground Set", style: "Underground", category: "Music", prompt: "Underground DJ event with dark club atmosphere, gritty editorial typography, neon lighting and late-night warehouse energy" },
  { name: "Sunday Brunch", style: "Rooftop", category: "Food & Social", prompt: "Stylish Sunday brunch and day party with bright natural light, cocktails, elevated food presentation and fashionable social energy" },
  { name: "Day Party", style: "Festival", category: "Social", prompt: "High-energy daytime party with sunshine, colorful crowd, cocktails, bold modern typography and summer event energy" },
  { name: "Homecoming", style: "College", category: "College", prompt: "College homecoming celebration with alumni pride, campus energy, bold school-spirit composition and lively crowd atmosphere" },
  { name: "Greek Night", style: "College", category: "College", prompt: "Polished fraternity and sorority social event with energetic campus nightlife, bold typography and premium promotional design" },
  { name: "Game Day", style: "College", category: "Sports", prompt: "High-energy game day event with stadium atmosphere, fan excitement, bold athletic typography and dramatic sports-poster composition" },
  { name: "Watch Party", style: "Underground", category: "Sports", prompt: "Premium sports watch party with large screens, energetic fans, food and drinks, bold matchup graphics and nightlife atmosphere" },
  { name: "Comedy Night", style: "Luxury", category: "Entertainment", prompt: "Modern comedy show poster with spotlight stage, microphone, confident headline typography and intimate live-show atmosphere" },
  { name: "Networking Mixer", style: "Luxury", category: "Professional", prompt: "Upscale professional networking mixer with polished guests, modern venue, sophisticated editorial design and premium business-event atmosphere" },
  { name: "Grand Opening", style: "Luxury", category: "Business", prompt: "Premium grand opening celebration with elegant venue reveal, ribbon-cutting energy, stylish guests and polished launch-event branding" },
  { name: "Community Fest", style: "Festival", category: "Community", prompt: "Welcoming community festival with families, local vendors, live entertainment, bright outdoor atmosphere and inclusive event branding" },
  { name: "Art & Culture", style: "Luxury", category: "Culture", prompt: "Contemporary art and culture event with gallery-inspired composition, expressive creative details and refined editorial typography" },
  { name: "All White Affair", style: "Luxury", category: "Nightlife", prompt: "Elegant all-white party with sophisticated guests, luminous white styling, upscale venue lighting and exclusive nightlife branding" },
  { name: "Masquerade", style: "Luxury", category: "Experience", prompt: "Opulent masquerade event with dramatic masks, rich cinematic lighting, mysterious luxury atmosphere and ornate editorial styling" },
  { name: "New Year's Eve", style: "Luxury", category: "Holiday", prompt: "Glamorous New Year's Eve celebration with midnight countdown energy, champagne, metallic sparkle, city nightlife and premium party branding" },
];

export const formats = [
  { id: "poster", label: "Poster", height: 780, social: false },
  { id: "square", label: "Square", height: 520, social: false },
  { id: "story", label: "Story", height: 924, social: false },
  { id: "instagram-post", label: "Instagram Post", height: 650, social: true },
  { id: "instagram-story", label: "Instagram Story", height: 924, social: true },
  { id: "tiktok", label: "TikTok", height: 924, social: true },
  { id: "facebook-post", label: "Facebook Post", height: 436, social: true },
  { id: "x-post", label: "X Post", height: 293, social: true },
  { id: "event-cover", label: "Function Hour Cover", height: 293, social: true },
];

export const socialPackFormats = formats.filter((format) => format.social);


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
  "Sports",
  "Professional",
  "Comedy",
  "Community",
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
