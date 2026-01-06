import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma/client";
import { getSignedPhotoUrl } from "@/lib/db/s3/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized", message: "Unauthorized" }, { status: 401 });
  }

  const userIds = [session.user.id, session.user.providerId].filter(
    (userId): userId is string => Boolean(userId),
  );
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
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return NextResponse.json({ url, expiresAt, expiresIn });
  } catch (error) {
    console.error("[sync] Failed to generate signed URL", error);
    return NextResponse.json(
      { error: "server_error", message: "Failed to generate signed URL" },
      { status: 500 },
    );
  }
}
