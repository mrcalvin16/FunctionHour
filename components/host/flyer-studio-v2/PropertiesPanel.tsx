import { CANVAS_WIDTH, MIN_HEIGHT, MIN_WIDTH } from "./config";
import type { BlendMode, CanvasElement, TextAlign } from "./types";

const blendModes: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" }, { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" }, { value: "overlay", label: "Overlay" },
  { value: "soft-light", label: "Soft light" }, { value: "difference", label: "Difference" },
  { value: "color", label: "Color" },
];

function BlendControl({ element, update }: { element: CanvasElement; update: (id: string, patch: Partial<CanvasElement>) => void }) {
  return <label className="block text-xs font-bold text-zinc-700">Blending mode
    <select value={element.blendMode ?? "normal"} onChange={(event) => update(element.id, { blendMode: event.target.value as BlendMode })} className="mt-2 w-full rounded-lg border border-zinc-300 bg-white p-2 text-zinc-950">
      {blendModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
    </select>
  </label>;
}

const fontOptions = [
  { name: "Modern Sans", stack: "Arial, Helvetica, sans-serif" },
  { name: "Avenir", stack: "'Avenir Next', Avenir, Arial, sans-serif" },
  { name: "Helvetica", stack: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { name: "Futura", stack: "Futura, 'Trebuchet MS', sans-serif" },
  { name: "Trebuchet", stack: "'Trebuchet MS', Arial, sans-serif" },
  { name: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { name: "Editorial Serif", stack: "Georgia, 'Times New Roman', serif" },
  { name: "Baskerville", stack: "Baskerville, 'Times New Roman', serif" },
  { name: "Bold Display", stack: "Impact, 'Arial Narrow', sans-serif" },
  { name: "Typewriter", stack: "'Courier New', Courier, monospace" },
] as const;

const adjustmentLooks = [
  { label: "Bright & clear", settings: { brightness: 112, contrast: 108, saturation: 108, blur: 0 } },
  { label: "Warm night", settings: { brightness: 93, contrast: 118, saturation: 122, blur: 0 } },
  { label: "Soft film", settings: { brightness: 105, contrast: 90, saturation: 78, blur: 0 } },
] as const;

function colorPatchFor(element: CanvasElement, color: string): Partial<CanvasElement> | null {
  switch (element.kind) {
    case "text":
    case "button":
    case "line":
    case "icon":
      return { color };
    case "shape":
    case "sticker":
      return { background: color };
    case "frame":
      return { borderColor: color };
    default:
      return null;
  }
}

function ElementColorControl({
  element,
  selectionCount,
  onChange,
}: {
  element: CanvasElement;
  selectionCount: number;
  onChange: (color: string) => void;
}) {
  const patch = colorPatchFor(element, element.color);
  if (!patch) return null;

  const value = element.kind === "shape" || element.kind === "sticker"
    ? element.background ?? element.color
    : element.kind === "frame"
      ? element.borderColor ?? element.color
      : element.color;
  const label = {
    text: "Text color",
    button: "Text color",
    shape: "Fill color",
    line: "Line color",
    frame: "Frame color",
    icon: "Icon color",
    sticker: "Sticker fill",
  }[element.kind as "text" | "button" | "shape" | "line" | "frame" | "icon" | "sticker"] ?? "Color";

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <label className="flex items-center justify-between gap-3 text-xs font-bold text-zinc-800">
        {selectionCount > 1 ? "Selected elements color" : label}
        <input
          type="color"
          aria-label={selectionCount > 1 ? "Color for selected elements" : label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
        />
      </label>
      {selectionCount > 1 && <p className="mt-2 text-xs leading-5 text-zinc-700">Applies to all selected text, shapes, lines, icons, frames, and stickers.</p>}
    </div>
  );
}

export default function PropertiesPanel({
  selectedElement,
  updateElement,
  moveLayer,
  alignToCanvas,
  duplicateSelected,
  deleteSelected,
  canvasHeight,
  onEditImage,
  selectionCount,
  applyColorToSelection,
}: {
  selectedElement: CanvasElement | null;
  selectionCount: number;
  applyColorToSelection: (color: string) => void;
  updateElement: (
    id: string,
    patch:
      | Partial<CanvasElement>
      | ((element: CanvasElement) => Partial<CanvasElement>)
  ) => void;
  moveLayer: (direction: "up" | "down") => void;
  alignToCanvas: (
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom"
  ) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  canvasHeight: number;
  onEditImage: (id: string) => void;
}) {
  if (selectedElement?.kind === "adjustment") return (
    <aside className="max-h-[55vh] overflow-y-auto border-t border-zinc-200 bg-white p-4 lg:max-h-none lg:border-l lg:border-t-0">
      <h2 className="text-sm font-black">Adjustment layer</h2>
      <p className="mt-2 text-xs leading-5 text-zinc-700">Changes the image and layers beneath it within this layer’s bounds. Stack layers for combined effects.</p>
      <div className="mt-5 space-y-5">
        <div>
          <p className="text-xs font-black text-zinc-900">Quick looks</p>
          <p className="mt-1 text-xs text-zinc-700">Start with a look, then fine-tune the sliders. The original image stays intact.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {adjustmentLooks.map(({ label, settings }) => (
              <button key={label} type="button" onClick={() => updateElement(selectedElement.id, settings)} className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-left text-xs font-bold text-zinc-950 hover:border-violet-500 hover:bg-violet-50">
                {label}
              </button>
            ))}
            <button type="button" onClick={() => updateElement(selectedElement.id, { brightness: 100, contrast: 100, saturation: 100, blur: 0, opacity: 1, blendMode: "normal" })} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-xs font-bold text-zinc-950 hover:border-violet-500 hover:bg-violet-50">
              Reset look
            </button>
          </div>
        </div>
        <ElementColorControl element={selectedElement} selectionCount={selectionCount} onChange={applyColorToSelection} />
        {([ ["brightness", "Brightness", 0, 200], ["contrast", "Contrast", 0, 200], ["saturation", "Saturation", 0, 200], ["blur", "Blur", 0, 20] ] as const).map(([key, label, min, max]) => <label key={key} className="block text-xs font-bold text-zinc-700">{label} · {selectedElement[key] ?? (key === "blur" ? 0 : 100)}
          <input type="range" min={min} max={max} value={selectedElement[key] ?? (key === "blur" ? 0 : 100)} onChange={(event) => updateElement(selectedElement.id, { [key]: Number(event.target.value) })} className="mt-2 w-full" />
        </label>)}
        <BlendControl element={selectedElement} update={updateElement} />
        <label className="block text-xs font-bold text-zinc-700">Strength · {Math.round((selectedElement.opacity ?? 1) * 100)}%
          <input type="range" min={0} max={100} value={Math.round((selectedElement.opacity ?? 1) * 100)} onChange={(event) => updateElement(selectedElement.id, { opacity: Number(event.target.value) / 100 })} className="mt-2 w-full" />
        </label>
        <button type="button" onClick={duplicateSelected} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold">Duplicate adjustment</button>
        <button type="button" onClick={deleteSelected} className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">Delete adjustment</button>
      </div>
    </aside>
  );
  if (selectedElement?.kind === "image" || selectedElement?.kind === "shape" || selectedElement?.kind === "line" || selectedElement?.kind === "frame" || selectedElement?.kind === "icon" || selectedElement?.kind === "sticker") {
    const isImage = selectedElement.kind === "image";
    const isLine = selectedElement.kind === "line";
    const isFrame = selectedElement.kind === "frame";
    const isIcon = selectedElement.kind === "icon";
    const isSticker = selectedElement.kind === "sticker";
    return (
      <aside className="max-h-[55vh] overflow-y-auto border-t border-zinc-200 bg-white p-4 lg:max-h-none lg:border-l lg:border-t-0">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-700">{isImage ? "Image" : isLine ? "Line" : isFrame ? "Frame" : isIcon ? "Icon" : isSticker ? "Sticker" : "Shape"}</p>
        <div className="mt-4 space-y-4">
          <ElementColorControl element={selectedElement} selectionCount={selectionCount} onChange={applyColorToSelection} />
          <label className="block text-xs font-bold text-zinc-700">Opacity
            <input type="range" min={10} max={100} value={Math.round((selectedElement.opacity ?? 1) * 100)} onChange={(event) => updateElement(selectedElement.id, { opacity: Number(event.target.value) / 100 })} className="mt-2 w-full" />
          </label>
          <BlendControl element={selectedElement} update={updateElement} />
          {isImage && <button type="button" onClick={() => onEditImage(selectedElement.id)} className="w-full rounded-lg bg-violet-700 px-3 py-3 text-xs font-black text-white">Retouch image · remove, heal, erase</button>}
          {isImage ? <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            {([
              ["brightness", "Brightness", 0, 200],
              ["contrast", "Contrast", 0, 200],
              ["saturation", "Saturation", 0, 200],
              ["blur", "Blur", 0, 20],
            ] as const).map(([key, label, min, max]) => (
              <label key={key} className="block text-xs font-bold text-zinc-700">{label}
                <div className="mt-2 flex items-center gap-3">
                  <input type="range" min={min} max={max} value={selectedElement[key] ?? (key === "blur" ? 0 : 100)} onChange={(event) => updateElement(selectedElement.id, { [key]: Number(event.target.value) })} className="w-full" />
                  <span className="w-10 text-right text-[11px] text-zinc-700">{selectedElement[key] ?? (key === "blur" ? 0 : 100)}</span>
                </div>
              </label>
            ))}
            <label className="block text-xs font-bold text-zinc-700">Corner radius
              <input type="range" min={0} max={100} value={selectedElement.borderRadius ?? 0} onChange={(event) => updateElement(selectedElement.id, { borderRadius: Number(event.target.value) })} className="mt-2 w-full" />
            </label>
            <button type="button" onClick={() => updateElement(selectedElement.id, { brightness: 100, contrast: 100, saturation: 100, blur: 0, borderRadius: 0, opacity: 1 })} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">Reset image adjustments</button>
          </div> : null}
          {isIcon ? <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"><label className="block text-xs font-bold text-zinc-700">Stroke width<input type="range" min={1} max={5} step={0.25} value={selectedElement.borderWidth ?? 2} onChange={(event) => updateElement(selectedElement.id, { borderWidth: Number(event.target.value) })} className="mt-2 w-full" /></label></div> : null}
          {isSticker ? <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"><label className="block text-xs font-bold text-zinc-700">Sticker text<input type="text" value={selectedElement.text} maxLength={24} onChange={(event) => updateElement(selectedElement.id, { text: event.target.value })} className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950" /></label><label className="block text-xs font-bold text-zinc-700">Text color<input type="color" value={selectedElement.borderColor ?? "#ffffff"} onChange={(event) => updateElement(selectedElement.id, { borderColor: event.target.value })} className="mt-2 block h-10 w-full" /></label><label className="block text-xs font-bold text-zinc-700">Style<select value={selectedElement.stickerStyle ?? "badge"} onChange={(event) => updateElement(selectedElement.id, { stickerStyle: event.target.value as "badge" | "burst" | "pill" })} className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"><option value="badge">Badge</option><option value="burst">Burst</option><option value="pill">Pill</option></select></label></div> : null}
          {isLine ? <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"><label className="block text-xs font-bold text-zinc-700">Thickness<input type="range" min={1} max={20} value={selectedElement.borderWidth ?? 3} onChange={(event) => updateElement(selectedElement.id, { borderWidth: Number(event.target.value) })} className="mt-2 w-full" /></label><label className="block text-xs font-bold text-zinc-700">Style<select value={selectedElement.lineStyle ?? "solid"} onChange={(event) => updateElement(selectedElement.id, { lineStyle: event.target.value as "solid" | "dashed" | "dotted" })} className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label></div> : null}
          {isFrame ? <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"><label className="block text-xs font-bold text-zinc-700">Border width<input type="range" min={1} max={30} value={selectedElement.borderWidth ?? 5} onChange={(event) => updateElement(selectedElement.id, { borderWidth: Number(event.target.value) })} className="mt-2 w-full" /></label><button type="button" onClick={() => updateElement(selectedElement.id, { frameShape: selectedElement.frameShape === "circle" ? "rectangle" : "circle" })} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">{selectedElement.frameShape === "circle" ? "Make rectangular" : "Make circular"}</button></div> : null}
          {isImage ? <label className="block text-xs font-bold text-zinc-700">Image fit
            <select value={selectedElement.objectFit ?? "cover"} onChange={(event) => updateElement(selectedElement.id, { objectFit: event.target.value as "cover" | "contain" })} className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"><option value="cover">Fill frame</option><option value="contain">Fit inside</option></select>
          </label> : <><button type="button" onClick={() => updateElement(selectedElement.id, { shape: selectedElement.shape === "circle" ? "rectangle" : "circle" })} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">{selectedElement.shape === "circle" ? "Make rectangle" : "Make circle"}</button></>}
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => moveLayer("up")} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">Move up</button><button type="button" onClick={() => moveLayer("down")} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">Move down</button><button type="button" onClick={duplicateSelected} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">Duplicate</button><button type="button" onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">{selectedElement.locked ? "Unlock" : "Lock"}</button></div>
          <button type="button" onClick={deleteSelected} className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700">Delete element</button>
        </div>
      </aside>
    );
  }

  if (selectedElement?.kind === "qr") {
    return (
      <aside className="max-h-[55vh] overflow-y-auto border-t border-zinc-200 bg-white p-4 lg:max-h-none lg:border-l lg:border-t-0">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-700">Ticket QR</p>
        <p className="mt-3 text-sm leading-6 text-zinc-700">This code opens your event page. Place it on a clear part of the flyer and scan a downloaded copy before printing.</p>
        <p className="mt-3 break-all rounded-xl border border-zinc-200 bg-zinc-100 p-3 text-xs text-zinc-700">{selectedElement.text}</p>
        <label className="mt-5 block text-xs font-bold text-zinc-700">
          QR size
          <input
            type="range"
            min={96}
            max={240}
            value={Math.round(Math.max(selectedElement.width, selectedElement.height))}
            onChange={(event) => {
              const size = Number(event.target.value);
              updateElement(selectedElement.id, {
                width: size,
                height: size,
                x: Math.min(selectedElement.x, CANVAS_WIDTH - size),
                y: Math.min(selectedElement.y, canvasHeight - size),
              });
            }}
            className="mt-3 w-full"
          />
        </label>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={duplicateSelected} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">Duplicate</button>
          <button type="button" onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black">{selectedElement.locked ? "Unlock" : "Lock"}</button>
        </div>
        <button type="button" onClick={deleteSelected} className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700">Remove QR</button>
      </aside>
    );
  }

  return (
    <aside className="max-h-[55vh] overflow-y-auto border-t border-zinc-200 bg-white p-4 lg:max-h-none lg:border-l lg:border-t-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-700">
        Properties
      </p>

      {selectedElement ? (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {(["x", "y"] as const).map((axis) => (
              <label key={axis} className="text-xs font-bold text-zinc-700">
                {axis === "x" ? "X position" : "Y position"}
                <input
                  type="number"
                  value={Math.round(selectedElement[axis])}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) updateElement(selectedElement.id, { [axis]: value });
                  }}
                  className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"
                />
              </label>
            ))}
          </div>
          <ElementColorControl element={selectedElement} selectionCount={selectionCount} onChange={applyColorToSelection} />
          <div>
            <label className="text-xs font-bold text-zinc-700">Text</label>
            <textarea
              value={selectedElement.text}
              onChange={(event) =>
                updateElement(selectedElement.id, {
                  text: event.target.value,
                })
              }
              className="mt-2 min-h-24 w-full rounded-xl border border-zinc-200 bg-zinc-100 p-3 text-sm outline-none"
            />
          </div>

          <label className="block text-xs font-bold text-zinc-700">
            Font
            <select
              value={selectedElement.fontFamily ?? fontOptions[0].stack}
              onChange={(event) => updateElement(selectedElement.id, { fontFamily: event.target.value })}
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"
            >
              {fontOptions.map((font) => (
                <option key={font.name} value={font.stack} style={{ fontFamily: font.stack }}>
                  {font.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-zinc-700">
              Width
              <input
                type="number"
                value={Math.round(selectedElement.width)}
                onChange={(event) =>
                  updateElement(selectedElement.id, {
                    width: Math.max(MIN_WIDTH, Number(event.target.value)),
                  })
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"
              />
            </label>
            <label className="text-xs font-bold text-zinc-700">
              Height
              <input
                type="number"
                value={Math.round(selectedElement.height)}
                onChange={(event) =>
                  updateElement(selectedElement.id, {
                    height: Math.max(MIN_HEIGHT, Number(event.target.value)),
                  })
                }
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"
              />
            </label>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-700">
              Font size
            </label>
            <input
              type="range"
              min={8}
              max={120}
              value={selectedElement.fontSize}
              onChange={(event) =>
                updateElement(selectedElement.id, {
                  fontSize: Number(event.target.value),
                })
              }
              className="mt-2 w-full"
            />
            <input
              type="number"
              min={8}
              max={120}
              value={selectedElement.fontSize}
              onChange={(event) => updateElement(selectedElement.id, { fontSize: Math.min(120, Math.max(8, Number(event.target.value) || 8)) })}
              aria-label="Font size in pixels"
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"
            />
          </div>

          <label className="block text-xs font-bold text-zinc-700">
            Letter spacing (px)
            <input
              type="number"
              min={-2}
              max={20}
              step={0.5}
              value={selectedElement.letterSpacing ?? 0}
              onChange={(event) => updateElement(selectedElement.id, { letterSpacing: Math.min(20, Math.max(-2, Number(event.target.value) || 0)) })}
              className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-100 p-2 text-zinc-950"
            />
          </label>

          <label className="block text-xs font-bold text-zinc-700">
            Line spacing
            <input type="range" min={0.8} max={2} step={0.05} value={selectedElement.lineHeight ?? 1.05} onChange={(event) => updateElement(selectedElement.id, { lineHeight: Number(event.target.value) })} className="mt-2 w-full" />
          </label>

          <label className="block text-xs font-bold text-zinc-700">
            Text opacity
            <input type="range" min={10} max={100} value={Math.round((selectedElement.opacity ?? 1) * 100)} onChange={(event) => updateElement(selectedElement.id, { opacity: Number(event.target.value) / 100 })} className="mt-2 w-full" />
          </label>
          <BlendControl element={selectedElement} update={updateElement} />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-3 text-xs font-black text-zinc-700">Outline & effects</p>
            <label className="block text-xs font-bold text-zinc-700">Outline width
              <input type="range" min={0} max={6} step={0.5} value={selectedElement.textStrokeWidth ?? 0} onChange={(event) => updateElement(selectedElement.id, { textStrokeWidth: Number(event.target.value) })} className="mt-2 w-full" />
            </label>
            <label className="mt-3 flex items-center justify-between text-xs font-bold text-zinc-700">Outline color
              <input type="color" value={selectedElement.textStrokeColor ?? "#000000"} onChange={(event) => updateElement(selectedElement.id, { textStrokeColor: event.target.value })} className="h-8 w-12" />
            </label>
            <button type="button" aria-pressed={Boolean(selectedElement.glow)} onClick={() => updateElement(selectedElement.id, { glow: !selectedElement.glow })} className={selectedElement.glow ? "mt-3 w-full rounded-lg border border-violet-400/60 bg-violet-500/20 px-3 py-2 text-xs font-black" : "mt-3 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"}>
              {selectedElement.glow ? "Glow on" : "Add glow"}
            </button>
          </div>

          <button
            type="button"
            aria-pressed={Boolean(selectedElement.uppercase)}
            onClick={() => updateElement(selectedElement.id, { uppercase: !selectedElement.uppercase })}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"
          >
            {selectedElement.uppercase ? "Uppercase on" : "Uppercase off"}
          </button>

          <div className="grid grid-cols-3 gap-2">
            {(["left", "center", "right"] as TextAlign[]).map(
              (alignment) => (
                <button
                  key={alignment}
                  type="button"
                  onClick={() =>
                    updateElement(selectedElement.id, { align: alignment })
                  }
                  className={`rounded-lg border px-2 py-2 text-xs font-black ${selectedElement.align === alignment ? "border-violet-400 bg-violet-500/20" : "border-zinc-200 bg-zinc-50"}`}
                >
                  {alignment}
                </button>
              )
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-xs font-bold text-zinc-700">Position on canvas</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["left", "Left"],
                ["center", "Center"],
                ["right", "Right"],
                ["top", "Top"],
                ["middle", "Middle"],
                ["bottom", "Bottom"],
              ] as const).map(([alignment, label]) => (
                <button
                  key={alignment}
                  type="button"
                  onClick={() => alignToCanvas(alignment)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-xs font-bold transition hover:border-violet-400/60 hover:bg-violet-500/15"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight >= 700 ? 400 : 900 })}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"
          >
            Bold
          </button>

          <button
            type="button"
            aria-pressed={Boolean(selectedElement.textShadow)}
            onClick={() =>
              updateElement(selectedElement.id, {
                textShadow: !selectedElement.textShadow,
              })
            }
            className={selectedElement.textShadow
              ? "w-full rounded-lg border border-violet-400/60 bg-violet-500/20 px-3 py-2 text-xs font-black"
              : "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"}
          >
            {selectedElement.textShadow ? "Text shadow on" : "Add text shadow"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => moveLayer("up")}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"
            >
              Move up
            </button>
            <button
              type="button"
              onClick={() => moveLayer("down")}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"
            >
              Move down
            </button>
            <button
              type="button"
              onClick={duplicateSelected}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() =>
                updateElement(selectedElement.id, {
                  locked: !selectedElement.locked,
                })
              }
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-black"
            >
              {selectedElement.locked ? "Unlock" : "Lock"}
            </button>
          </div>

          <button
            type="button"
            onClick={deleteSelected}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700"
          >
            Delete element
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-zinc-700">
          Select an element on the canvas to edit its properties.
        </p>
      )}
    </aside>
  );
}
