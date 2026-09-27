import { CANVAS_WIDTH, MIN_HEIGHT, MIN_WIDTH } from "./config";
import type { CanvasElement, TextAlign } from "./types";

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

export default function PropertiesPanel({
  selectedElement,
  updateElement,
  moveLayer,
  alignToCanvas,
  duplicateSelected,
  deleteSelected,
  canvasHeight,
}: {
  selectedElement: CanvasElement | null;
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
}) {
  if (selectedElement?.kind === "image" || selectedElement?.kind === "shape") {
    const isImage = selectedElement.kind === "image";
    return (
      <aside className="max-h-[55vh] overflow-y-auto border-t border-white/10 bg-[#1b1b1b] p-4 lg:max-h-none lg:border-l lg:border-t-0">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">{isImage ? "Image" : "Shape"}</p>
        <div className="mt-4 space-y-4">
          <label className="block text-xs font-bold text-white/70">Opacity
            <input type="range" min={10} max={100} value={Math.round((selectedElement.opacity ?? 1) * 100)} onChange={(event) => updateElement(selectedElement.id, { opacity: Number(event.target.value) / 100 })} className="mt-2 w-full" />
          </label>
          {isImage ? <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            {([
              ["brightness", "Brightness", 0, 200],
              ["contrast", "Contrast", 0, 200],
              ["saturation", "Saturation", 0, 200],
              ["blur", "Blur", 0, 20],
            ] as const).map(([key, label, min, max]) => (
              <label key={key} className="block text-xs font-bold text-white/70">{label}
                <div className="mt-2 flex items-center gap-3">
                  <input type="range" min={min} max={max} value={selectedElement[key] ?? (key === "blur" ? 0 : 100)} onChange={(event) => updateElement(selectedElement.id, { [key]: Number(event.target.value) })} className="w-full" />
                  <span className="w-10 text-right text-[11px] text-white/50">{selectedElement[key] ?? (key === "blur" ? 0 : 100)}</span>
                </div>
              </label>
            ))}
            <label className="block text-xs font-bold text-white/70">Corner radius
              <input type="range" min={0} max={100} value={selectedElement.borderRadius ?? 0} onChange={(event) => updateElement(selectedElement.id, { borderRadius: Number(event.target.value) })} className="mt-2 w-full" />
            </label>
            <button type="button" onClick={() => updateElement(selectedElement.id, { brightness: 100, contrast: 100, saturation: 100, blur: 0, borderRadius: 0, opacity: 1 })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">Reset image adjustments</button>
          </div> : null}
          {isImage ? <label className="block text-xs font-bold text-white/70">Image fit
            <select value={selectedElement.objectFit ?? "cover"} onChange={(event) => updateElement(selectedElement.id, { objectFit: event.target.value as "cover" | "contain" })} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"><option value="cover">Fill frame</option><option value="contain">Fit inside</option></select>
          </label> : <><label className="block text-xs font-bold text-white/70">Fill<input type="color" value={selectedElement.background ?? selectedElement.color} onChange={(event) => updateElement(selectedElement.id, { background: event.target.value })} className="mt-2 block h-10 w-full" /></label><button type="button" onClick={() => updateElement(selectedElement.id, { shape: selectedElement.shape === "circle" ? "rectangle" : "circle" })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">{selectedElement.shape === "circle" ? "Make rectangle" : "Make circle"}</button></>}
          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => moveLayer("up")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">Move up</button><button type="button" onClick={() => moveLayer("down")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">Move down</button><button type="button" onClick={duplicateSelected} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">Duplicate</button><button type="button" onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">{selectedElement.locked ? "Unlock" : "Lock"}</button></div>
          <button type="button" onClick={deleteSelected} className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300">Delete element</button>
        </div>
      </aside>
    );
  }

  if (selectedElement?.kind === "qr") {
    return (
      <aside className="max-h-[55vh] overflow-y-auto border-t border-white/10 bg-[#1b1b1b] p-4 lg:max-h-none lg:border-l lg:border-t-0">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Ticket QR</p>
        <p className="mt-3 text-sm leading-6 text-white/80">This code opens your event page. Place it on a clear part of the flyer and scan a downloaded copy before printing.</p>
        <p className="mt-3 break-all rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/70">{selectedElement.text}</p>
        <label className="mt-5 block text-xs font-bold text-white/80">
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
          <button type="button" onClick={duplicateSelected} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">Duplicate</button>
          <button type="button" onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">{selectedElement.locked ? "Unlock" : "Lock"}</button>
        </div>
        <button type="button" onClick={deleteSelected} className="mt-4 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300">Remove QR</button>
      </aside>
    );
  }

  return (
    <aside className="max-h-[55vh] overflow-y-auto border-t border-white/10 bg-[#1b1b1b] p-4 lg:max-h-none lg:border-l lg:border-t-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
        Properties
      </p>

      {selectedElement ? (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {(["x", "y"] as const).map((axis) => (
              <label key={axis} className="text-xs font-bold text-white/70">
                {axis === "x" ? "X position" : "Y position"}
                <input
                  type="number"
                  value={Math.round(selectedElement[axis])}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value)) updateElement(selectedElement.id, { [axis]: value });
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"
                />
              </label>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-white/50">Text</label>
            <textarea
              value={selectedElement.text}
              onChange={(event) =>
                updateElement(selectedElement.id, {
                  text: event.target.value,
                })
              }
              className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none"
            />
          </div>

          <label className="block text-xs font-bold text-white/70">
            Font
            <select
              value={selectedElement.fontFamily ?? fontOptions[0].stack}
              onChange={(event) => updateElement(selectedElement.id, { fontFamily: event.target.value })}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"
            >
              {fontOptions.map((font) => (
                <option key={font.name} value={font.stack} style={{ fontFamily: font.stack }}>
                  {font.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-white/50">
              Width
              <input
                type="number"
                value={Math.round(selectedElement.width)}
                onChange={(event) =>
                  updateElement(selectedElement.id, {
                    width: Math.max(MIN_WIDTH, Number(event.target.value)),
                  })
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"
              />
            </label>
            <label className="text-xs font-bold text-white/50">
              Height
              <input
                type="number"
                value={Math.round(selectedElement.height)}
                onChange={(event) =>
                  updateElement(selectedElement.id, {
                    height: Math.max(MIN_HEIGHT, Number(event.target.value)),
                  })
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"
              />
            </label>
          </div>

          <div>
            <label className="text-xs font-bold text-white/50">
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
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"
            />
          </div>

          <label className="block text-xs font-bold text-white/70">
            Letter spacing (px)
            <input
              type="number"
              min={-2}
              max={20}
              step={0.5}
              value={selectedElement.letterSpacing ?? 0}
              onChange={(event) => updateElement(selectedElement.id, { letterSpacing: Math.min(20, Math.max(-2, Number(event.target.value) || 0)) })}
              className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-white"
            />
          </label>

          <label className="block text-xs font-bold text-white/70">
            Line spacing
            <input type="range" min={0.8} max={2} step={0.05} value={selectedElement.lineHeight ?? 1.05} onChange={(event) => updateElement(selectedElement.id, { lineHeight: Number(event.target.value) })} className="mt-2 w-full" />
          </label>

          <label className="block text-xs font-bold text-white/70">
            Text opacity
            <input type="range" min={10} max={100} value={Math.round((selectedElement.opacity ?? 1) * 100)} onChange={(event) => updateElement(selectedElement.id, { opacity: Number(event.target.value) / 100 })} className="mt-2 w-full" />
          </label>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-3 text-xs font-black text-white/70">Outline & effects</p>
            <label className="block text-xs font-bold text-white/60">Outline width
              <input type="range" min={0} max={6} step={0.5} value={selectedElement.textStrokeWidth ?? 0} onChange={(event) => updateElement(selectedElement.id, { textStrokeWidth: Number(event.target.value) })} className="mt-2 w-full" />
            </label>
            <label className="mt-3 flex items-center justify-between text-xs font-bold text-white/60">Outline color
              <input type="color" value={selectedElement.textStrokeColor ?? "#000000"} onChange={(event) => updateElement(selectedElement.id, { textStrokeColor: event.target.value })} className="h-8 w-12" />
            </label>
            <button type="button" aria-pressed={Boolean(selectedElement.glow)} onClick={() => updateElement(selectedElement.id, { glow: !selectedElement.glow })} className={selectedElement.glow ? "mt-3 w-full rounded-lg border border-violet-400/60 bg-violet-500/20 px-3 py-2 text-xs font-black" : "mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"}>
              {selectedElement.glow ? "Glow on" : "Add glow"}
            </button>
          </div>

          <button
            type="button"
            aria-pressed={Boolean(selectedElement.uppercase)}
            onClick={() => updateElement(selectedElement.id, { uppercase: !selectedElement.uppercase })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
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
                  className={`rounded-lg border px-2 py-2 text-xs font-black ${selectedElement.align === alignment ? "border-violet-400 bg-violet-500/20" : "border-white/10 bg-white/5"}`}
                >
                  {alignment}
                </button>
              )
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-xs font-bold text-white/50">Position on canvas</p>
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
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs font-bold transition hover:border-violet-400/60 hover:bg-violet-500/15"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                updateElement(selectedElement.id, {
                  fontWeight: selectedElement.fontWeight >= 700 ? 400 : 900,
                })
              }
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
            >
              Bold
            </button>
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">
              Color
              <input
                type="color"
                value={selectedElement.color}
                onChange={(event) =>
                  updateElement(selectedElement.id, {
                    color: event.target.value,
                  })
                }
                className="h-5 w-5"
              />
            </label>
          </div>

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
              : "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"}
          >
            {selectedElement.textShadow ? "Text shadow on" : "Add text shadow"}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => moveLayer("up")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
            >
              Move up
            </button>
            <button
              type="button"
              onClick={() => moveLayer("down")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
            >
              Move down
            </button>
            <button
              type="button"
              onClick={duplicateSelected}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
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
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
            >
              {selectedElement.locked ? "Unlock" : "Lock"}
            </button>
          </div>

          <button
            type="button"
            onClick={deleteSelected}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
          >
            Delete element
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-white/35">
          Select an element on the canvas to edit its properties.
        </p>
      )}
    </aside>
  );
}
