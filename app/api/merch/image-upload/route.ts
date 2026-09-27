import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to upload an image." }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const rawUploadUrl = request.headers.get("X-Convex-Upload-Url");
  if (!convexUrl || !rawUploadUrl) {
    return NextResponse.json({ error: "Image upload is not configured." }, { status: 503 });
  }
  let uploadUrl: URL;
  try {
    uploadUrl = new URL(rawUploadUrl);
    const deployment = new URL(convexUrl);
    const expectedHost = deployment.hostname.replace(/\.convex\.cloud$/, ".convex.site");
    if (
      uploadUrl.protocol !== "https:" ||
      (uploadUrl.hostname !== expectedHost && uploadUrl.hostname !== deployment.hostname) ||
      uploadUrl.port ||
      !uploadUrl.pathname.startsWith("/api/storage/upload") ||
      uploadUrl.username ||
      uploadUrl.password
    ) throw new Error("Unexpected upload destination");
  } catch {
    return NextResponse.json({ error: "Invalid image upload destination." }, { status: 400 });
  }

  const contentType = request.headers.get("content-type")?.split(";")[0];
  const size = Number(request.headers.get("content-length"));
  if (!contentType || !IMAGE_TYPES.has(contentType) || (Number.isFinite(size) && size > MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image under 10 MB." }, { status: 400 });
  }
  const image = await request.arrayBuffer();
  if (!image.byteLength || image.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image under 10 MB." }, { status: 400 });
  }
  const bytes = new Uint8Array(image, 0, Math.min(image.byteLength, 12));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!((contentType === "image/jpeg" && jpeg) || (contentType === "image/png" && png) || (contentType === "image/webp" && webp))) {
    return NextResponse.json({ error: "The uploaded file is not a valid JPG, PNG, or WebP image." }, { status: 400 });
  }

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: image,
      cache: "no-store",
      redirect: "manual",
    });
    if (!response.ok) {
      console.error("Merch storage upload failed", { status: response.status });
      return NextResponse.json({ error: "Image storage rejected the upload. Try again." }, { status: 502 });
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("storageId" in result) || typeof result.storageId !== "string") {
      return NextResponse.json({ error: "Image storage returned an invalid response." }, { status: 502 });
    }
    return NextResponse.json({ storageId: result.storageId });
  } catch (error) {
    console.error("Merch image storage unavailable", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Image storage is unavailable. Try again shortly." }, { status: 502 });
  }
}
