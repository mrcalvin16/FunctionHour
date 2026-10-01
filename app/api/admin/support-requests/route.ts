import { NextResponse } from "next/server";
import { z } from "zod";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { supportStore } from "@/lib/supportRequests";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!await hasFunctionHourAdminAccess()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  try {
    const data = await supportStore("/support/requests", "GET");
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[support.admin] Listing failed", error);
    return NextResponse.json({ error: "Unable to load support requests." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : new URL(request.url).origin;
  if (origin !== new URL(request.url).origin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!await hasFunctionHourAdminAccess()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const parsed = z.object({ id: z.string().min(1).max(100), status: z.enum(["new", "in_progress", "resolved"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  try {
    await supportStore("/support/requests/status", "POST", parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[support.admin] Update failed", error);
    return NextResponse.json({ error: "Unable to update request." }, { status: 503 });
  }
}
