import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientKey } from "@/lib/supportRateLimit";
import { supportStore } from "@/lib/supportRequests";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : requestOrigin;
  if (origin !== requestOrigin && origin !== appOrigin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 500) return NextResponse.json({ error: "Invalid status link." }, { status: 413 });
  const input = await request.json().catch(() => null);
  if (!input || typeof input.reference !== "string" || typeof input.token !== "string" ||
    !/^[a-z0-9]{20,40}$/.test(input.reference) || !/^[a-f0-9]{64}$/.test(input.token)) {
    return NextResponse.json({ error: "Invalid status link." }, { status: 400 });
  }
  const rate = await checkRateLimit("support-status", getClientKey(request), { limit: 30, windowMs: 3_600_000 });
  if (!rate.allowed) return NextResponse.json({ error: "Please try again later." }, { status: 429 });
  try {
    const statusTokenHash = createHash("sha256").update(input.token).digest("hex");
    const status = await supportStore("/support/requests/status", "POST", { id: input.reference, statusTokenHash });
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "This status link is unavailable." }, { status: 404 });
  }
}
