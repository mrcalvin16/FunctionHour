import { MIN_HEIGHT, MIN_WIDTH } from "./config";
import type { CanvasElement, TextAlign } from "./types";

export default function PropertiesPanel({
  selectedElement,
  updateElement,
  moveLayer,
  alignToCanvas,
  duplicateSelected,
  deleteSelected,
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
}) {
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
