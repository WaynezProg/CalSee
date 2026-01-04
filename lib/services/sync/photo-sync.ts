import { generateThumbnail } from "@/lib/services/thumbnail/generator";

export interface UploadedPhotoResponse {
  photoId: string;
  mainPhotoKey: string;
  thumbnailKey: string;
  mainPhotoSize: number;
  thumbnailSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt: string;
}

export async function uploadPhotoWithThumbnail(file: File, mealId?: string): Promise<UploadedPhotoResponse> {
  const thumbnail = await generateThumbnail(file);
  const formData = new FormData();

  formData.append("photo", file, file.name);
  formData.append("thumbnail", thumbnail, "thumbnail.jpg");

  if (mealId) {
    formData.append("mealId", mealId);
  }

  const response = await fetch("/api/sync/photos/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = new Error("Photo upload failed") as Error & { code?: string };
    if (response.status === 413) {
      error.code = "quota_exceeded";
    }
    throw error;
  }

  return response.json();
}
