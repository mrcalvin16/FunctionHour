"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export default function BackgroundEraser({
  imageUrl,
  onSave,
  onClose,
}: {
  imageUrl: string;
  onSave: (image: Blob) => Promise<void>;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const previous = useRef<{ x: number; y: number } | null>(null);
  const snapshots = useRef<ImageData[]>([]);
  const [brushSize, setBrushSize] = useState(40);
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
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      snapshots.current = [];
      setLoaded(true);
      setVersion((current) => current + 1);
    };
    image.onerror = () => setError("This image cannot be edited here. Upload the original image and try again.");
    image.src = imageUrl;
    return () => { image.onload = null; image.onerror = null; };
  }, [imageUrl]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function erase(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const next = point(event);
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(previous.current?.x ?? next.x, previous.current?.y ?? next.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(next.x, next.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    previous.current = next;
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !loaded) return;
    try {
      snapshots.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (snapshots.current.length > 8) snapshots.current.shift();
      setVersion((current) => current + 1);
      drawing.current = true;
      previous.current = point(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      erase(event);
    } catch {
      setError("The original image does not allow editing. Upload it from your device instead.");
    }
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    setSaving(true);
    setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not export the image.")), "image/png")
      );
      await onSave(blob);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the edited image.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 p-4 text-white sm:p-6" role="dialog" aria-modal="true" aria-label="Erase background image">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Erase parts of your image</h2>
          <p className="text-sm text-zinc-300">Brush over the area to make it transparent. The flyer behind it will show through.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/30 px-4 py-2 font-bold">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={saving || !loaded} className="rounded-xl bg-violet-600 px-4 py-2 font-bold disabled:opacity-50">
            {saving ? "Saving…" : "Apply to flyer"}
          </button>
        </div>
      </div>
      <div className="mx-auto mt-4 flex w-full max-w-5xl items-center gap-4">
        <label className="flex items-center gap-3 text-sm font-bold">Brush size
          <input type="range" min="8" max="160" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} />
          <span>{brushSize}px</span>
        </label>
        <button type="button" disabled={!snapshots.current.length} onClick={() => {
          const snapshot = snapshots.current.pop();
          if (snapshot) canvasRef.current?.getContext("2d")?.putImageData(snapshot, 0, 0);
          setVersion((current) => current + 1);
        }} className="rounded-lg border border-white/30 px-3 py-2 text-sm font-bold disabled:opacity-40">Undo erase</button>
      </div>
      {error && <p role="alert" className="mx-auto mt-3 w-full max-w-5xl text-sm text-red-300">{error}</p>}
      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl bg-[conic-gradient(#ddd_25%,#fff_0_50%,#ddd_0_75%,#fff_0)] bg-[length:24px_24px] p-3">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full cursor-crosshair touch-none object-contain"
          onPointerDown={start}
          onPointerMove={erase}
          onPointerUp={() => { drawing.current = false; previous.current = null; }}
          onPointerCancel={() => { drawing.current = false; previous.current = null; }}
          data-history-version={version}
        />
      </div>
    </div>
  );
}
