import type {
  CanvasElement,
  FlyerDocument,
  ResizeHandle,
} from "./types";

export function cloneElements(elements: CanvasElement[]) {
  return elements.map((element) => ({ ...element }));
}

export function snapshotsEqual(
  first: CanvasElement[],
  second: CanvasElement[]
) {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function getElementAnchors(element: CanvasElement) {
  return {
    left: element.x,
    centerX: element.x + element.width / 2,
    right: element.x + element.width,
    top: element.y,
    centerY: element.y + element.height / 2,
    bottom: element.y + element.height,
  };
}

export function resizeHandleClass(handle: ResizeHandle) {
  const positions: Record<ResizeHandle, string> = {
    nw: "-left-1.5 -top-1.5 cursor-nwse-resize",
    n: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
    ne: "-right-1.5 -top-1.5 cursor-nesw-resize",
    e: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
    se: "-bottom-1.5 -right-1.5 cursor-nwse-resize",
    s: "bottom-[-6px] left-1/2 -translate-x-1/2 cursor-ns-resize",
    sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
    w: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize",
  };

  return positions[handle];
}

export function parseFlyerDocument(value: string): FlyerDocument | null {
  try {
    const document = JSON.parse(value) as Partial<FlyerDocument>;

    if (
      document.version !== 1 ||
      typeof document.format !== "string" ||
      typeof document.prompt !== "string" ||
      typeof document.style !== "string" ||
      typeof document.imageUrl !== "string" ||
      typeof document.overlayStrength !== "number" ||
      !Array.isArray(document.elements) ||
      document.elements.length > 500 ||
      !document.elements.every(isCanvasElement)
    ) {
      return null;
    }

    return document as FlyerDocument;
  } catch {
    return null;
  }
}

function isCanvasElement(value: unknown): value is CanvasElement {
  if (!value || typeof value !== "object") return false;

  const element = value as Partial<CanvasElement>;

  return (
    typeof element.id === "string" &&
    (element.kind === "text" || element.kind === "button" || element.kind === "qr") &&
    typeof element.name === "string" &&
    typeof element.text === "string" &&
    typeof element.x === "number" &&
    typeof element.y === "number" &&
    typeof element.width === "number" &&
    typeof element.height === "number" &&
    typeof element.fontSize === "number" &&
    typeof element.fontWeight === "number" &&
    typeof element.color === "string" &&
    ["left", "center", "right"].includes(element.align ?? "")
  );
}
