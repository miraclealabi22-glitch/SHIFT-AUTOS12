export function getAdminPageRedirect(
  user: { roles: readonly string[] } | null,
): "/login" | "/unauthorized" | null {
  if (!user) return "/login";
  if (!user.roles.includes("admin")) return "/unauthorized";
  return null;
}

export function getLoginDestination(
  roles: readonly string[],
  requestedPath: string | null,
): string {
  if (!roles.includes("admin")) return "/discover";
  if (
    requestedPath
    && requestedPath.startsWith("/admin/")
    && !requestedPath.startsWith("//")
    && !requestedPath.includes("\\")
  ) {
    return requestedPath;
  }
  return "/admin/manufacturers";
}
