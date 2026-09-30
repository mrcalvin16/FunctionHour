"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

type Tool = "remove" | "heal" | "erase" | "history" | "mask" | "hand";
type Point = { x: number; y: number };

export default function BackgroundEraser({ imageUrl, onSave, onClose }: {
  imageUrl: string; onSave: (image: Blob) => Promise<void>; onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<ImageData | null>(null);
  const strokeSourceRef = useRef<ImageData | null>(null);
  const drawing = useRef(false);
  const previous = useRef<Point | null>(null);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const maskPixelsRef = useRef<Uint8ClampedArray | null>(null);
  const toolBeforeSpace = useRef<Tool | null>(null);
  const snapshots = useRef<ImageData[]>([]);
  const [tool, setTool] = useState<Tool>("remove");
  const [hasMask, setHasMask] = useState(false);
  const [brushSize, setBrushSize] = useState(36);
  const [zoom, setZoom] = useState(100);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      if (maskCanvasRef.current) { maskCanvasRef.current.width = canvas.width; maskCanvasRef.current.height = canvas.height; }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      originalRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      snapshots.current = [];
      setLoaded(true);
      setVersion((value) => value + 1);
    };
    image.onerror = () => setError("The image cannot be edited here. Upload the original image and try again.");
    image.src = imageUrl;
    return () => { image.onload = null; image.onerror = null; };
  }, [imageUrl]);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat && toolBeforeSpace.current === null) { toolBeforeSpace.current = tool; setTool("hand"); }
      } else if (event.key.toLowerCase() === "h") setTool("hand");
      else if (event.key === "+" || event.key === "=") setZoom((value) => Math.min(300, value + 10));
      else if (event.key === "-" || event.key === "_") setZoom((value) => Math.max(25, value - 10));
    }
    function keyUp(event: KeyboardEvent) {
      if (event.code === "Space" && toolBeforeSpace.current) { setTool(toolBeforeSpace.current); toolBeforeSpace.current = null; }
    }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  }, [tool]);

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)), y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)) };
  }
  function maskStroke(from: Point, to: Point) {
    const ctx = maskCanvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = "rgba(220, 38, 38, 0.55)";
    ctx.fillStyle = "rgba(220, 38, 38, 0.55)";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(to.x, to.y, brushSize / 2, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
  }
  function dab(next: Point) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || !strokeSourceRef.current || !originalRef.current) return;
    const radius = Math.max(4, brushSize / 2);
    const x0 = Math.max(0, Math.floor(next.x - radius - 1));
    const y0 = Math.max(0, Math.floor(next.y - radius - 1));
    const x1 = Math.min(canvas.width, Math.ceil(next.x + radius + 1));
    const y1 = Math.min(canvas.height, Math.ceil(next.y + radius + 1));
    if (x1 <= x0 || y1 <= y0) return;
    const patch = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
    const source = tool === "history" ? originalRef.current.data : strokeSourceRef.current.data;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (hasMask && !maskPixelsRef.current?.[(y * canvas.width + x) * 4 + 3]) continue;
      const dist = Math.hypot(x - next.x, y - next.y);
      if (dist > radius) continue;
      const feather = Math.min(1, Math.max(0, (radius - dist) / Math.max(3, radius * 0.32)));
      const pixel = ((y - y0) * patch.width + x - x0) * 4;
      const sourcePixel = (y * canvas.width + x) * 4;
      if (tool === "erase") { patch.data[pixel + 3] = Math.round(patch.data[pixel + 3] * (1 - feather)); continue; }
      if (tool === "history") {
        for (let channel = 0; channel < 4; channel++) patch.data[pixel + channel] = Math.round(patch.data[pixel + channel] * (1 - feather) + source[sourcePixel + channel] * feather);
        continue;
      }
      // Neighboring color samples from the stroke's original pixels avoid
      // repeatedly sampling already retouched pixels during a drag.
      const sampleRadius = radius * (tool === "heal" ? 1.4 : 1.8);
      const channels = [0, 0, 0, 0];
      let weightSum = 0;
      for (let i = 0; i < 12; i++) {
        const angle = 2 * Math.PI * i / 12;
        const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x + Math.cos(angle) * sampleRadius)));
        const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y + Math.sin(angle) * sampleRadius)));
        const idx = (sy * canvas.width + sx) * 4;
        const weight = source[idx + 3] / 255;
        if (!weight) continue;
        for (let channel = 0; channel < 4; channel++) channels[channel] += source[idx + channel] * weight;
        weightSum += weight;
      }
      if (!weightSum) continue;
      const strength = feather * (tool === "heal" ? 0.65 : 1);
      for (let channel = 0; channel < 4; channel++) patch.data[pixel + channel] = Math.round(patch.data[pixel + channel] * (1 - strength) + channels[channel] / weightSum * strength);
    }
    ctx.putImageData(patch, x0, y0);
  }
  function paint(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const next = point(event);
    if (tool === "mask") { maskStroke(previous.current ?? next, next); previous.current = next; return; }
    if (tool === "hand" && panStart.current && viewportRef.current) {
      viewportRef.current.scrollLeft = panStart.current.left - event.clientX + panStart.current.x;
      viewportRef.current.scrollTop = panStart.current.top - event.clientY + panStart.current.y;
      return;
    }
    const from = previous.current ?? next;
    const steps = Math.max(1, Math.ceil(Math.hypot(next.x - from.x, next.y - from.y) / Math.max(4, brushSize / 5)));
    for (let i = 1; i <= steps; i++) dab({ x: from.x + (next.x - from.x) * i / steps, y: from.y + (next.y - from.y) * i / steps });
    previous.current = next;
  }
  function start(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || !loaded) return;
    drawing.current = true;
    previous.current = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (tool === "hand") { panStart.current = { x: event.clientX, y: event.clientY, left: viewportRef.current?.scrollLeft ?? 0, top: viewportRef.current?.scrollTop ?? 0 }; return; }
    if (tool === "mask") { maskStroke(previous.current, previous.current); return; }
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      snapshots.current.push(snapshot);
      if (snapshots.current.length > 20) snapshots.current.shift();
      strokeSourceRef.current = snapshot;
      setVersion((value) => value + 1);
      dab(previous.current);
    } catch { setError("The image cannot be edited. Upload it from your device instead."); drawing.current = false; }
  }
  function finish() {
    if (drawing.current && tool === "mask" && maskCanvasRef.current) {
      const canvas = maskCanvasRef.current;
      maskPixelsRef.current = canvas.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, canvas.width, canvas.height).data ?? null;
      setHasMask(true);
    }
    drawing.current = false;
    previous.current = null;
    panStart.current = null;
  }
  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    setSaving(true); setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not export the image.")), "image/png"));
      await onSave(blob);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the edited image."); }
    finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 p-4 text-white sm:p-6" role="dialog" aria-modal="true" aria-label="Retouch image">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black">Retouch image</h2><p className="text-sm text-zinc-300">Remove small distractions, heal spots, erase to transparency, or brush back the original.</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-white/30 px-4 py-2 font-bold">Cancel</button><button type="button" onClick={() => void save()} disabled={saving || !loaded} className="rounded-xl bg-violet-600 px-4 py-2 font-bold disabled:opacity-50">{saving ? "Saving…" : "Apply to flyer"}</button></div>
      </div>
      <div className="mx-auto mt-4 flex w-full max-w-6xl flex-wrap items-center gap-2">
        {([ ["remove", "Remove"], ["heal", "Spot heal"], ["erase", "Erase"], ["history", "History brush"], ["mask", "Quick mask"], ["hand", "Hand"] ] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => setTool(id)} className={`rounded-lg border px-3 py-2 text-sm font-bold ${tool === id ? "border-violet-400 bg-violet-600" : "border-white/30 bg-white/10"}`}>{label}</button>)}
        <label className="flex items-center gap-2 px-2 text-sm font-bold">Brush <input type="range" min="8" max="160" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />{brushSize}px</label>
        <button type="button" disabled={!snapshots.current.length} onClick={() => { const snapshot = snapshots.current.pop(); if (snapshot) canvasRef.current?.getContext("2d")?.putImageData(snapshot, 0, 0); setVersion((value) => value + 1); }} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-bold disabled:opacity-40">Undo stroke</button>
        {hasMask && <button type="button" onClick={() => { maskCanvasRef.current?.getContext("2d")?.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height); maskPixelsRef.current = null; setHasMask(false); }} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-bold">Clear mask</button>}
        <button type="button" onClick={() => setZoom((value) => Math.max(25, value - 25))} className="rounded-lg border border-white/30 px-3 py-2 font-bold">−</button><span className="text-sm font-bold">{zoom}%</span><input aria-label="Scrub image zoom" type="range" min="25" max="300" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-24 accent-violet-500" /><button type="button" onClick={() => setZoom((value) => Math.min(300, value + 25))} className="rounded-lg border border-white/30 px-3 py-2 font-bold">+</button>
      </div>
      <p className="mx-auto mt-2 w-full max-w-6xl text-xs text-zinc-300">Quick mask: paint red over the area you want other brushes to affect; clear the mask to edit anywhere. Remove and Spot heal use neighboring colors and work best for small objects. Hold Space to pan; scrub the zoom slider or use Ctrl/⌘ + wheel.</p>
      {error && <p role="alert" className="mx-auto mt-3 w-full max-w-6xl text-sm text-red-300">{error}</p>}
      <div ref={viewportRef} onWheel={(event) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom((value) => Math.min(300, Math.max(25, value - Math.sign(event.deltaY) * 10))); } }} className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl bg-[conic-gradient(#ddd_25%,#fff_0_50%,#ddd_0_75%,#fff_0)] bg-[length:24px_24px] p-3">
        <div className="relative m-auto w-fit" style={{ width: canvasRef.current ? canvasRef.current.width * zoom / 100 : undefined, height: canvasRef.current ? canvasRef.current.height * zoom / 100 : undefined }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} className={`touch-none ${tool === "hand" ? "cursor-grab" : "cursor-crosshair"}`} onPointerDown={start} onPointerMove={paint} onPointerUp={finish} onPointerCancel={finish} data-history-version={version} />
          <canvas ref={maskCanvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
        </div>
      </div>
    </div>
  );
}
