import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma/client';
import { uploadPhoto } from '@/lib/db/s3/client';

const MAX_THUMBNAIL_BYTES = 50 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized', message: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const photo = formData.get('photo');
  const thumbnail = formData.get('thumbnail');
  const mealId = formData.get('mealId');

  if (!(photo instanceof File) || !(thumbnail instanceof File)) {
    return NextResponse.json(
      { error: 'validation_error', message: 'Photo and thumbnail are required' },
      { status: 400 },
    );
  }

  if (thumbnail.size > MAX_THUMBNAIL_BYTES) {
    return NextResponse.json(
      { error: 'thumbnail_validation_failed', message: 'Thumbnail exceeds size limit' },
      { status: 400 },
    );
  }

  const photoId = crypto.randomUUID();
  const [photoBytes, thumbnailBytes] = await Promise.all([
    photo.arrayBuffer(),
    thumbnail.arrayBuffer(),
  ]);

  try {
    const [mainKey, thumbnailKey] = await Promise.all([
      uploadPhoto(photoId, 'main', new Uint8Array(photoBytes), photo.type || 'image/jpeg'),
      uploadPhoto(photoId, 'thumbnail', new Uint8Array(thumbnailBytes), 'image/jpeg'),
    ]);

    const record = await prisma.photo.create({
      data: {
        id: photoId,
        userId: session.user.id,
        mealId: typeof mealId === 'string' ? mealId : null,
        mainPhotoKey: mainKey,
        thumbnailKey,
        mainPhotoSize: photo.size,
        thumbnailSize: thumbnail.size,
        mimeType: photo.type || 'image/jpeg',
      },
    });

    return NextResponse.json(
      {
        photoId: record.id,
        mainPhotoKey: record.mainPhotoKey,
        thumbnailKey: record.thumbnailKey,
        mainPhotoSize: record.mainPhotoSize,
        thumbnailSize: record.thumbnailSize,
        mimeType: record.mimeType,
        width: record.width ?? undefined,
        height: record.height ?? undefined,
        uploadedAt: record.uploadedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[sync] Photo upload failed', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Photo upload failed' },
      { status: 500 },
    );
  }
}
