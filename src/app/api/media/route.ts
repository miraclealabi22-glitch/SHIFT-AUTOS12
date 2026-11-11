import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import {
  MAX_MEDIA_FILE_BYTES,
} from "@/lib/cloudinary/config";
import { getPrincipalFromRequest } from "@/server/services/auth.service";
import {
  MediaAuthenticationError,
  MediaPermissionError,
  MediaValidationError,
  assertAdministrator,
} from "@/server/services/media/media-permissions";
import { isDatabaseUnavailableError } from "@/server/services/admin-catalog-api";
import {
  assertMediaCloudinaryConfigured,
  deleteMediaAsset,
  MediaOperationError,
  uploadMedia,
  validateMediaResourceType,
} from "@/server/services/media/media.service";
import { CloudinaryConfigurationError } from "@/lib/cloudinary/client";

const MAX_MULTIPART_OVERHEAD_BYTES = 128 * 1024;
const MAX_REQUEST_BYTES = MAX_MEDIA_FILE_BYTES.video + MAX_MULTIPART_OVERHEAD_BYTES;

function failureCategory(error: unknown): string {
  if (error instanceof MediaOperationError) {
    return error.category;
  }
  if (error instanceof CloudinaryConfigurationError) {
    return "cloudinary_configuration";
  }
  if (isDatabaseUnavailableError(error)) {
    return "database_unavailable";
  }
  if (error instanceof Error && /database is not configured/i.test(error.message)) {
    return "database_unavailable";
  }
  return "unknown";
}

function logMediaFailureCategory(category: string, request: NextRequest): void {
  console.error(JSON.stringify({
    event: "media.operation_failed",
    failureCategory: category,
    method: request.method,
    path: request.nextUrl.pathname,
  }));
}

function logMediaFailure(error: unknown, request: NextRequest): void {
  const category = failureCategory(error);
  console.error(JSON.stringify({
    event: "media.operation_failed",
    failureCategory: category,
    ...(error instanceof MediaOperationError && error.diagnosticCode
      ? { diagnosticCode: error.diagnosticCode }
      : {}),
    method: request.method,
    path: request.nextUrl.pathname,
  }));
}

function mediaOperationMessage(category: string, diagnosticCode?: string): string {
  switch (category) {
    case "cloudinary_authentication":
      return "Cloudinary rejected the server credentials (cloudinary_authentication).";
    case "cloudinary_upload":
      return "Cloudinary could not upload this file (cloudinary_upload).";
    case "cloudinary_verification":
      return `Cloudinary could not verify the uploaded asset (${diagnosticCode ?? category}).`;
    case "cloudinary_rollback":
      return "The upload could not be safely completed (cloudinary_rollback). Contact support.";
    case "database_unavailable":
      return "Media storage is unavailable (database_unavailable).";
    case "media_record_creation":
      return "The upload could not be saved to the media library (media_record_creation).";
    default:
      return "Media operation failed.";
  }
}

async function readBoundedBody(
  request: NextRequest,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = request.body?.getReader();
  if (!reader) {
    throw new MediaValidationError("The upload request has no body.");
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new MediaValidationError("The upload exceeds the maximum allowed size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(new ArrayBuffer(totalBytes));
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function isSameOrigin(request: NextRequest): boolean {
  return request.headers.get("origin") === request.nextUrl.origin;
}

function mediaAssetResponse(asset: Awaited<ReturnType<typeof uploadMedia>>) {
  return {
    id: asset._id.toString(),
    publicId: asset.publicId,
    secureUrl: asset.secureUrl,
    resourceType: asset.resourceType,
    format: asset.format,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    duration: asset.duration,
    folder: asset.folder,
    category: asset.category,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

function errorResponse(error: unknown, request: NextRequest): NextResponse {
  unstable_rethrow(error);
  if (error instanceof MediaAuthenticationError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof MediaPermissionError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof MediaValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof CloudinaryConfigurationError) {
    logMediaFailure(error, request);
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof MediaOperationError) {
    logMediaFailure(error, request);
    const status = error.category === "database_unavailable" ? 503 : 500;
    return NextResponse.json({
      error: mediaOperationMessage(error.category, error.diagnosticCode),
    }, { status });
  }
  if (isDatabaseUnavailableError(error)) {
    logMediaFailure(error, request);
    return NextResponse.json({ error: mediaOperationMessage("database_unavailable") }, { status: 503 });
  }
  if (error instanceof Error && /database is not configured/i.test(error.message)) {
    logMediaFailure(error, request);
    return NextResponse.json({ error: mediaOperationMessage("database_unavailable") }, { status: 503 });
  }

  logMediaFailure(error, request);
  return NextResponse.json({ error: "Media operation failed." }, { status: 500 });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Same-origin requests are required." }, { status: 403 });
    }

    const principal = await getPrincipalFromRequest(request);
    assertAdministrator(principal);
    assertMediaCloudinaryConfigured();

    const rawContentLength = request.headers.get("content-length");
    const contentLength = rawContentLength === null ? null : Number(rawContentLength);
    if (contentLength !== null && !Number.isFinite(contentLength)) {
      throw new MediaValidationError("Invalid content length.");
    }
    if (contentLength !== null && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "The upload exceeds the maximum allowed size." }, { status: 413 });
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      throw new MediaValidationError("A multipart media upload is required.");
    }

    const boundedBody = await readBoundedBody(request, MAX_REQUEST_BYTES);
    let formData: FormData;
    try {
      formData = await new Request(request.url, {
        method: "POST",
        headers: {
          "content-type": request.headers.get("content-type") ?? "",
        },
        body: new Blob([boundedBody]),
      }).formData();
    } catch {
      logMediaFailureCategory("multipart_parse", request);
      throw new MediaValidationError("Invalid multipart media upload.");
    }
    const category = formData.get("category");
    const resourceType = formData.get("resourceType");
    const file = formData.get("file");

    if (typeof category !== "string" || typeof resourceType !== "string" || !(file instanceof File)) {
      throw new MediaValidationError("The upload must include a category, resource type, and file.");
    }
    const validatedResourceType = validateMediaResourceType(resourceType);
    if (file.size > MAX_MEDIA_FILE_BYTES[validatedResourceType]) {
      throw new MediaValidationError("The file exceeds the maximum allowed size.");
    }

    const asset = await uploadMedia(principal, category, validatedResourceType, {
      name: file.name,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({ asset: mediaAssetResponse(asset) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, request);
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: "Same-origin requests are required." }, { status: 403 });
    }

    const principal = await getPrincipalFromRequest(request);
    assertAdministrator(principal);
    assertMediaCloudinaryConfigured();

    const rawContentLength = request.headers.get("content-length");
    const contentLength = rawContentLength === null ? null : Number(rawContentLength);
    if (contentLength !== null && (!Number.isFinite(contentLength) || contentLength > 8 * 1024)) {
      throw new MediaValidationError("Invalid media asset identifier.");
    }

    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      throw new MediaValidationError("A JSON media asset ID is required.");
    }

    const bodyBytes = await readBoundedBody(request, 8 * 1024);
    let body: unknown;
    try {
      body = JSON.parse(new TextDecoder().decode(bodyBytes));
    } catch {
      throw new MediaValidationError("Invalid media asset request.");
    }
    if (
      typeof body !== "object"
      || body === null
      || !("mediaAssetId" in body)
      || typeof body.mediaAssetId !== "string"
    ) {
      throw new MediaValidationError("A media asset ID is required.");
    }

    await deleteMediaAsset(principal, body.mediaAssetId);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error, request);
  }
}
