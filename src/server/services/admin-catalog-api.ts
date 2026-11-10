import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getPrincipalFromRequest } from "@/server/services/auth.service";
import {
  assertAdministrator,
  MediaAuthenticationError,
  MediaPermissionError,
} from "@/server/services/media/media-permissions";

const maximumJsonBytes = 1024 * 1024;

export async function assertAdminRequest(
  request: NextRequest,
  requireSameOrigin = false,
) {
  if (requireSameOrigin && request.headers.get("origin") !== request.nextUrl.origin) {
    throw new MediaPermissionError("Same-origin requests are required.");
  }
  const principal = await getPrincipalFromRequest(request);
  assertAdministrator(principal);
  return principal;
}

export async function readAdminJson(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new z.ZodError([]);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maximumJsonBytes) throw new RangeError("The request body is too large.");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maximumJsonBytes) {
    throw new RangeError("The request body is too large.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new z.ZodError([]);
  }
}

function safeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { errorName: "UnknownError" };

  const errorMessage = error.message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[redacted database URI]")
    .replace(/\b(password|passwd|secret|token|api[_-]?key|authorization)(\s*[:=]\s*)[^\s,;"']+/gi, "$1$2[redacted]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted URL]")
    .slice(0, 1000);
  const candidate = error as Error & { code?: unknown; http_code?: unknown };
  const code = candidate.code ?? candidate.http_code;

  return {
    errorName: error.name,
    errorMessage,
    ...(typeof code === "string" || typeof code === "number" ? { errorCode: code } : {}),
  };
}

export function logAdminRequestFailure(
  event: string,
  error: unknown,
  request: NextRequest,
): void {
  console.error(JSON.stringify({
    event,
    method: request.method,
    path: request.nextUrl.pathname,
    ...safeErrorDetails(error),
  }));
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const candidate = error as Error & { code?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  return /Mongo(?:ServerSelection|Network|Topology)Error|MongooseServerSelectionError/i.test(error.name)
    || /server selection timed out|buffering timed out|ECONNREFUSED|ENOTFOUND|connection (?:closed|timed out)/i.test(error.message)
    || ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(code);
}

export function adminApiError(error: unknown, request: NextRequest): Response {
  if (error instanceof MediaAuthenticationError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof MediaPermissionError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof z.ZodError) {
    return Response.json({ error: "Invalid catalogue input.", details: error.issues }, { status: 400 });
  }
  if (error instanceof Error && (error.name === "ValidationError" || error.name === "CastError")) {
    return Response.json({ error: "Invalid catalogue input." }, { status: 400 });
  }
  if (error instanceof RangeError) {
    return Response.json({ error: error.message }, { status: 413 });
  }
  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    return Response.json({ error: "A record with that slug already exists." }, { status: 409 });
  }
  if (error instanceof Error && error.message === "CATALOG_NOT_FOUND") {
    return Response.json({ error: "Catalogue record not found." }, { status: 404 });
  }
  if (error instanceof Error && error.message === "CATALOG_UNAVAILABLE") {
    logAdminRequestFailure("admin_catalog.request_failed", error, request);
    return Response.json({ error: "Catalogue database is unavailable." }, { status: 503 });
  }
  if (error instanceof Error && error.message.startsWith("CATALOG_CONFLICT:")) {
    return Response.json({ error: error.message.slice("CATALOG_CONFLICT:".length) }, { status: 409 });
  }
  if (isDatabaseUnavailableError(error)) {
    logAdminRequestFailure("admin_catalog.request_failed", error, request);
    return Response.json({ error: "Catalogue database is unavailable." }, { status: 503 });
  }
  logAdminRequestFailure("admin_catalog.request_failed", error, request);
  return Response.json({ error: "Catalogue operation failed." }, { status: 500 });
}
