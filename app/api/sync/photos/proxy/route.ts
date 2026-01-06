import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma/client";
import { getSignedPhotoUrl } from "@/lib/db/s3/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "Unauthorized" }, { status: 401 });
  }

  const userIds: string[] = [session.user.id];
  if (session.user.providerId && session.user.providerId !== session.user.id) {
    userIds.push(session.user.providerId);
  }

  const photoId = request.nextUrl.searchParams.get("photoId");
  const type = request.nextUrl.searchParams.get("type") === "thumbnail" ? "thumbnail" : "main";

  if (!photoId) {
    return NextResponse.json(
      { error: "validation_error", message: "photoId is required" },
      { status: 400 },
    );
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "not_found", message: "Photo not found" }, { status: 404 });
  }

  if (!userIds.includes(photo.userId)) {
    return NextResponse.json({ error: "forbidden", message: "Forbidden" }, { status: 403 });
  }

  try {
    const expiresIn = Number(process.env.SIGNED_URL_EXPIRES_IN ?? 60);
    const url = await getSignedPhotoUrl(photoId, type, expiresIn);
    const upstream = await fetch(url);

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "upstream_error", message: "Failed to fetch photo" },
        { status: 502 },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("Cache-Control", "private, max-age=60");

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("[sync] Failed to proxy photo", error);
    return NextResponse.json(
      { error: "server_error", message: "Failed to proxy photo" },
      { status: 500 },
    );
  }
}
