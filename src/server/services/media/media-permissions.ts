import type { AuthenticatedPrincipal } from "@/server/graphql/context";
import { MEDIA_FOLDERS } from "@/lib/cloudinary/config";

export class MediaPermissionError extends Error {
  constructor(message = "You are not allowed to perform this media operation.") {
    super(message);
    this.name = "MediaPermissionError";
  }
}

export class MediaAuthenticationError extends MediaPermissionError {
  constructor(message = "Sign in before managing SHIFT media.") {
    super(message);
    this.name = "MediaAuthenticationError";
  }
}

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

export function assertAdministrator(principal: AuthenticatedPrincipal | null): asserts principal is AuthenticatedPrincipal {
  if (!principal) {
    throw new MediaAuthenticationError();
  }

  if (!principal.roles.includes("admin")) {
    throw new MediaPermissionError("Only administrators can manage SHIFT media.");
  }
}

export function resolveAdministratorUploadFolder(
  principal: AuthenticatedPrincipal | null,
  category: unknown,
): string {
  assertAdministrator(principal);

  const entry = typeof category === "string"
    ? Object.entries(MEDIA_FOLDERS).find(([key]) => key === category)
    : undefined;
  if (!entry) {
    throw new MediaValidationError("Unsupported media category.");
  }

  return entry[1];
}

export function assertCanManageMedia(principal: AuthenticatedPrincipal | null): asserts principal is AuthenticatedPrincipal {
  assertAdministrator(principal);
}
