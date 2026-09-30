import { useRef, useState, type MutableRefObject } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, MapPin, Music2, PartyPopper, Sparkles, Star, Ticket, type LucideIcon } from "lucide-react";
import { backgroundPresets, CANVAS_WIDTH, formats, resizeHandles } from "./config";
import { resizeHandleClass } from "./editor-utils";
import type {
  CanvasElement,
  Guide,
  ResizeHandle,
} from "./types";

const flyerIcons: Record<string, LucideIcon> = {
  music: Music2,
  location: MapPin,
  ticket: Ticket,
  calendar: CalendarDays,
  party: PartyPopper,
  sparkle: Sparkles,
  star: Star,
};

type UpdateElement = (
  id: string,
  patch:
    | Partial<CanvasElement>
    | ((element: CanvasElement) => Partial<CanvasElement>),
  recordHistory?: boolean
) => void;

export default function CanvasStage({
  canvasRef,
  format,
  onFormatChange,
  zoom,
  onZoomChange,
  canvasTool,
  onCanvasToolChange,
  onMarqueeSelect,
  canvasHeight,
  canvasScale,
  imagePreview,
  backgroundPreset,
  overlayStrength,
  elements,
  selectedElementId,
  selectedElementIds,
  editingElementId,
  guides,
  onPointerMove,
  onInteractionFinish,
  onClearSelection,
  onBeginDrag,
  onBeginResize,
  onStartInlineEditing,
  onFinishInlineEditing,
  updateElement,
}: {
  canvasRef: MutableRefObject<HTMLDivElement | null>;
  format: string;
  onFormatChange: (format: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canvasTool: "select" | "marquee" | "hand";
  onCanvasToolChange: (tool: "select" | "marquee" | "hand") => void;
  onMarqueeSelect: (rect: { x: number; y: number; width: number; height: number }) => void;
  canvasHeight: number;
  canvasScale: number;
  imagePreview: string;
  backgroundPreset: string;
  overlayStrength: number;
  elements: CanvasElement[];
  selectedElementId: string;
  selectedElementIds: string[];
  editingElementId: string | null;
  guides: Guide[];
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onInteractionFinish: () => void;
  onClearSelection: () => void;
  onBeginDrag: (
    event: React.PointerEvent<HTMLDivElement>,
    element: CanvasElement
  ) => void;
  onBeginResize: (
    event: React.PointerEvent<HTMLButtonElement>,
    element: CanvasElement,
    handle: ResizeHandle
  ) => void;
  onStartInlineEditing: (
    event: React.MouseEvent<HTMLDivElement>,
    element: CanvasElement
  ) => void;
  onFinishInlineEditing: () => void;
  updateElement: UpdateElement;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  function canvasPoint(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    return { x: Math.max(0, Math.min(CANVAS_WIDTH, (event.clientX - (bounds?.left ?? 0)) / canvasScale)), y: Math.max(0, Math.min(canvasHeight, (event.clientY - (bounds?.top ?? 0)) / canvasScale)) };
  }
  const selectedBackground =
    backgroundPresets.find((preset) => preset.id === backgroundPreset) ||
    backgroundPresets[0];

  return (
    <section className="relative flex min-h-[70vh] min-w-0 flex-col bg-[#ececef] text-black lg:min-h-0">
      <div className="flex min-h-[56px] flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-white px-3 py-2 sm:px-4">
        <div className="flex max-w-full items-center gap-2 overflow-x-auto">
          {formats.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFormatChange(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black ${format === item.id ? "bg-black text-white" : "bg-black/5 text-black/55"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(["select", "marquee", "hand"] as const).map((tool) => (
            <button key={tool} type="button" aria-pressed={canvasTool === tool} onClick={() => onCanvasToolChange(tool)} className={`rounded-lg border px-2 py-2 text-xs font-black capitalize ${canvasTool === tool ? "border-violet-600 bg-violet-600 text-white" : "border-black/10 bg-white text-zinc-900"}`}>{tool === "marquee" ? "Select area" : tool}</button>
          ))}
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(25, zoom - 5))}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm font-black"
          >
            −
          </button>
          <span className="min-w-12 text-center text-xs font-black">
            {zoom}%
          </span>
          <input aria-label="Scrub canvas zoom" type="range" min={25} max={250} value={zoom} onChange={(event) => onZoomChange(Number(event.target.value))} className="w-16 accent-violet-600 sm:w-24" />
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(250, zoom + 5))}
            className="rounded-lg border border-black/10 px-3 py-2 text-sm font-black"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-black/10 bg-white/80 px-4 py-2 text-[11px] font-medium text-zinc-600">
        <span><strong className="text-zinc-900">Select</strong> an element</span>
        <span><strong className="text-zinc-900">Shift-click</strong> to multi-select</span>
        <span><strong className="text-zinc-900">Drag</strong> to move selected items</span>
        <span><strong className="text-zinc-900">Space + drag</strong> to pan · <strong className="text-zinc-900">Ctrl/⌘ + wheel</strong> to zoom</span>
        <span><strong className="text-zinc-900">Double-click</strong> text to edit</span>
        <span><strong className="text-zinc-900">Resize handles</strong> adjust size</span>
      </div>

      <div ref={viewportRef} className={`flex flex-1 items-start overflow-auto p-4 sm:p-8 lg:p-12 ${canvasTool === "hand" ? "cursor-grab active:cursor-grabbing" : ""}`}
        onPointerDown={(event) => { if (canvasTool !== "hand" || !viewportRef.current) return; panRef.current = { x: event.clientX, y: event.clientY, left: viewportRef.current.scrollLeft, top: viewportRef.current.scrollTop }; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); }}
        onPointerMove={(event) => { if (!panRef.current || !viewportRef.current) return; viewportRef.current.scrollLeft = panRef.current.left - event.clientX + panRef.current.x; viewportRef.current.scrollTop = panRef.current.top - event.clientY + panRef.current.y; }}
        onPointerUp={() => { panRef.current = null; }}
        onPointerCancel={() => { panRef.current = null; }}
        onWheel={(event) => { if (event.ctrlKey || event.metaKey || event.altKey) { event.preventDefault(); onZoomChange(Math.min(250, Math.max(25, zoom - Math.sign(event.deltaY) * 5))); } }}
      >
        <div
          className="relative m-auto shrink-0"
          style={{
            width: CANVAS_WIDTH * canvasScale,
            height: canvasHeight * canvasScale,
          }}
        >
          <div
            ref={canvasRef}
            className="absolute left-0 top-0 origin-top-left overflow-hidden bg-black shadow-2xl"
            style={{
              width: CANVAS_WIDTH,
              height: canvasHeight,
              transform: `scale(${canvasScale})`,
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onInteractionFinish}
            onPointerCancel={onInteractionFinish}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                onClearSelection();
              }
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: selectedBackground.backgroundImage }}
            />
            {imagePreview ? (
              <img
                src={imagePreview}
                alt=""
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 bg-black"
              style={{ opacity: overlayStrength / 100 }}
            />

            {elements.map((element) => {
              if (element.hidden) return null;
              const isSelected = selectedElementIds.includes(element.id) || selectedElementId === element.id;
              const isEditing = editingElementId === element.id;

              return (
                <div
                  key={element.id}
                  className={`absolute select-none ${element.locked ? "cursor-default" : isEditing ? "cursor-text" : "cursor-move"}`}
                  style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    mixBlendMode: element.blendMode === "normal" ? undefined : element.blendMode,
                  }}
                  onPointerDown={(event) => onBeginDrag(event, element)}
                  onDoubleClick={(event) => {
                    if (element.kind === "text" || element.kind === "button") onStartInlineEditing(event, element);
                  }}
                >
                  {element.kind === "adjustment" ? (
                    <div className="pointer-events-none h-full w-full" style={{ backdropFilter: `brightness(${element.brightness ?? 100}%) contrast(${element.contrast ?? 100}%) saturate(${element.saturation ?? 100}%) blur(${element.blur ?? 0}px)`, background: element.background ?? "transparent", opacity: element.opacity ?? 1 }} />
                  ) : element.kind === "image" && element.imageUrl ? (
                    <img src={element.imageUrl} alt="" draggable={false} className="pointer-events-none h-full w-full" style={{ objectFit: element.objectFit ?? "cover", opacity: element.opacity ?? 1, borderRadius: element.borderRadius, filter: `brightness(${element.brightness ?? 100}%) contrast(${element.contrast ?? 100}%) saturate(${element.saturation ?? 100}%) blur(${element.blur ?? 0}px)` }} />
                  ) : element.kind === "shape" ? (
                    <div className="pointer-events-none h-full w-full" style={{ background: element.background ?? element.color, opacity: element.opacity ?? 1, borderRadius: element.shape === "circle" ? "9999px" : element.borderRadius, border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor ?? "#ffffff"}` : undefined }} />
                  ) : element.kind === "line" ? (
                    <div className="pointer-events-none flex h-full w-full items-center"><div className="w-full" style={{ opacity: element.opacity ?? 1, borderTop: `${Math.max(1, element.borderWidth ?? 3)}px ${element.lineStyle ?? "solid"} ${element.color}` }} /></div>
                  ) : element.kind === "frame" ? (
                    <div className="pointer-events-none h-full w-full" style={{ opacity: element.opacity ?? 1, border: `${Math.max(1, element.borderWidth ?? 4)}px solid ${element.borderColor ?? element.color}`, borderRadius: element.frameShape === "circle" ? "9999px" : element.borderRadius ?? 16, background: "transparent" }} />
                  ) : element.kind === "icon" ? (() => { const Icon = flyerIcons[element.iconName ?? "star"] ?? Star; return <div className="pointer-events-none flex h-full w-full items-center justify-center" style={{ opacity: element.opacity ?? 1, color: element.color }}><Icon width="100%" height="100%" strokeWidth={Math.max(1, element.borderWidth ?? 2)} /></div>; })()
                  : element.kind === "sticker" ? (
                    <div className={`pointer-events-none flex h-full w-full items-center justify-center px-3 text-center font-black uppercase ${element.stickerStyle === "pill" ? "rounded-full" : element.stickerStyle === "burst" ? "[clip-path:polygon(50%_0%,61%_18%,79%_7%,82%_29%,100%_34%,88%_52%,100%_67%,79%_72%,78%_94%,59%_83%,48%_100%,38%_82%,17%_94%,18%_71%,0%_66%,13%_50%,0%_33%,20%_28%,20%_6%,40%_18%)]" : "rounded-2xl"}`} style={{ background: element.background ?? element.color, color: element.borderColor ?? "#ffffff", opacity: element.opacity ?? 1, fontSize: element.fontSize, border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor ?? "#ffffff"}` : undefined }}>{element.text}</div>
                  ) : element.kind === "qr" ? (
                    <div className="flex h-full w-full items-center justify-center bg-white p-2" aria-label="Ticket QR code">
                      <QRCodeSVG
                        value={element.text}
                        size={Math.max(64, Math.min(element.width, element.height) - 16)}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                        style={{ maxWidth: "100%", maxHeight: "100%" }}
                      />
                    </div>
                  ) : <div
                    data-editable-id={element.id}
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    onInput={(event) =>
                      updateElement(
                        element.id,
                        { text: event.currentTarget.textContent || "" },
                        false
                      )
                    }
                    onBlur={onFinishInlineEditing}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Escape") {
                        event.preventDefault();
                        onFinishInlineEditing();
                      }
                    }}
                    className="flex h-full w-full items-center whitespace-pre-wrap break-words outline-none"
                    style={{
                      justifyContent:
                        element.align === "left"
                          ? "flex-start"
                          : element.align === "right"
                            ? "flex-end"
                            : "center",
                      textAlign: element.align,
                      fontSize: element.fontSize,
                      fontFamily: element.fontFamily,
                      fontWeight: element.fontWeight,
                      color: element.color,
                      opacity: element.opacity ?? 1,
                      WebkitTextStroke: element.textStrokeWidth ? `${element.textStrokeWidth}px ${element.textStrokeColor ?? "#000000"}` : undefined,
                      textShadow: element.glow ? `0 0 8px ${element.color}, 0 0 20px ${element.color}` : element.textShadow ? "0 3px 14px rgba(0,0,0,0.9)" : undefined,
                      letterSpacing: element.letterSpacing,
                      textTransform: element.uppercase ? "uppercase" : "none",
                      borderRadius: element.borderRadius,
                      background:
                        element.kind === "button"
                          ? element.background
                          : undefined,
                      padding: element.kind === "button" ? "0 16px" : undefined,
                      lineHeight: element.kind === "button" ? 1 : (element.lineHeight ?? 1.05),
                    }}
                  >
                    {element.text}
                  </div>}

                  {isSelected && !isEditing ? (
                    <>
                      <div data-export-ui="true" className="pointer-events-none absolute inset-0 border-2 border-violet-500" />
                      <div data-export-ui="true" className="pointer-events-none absolute -top-7 left-0 rounded bg-violet-600 px-2 py-1 text-[10px] font-black text-white">
                        {Math.round(element.width)} × {Math.round(element.height)}
                      </div>
                      {!element.locked
                        ? resizeHandles.map((handle) => (
                            <button
                              key={handle}
                              data-export-ui="true"
                              type="button"
                              aria-label={`Resize ${handle}`}
                              onPointerDown={(event) =>
                                onBeginResize(event, element, handle)
                              }
                              className={`absolute z-20 h-3 w-3 rounded-full border-2 border-white bg-violet-600 ${resizeHandleClass(handle)}`}
                            />
                          ))
                        : null}
                    </>
                  ) : null}
                </div>
              );
            })}

            {canvasTool !== "select" && (
              <div data-export-ui="true" className={`absolute inset-0 z-[998] touch-none ${canvasTool === "hand" ? "cursor-grab" : "cursor-crosshair"}`}
                onPointerDown={(event) => { if (canvasTool !== "marquee") return; const start = canvasPoint(event); marqueeStartRef.current = start; setMarquee({ ...start, width: 0, height: 0 }); event.currentTarget.setPointerCapture(event.pointerId); }}
                onPointerMove={(event) => { if (!marqueeStartRef.current) return; const start = marqueeStartRef.current; const point = canvasPoint(event); setMarquee({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) }); }}
                onPointerUp={(event) => { if (!marqueeStartRef.current) return; const start = marqueeStartRef.current; const point = canvasPoint(event); const rect = { x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) }; onMarqueeSelect(rect); marqueeStartRef.current = null; setMarquee(null); }}
                onPointerCancel={() => { marqueeStartRef.current = null; setMarquee(null); }}
              />
            )}
            {marquee && <div data-export-ui="true" className="pointer-events-none absolute z-[999] border-2 border-dashed border-violet-500 bg-violet-500/20" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}

            {guides.map((guide, index) => (
              <div
                key={`${guide.axis}-${guide.position}-${index}`}
                data-export-ui="true"
                className={`pointer-events-none absolute z-[999] bg-cyan-400 ${guide.axis === "x" ? "bottom-0 top-0 w-px" : "left-0 right-0 h-px"}`}
                style={
                  guide.axis === "x"
                    ? { left: guide.position }
                    : { top: guide.position }
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
