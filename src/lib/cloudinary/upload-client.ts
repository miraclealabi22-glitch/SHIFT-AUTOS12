"use client";

import {
  MAX_MEDIA_FILE_BYTES,
  type MediaCategory,
  type MediaResourceType,
} from "@/lib/cloudinary/config";

export type UploadedMediaAsset = {
  id: string;
  publicId: string;
  secureUrl: string;
  resourceType: MediaResourceType;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
  folder: string;
  category: MediaCategory;
  createdAt: string;
  updatedAt: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object"
      && body !== null
      && "error" in body
      && typeof body.error === "string"
      ? body.error
      : "Media request failed.";
    throw new Error(message);
  }

  return body as T;
}

export async function uploadMediaFile(
  file: File,
  category: MediaCategory,
): Promise<UploadedMediaAsset> {
  const resourceType: MediaResourceType = file.type.startsWith("video/") ? "video" : "image";
  if (file.size > MAX_MEDIA_FILE_BYTES[resourceType]) {
    throw new Error(`The selected file exceeds the ${resourceType} upload limit.`);
  }

  const formData = new FormData();
  formData.set("category", category);
  formData.set("resourceType", resourceType);
  formData.set("file", file);

  const response = await fetch("/api/media", {
    method: "POST",
    body: formData,
    credentials: "same-origin",
  });
  const result = await readResponse<{ asset: UploadedMediaAsset }>(response);
  return result.asset;
}

export async function deleteMediaAssetFile(mediaAssetId: string): Promise<void> {
  const response = await fetch("/api/media", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mediaAssetId }),
  });
  await readResponse<{ deleted: true }>(response);
}
