import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { supportStore } from "@/lib/supportRequests";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await hasFunctionHourAdminAccess()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id && !/^[a-z0-9]{20,40}$/.test(id)) return NextResponse.json({ error: "Invalid case ID." }, { status: 400 });
    const data = id ? await supportStore("/support/requests/activity", "POST", { id })
      : await supportStore("/support/requests", "GET");
    const { userId } = await auth();
    return NextResponse.json({ ...data, operatorId: userId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[support.admin] Listing failed", error);
    return NextResponse.json({ error: "Unable to load support requests." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 5000) {
    return NextResponse.json({ error: "Update is too long." }, { status: 413 });
  }
  const origin = request.headers.get("origin");
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : new URL(request.url).origin;
  if (origin !== new URL(request.url).origin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!await hasFunctionHourAdminAccess()) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const parsed = z.object({
    id: z.string().regex(/^[a-z0-9]{20,40}$/),
    action: z.enum(["claim", "release", "priority", "status", "note", "follow_up", "reply_recorded"]),
    status: z.enum(["new", "in_progress", "waiting_on_organizer", "resolved"]).optional(),
    priority: z.enum(["standard", "urgent"]).optional(),
    note: z.string().trim().max(1000).optional(),
    followUpAt: z.number().int().nonnegative().optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    await supportStore("/support/requests/case", "POST", { ...parsed.data, actorId: userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[support.admin] Update failed", error);
    return NextResponse.json({ error: "Unable to update request." }, { status: 503 });
  }
}
