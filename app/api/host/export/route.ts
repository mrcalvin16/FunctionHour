import { auth, reverificationErrorResponse } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const dynamic = "force-dynamic";

function csvCell(value: string) {
  // Quoting alone does not prevent formula execution in spreadsheet applications.
  const safe = /^\s*[=+@-]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!session.has({ reverification: "strict" })) return reverificationErrorResponse("strict");
  const body = await request.json().catch(() => null);
  const type = body?.type;
  const eventId = body?.eventId;
  if ((type !== "attendees" && type !== "statement") ||
      typeof eventId !== "string" || !/^[a-z0-9]{20,40}$/.test(eventId)) {
    return NextResponse.json({ error: "Choose an event and export type." }, { status: 400 });
  }
  try {
    const token = await session.getToken({ template: "convex" });
    if (!token) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const result = await fetchQuery(api.organizerExports.getEventExport,
      { eventId: eventId as Id<"events">, type }, { token });
    await fetchMutation(api.organizerExports.recordExport,
      { eventId: eventId as Id<"events">, type, rowCount: result.rows.length }, { token });
    const headers = type === "attendees"
      ? ["Name", "Email", "Ticket type", "Status", "Checked in", "Purchased at"]
      : ["Order", "Customer", "Email", "Quantity", "Currency", "Gross", "Refunded", "Net", "Status", "Paid at"];
    const content = "\uFEFF" + [headers, ...result.rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const filename = `functionhour-${type}-${eventId}-${new Date().toISOString().slice(0,10)}.csv`;
    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Organizer export failed:", { type, eventId, error });
    return NextResponse.json({ error: "Export unavailable. Confirm ownership and try again." },
      { status: 403, headers: { "Cache-Control": "no-store" } });
  }
}
