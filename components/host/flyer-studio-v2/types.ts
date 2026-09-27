export type SidebarTool =
  | "templates"
  | "uploads"
  | "text"
  | "brand"
  | "elements"
  | "background";

export type TextAlign = "left" | "center" | "right";
export type ElementKind = "text" | "button" | "qr" | "image" | "shape";
export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export type CanvasElement = {
  id: string;
  kind: ElementKind;
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight: number;
  color: string;
  align: TextAlign;
  uppercase?: boolean;
  letterSpacing?: number;
  borderRadius?: number;
  background?: string;
  hidden?: boolean;
  locked?: boolean;
  textShadow?: boolean;
  imageUrl?: string;
  objectFit?: "cover" | "contain";
  opacity?: number;
  shape?: "rectangle" | "circle";
  borderColor?: string;
  borderWidth?: number;
};

export type Guide = {
  axis: "x" | "y";
  position: number;
};

export type FlyerDocument = {
  version: 1;
  format: string;
  prompt: string;
  style: string;
  imageUrl: string;
  imageStorageId?: string;
  overlayStrength: number;
  backgroundPreset?: string;
  elements: CanvasElement[];
};

export type Interaction =
  | {
      mode: "drag";
      elementId: string;
      startClientX: number;
      startClientY: number;
      startElement: CanvasElement;
      startSnapshot: CanvasElement[];
    }
  | {
      mode: "resize";
      elementId: string;
      handle: ResizeHandle;
      startClientX: number;
      startClientY: number;
      startElement: CanvasElement;
      startSnapshot: CanvasElement[];
    };
