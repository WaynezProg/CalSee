import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

const bucketName = process.env.S3_BUCKET ?? "";

function buildPhotoKey(photoId: string, type: "main" | "thumbnail"): string {
  return `photos/${photoId}/${type}.jpg`;
}

export async function uploadPhoto(
  photoId: string,
  type: "main" | "thumbnail",
  data: Uint8Array,
  contentType = "image/jpeg",
): Promise<string> {
  const key = buildPhotoKey(photoId, type);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: data,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return key;
}

export async function getSignedPhotoUrl(
  photoId: string,
  type: "main" | "thumbnail" = "main",
  expiresIn = Number(process.env.SIGNED_URL_EXPIRES_IN ?? 60),
): Promise<string> {
  const key = buildPhotoKey(photoId, type);
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deletePhoto(photoId: string): Promise<void> {
  const mainKey = buildPhotoKey(photoId, "main");
  const thumbnailKey = buildPhotoKey(photoId, "thumbnail");

  await Promise.all([
    s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: mainKey })),
    s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: thumbnailKey })),
  ]);
}
