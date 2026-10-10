"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type OfflineTicketDownloadProps = {
  ticketId: string;
  eventName: string;
  date: string;
  venue: string;
  holderName: string;
  ticketType: string;
};

const WIDTH = 900;
const HEIGHT = 1160;

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight);
      lines++;
      if (lines >= maxLines) return;
      line = word;
    } else {
      line = next;
    }
  }
  if (line && lines < maxLines) context.fillText(line, x, y + lines * lineHeight);
}

export default function OfflineTicketDownload({
  ticketId,
  eventName,
  date,
  venue,
  holderName,
  ticketType,
}: OfflineTicketDownloadProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function savePass() {
    setSaving(true);
    setError(false);
    try {
      // Use the same QR already displayed on the authenticated ticket page.
      // No buyer information or pass data is stored in browser storage.
      const qr = document.querySelector<SVGSVGElement>("#entry-ticket-qr svg");
      if (!qr) throw new Error("QR code is unavailable");

      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image export is unavailable");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, WIDTH, HEIGHT);
      context.fillStyle = "#5b21b6";
      context.fillRect(0, 0, WIDTH, 22);
      context.font = "bold 28px Arial, sans-serif";
      context.fillText("FUNCTION HOUR · ENTRY PASS", 68, 90);
      context.fillStyle = "#18181b";
      context.font = "bold 48px Arial, sans-serif";
      drawWrappedText(context, eventName, 68, 166, 764, 56, 2);

      context.font = "24px Arial, sans-serif";
      context.fillStyle = "#3f3f46";
      drawWrappedText(context, date, 68, 300, 764, 32, 2);
      drawWrappedText(context, venue, 68, 380, 764, 32, 2);
      context.fillStyle = "#18181b";
      context.font = "bold 25px Arial, sans-serif";
      drawWrappedText(context, ticketType, 68, 475, 764, 32, 2);
      context.font = "23px Arial, sans-serif";
      drawWrappedText(context, `Ticket holder: ${holderName}`, 68, 540, 764, 31, 2);

      // Serialize the actual QR SVG, preserving the same ticket ID scanned
      // by the online check-in workflow.
      const svg = qr.cloneNode(true) as SVGSVGElement;
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.setAttribute("width", "512");
      svg.setAttribute("height", "512");
      const svgUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }),
      );
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("QR image could not be drawn"));
          image.src = svgUrl;
        });
        context.drawImage(image, 194, 570, 512, 512);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }

      context.textAlign = "center";
      context.fillStyle = "#18181b";
      context.font = "bold 24px monospace";
      context.fillText(ticketId.slice(-8).toUpperCase(), WIDTH / 2, 1100);

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed")), "image/png"),
      );
      const filename = `function-hour-ticket-${ticketId.slice(-8)}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        try {
          await navigator.share({ files: [file], title: `${eventName} ticket` });
          return;
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === "AbortError") return;
          // A browser may support sharing but still refuse this file.
        }
      }
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 w-full">
      <button
        type="button"
        onClick={savePass}
        disabled={saving}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {saving ? "Preparing pass…" : "Save for offline access"}
      </button>
      <p className="mt-2 text-xs leading-5 text-zinc-300">
        Save the image to Photos or Files before you lose service. Entry still depends on the ticket being valid at check-in.
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          Could not save this pass. Take a screenshot of the QR code while you are online.
        </p>
      ) : null}
    </div>
  );
}
