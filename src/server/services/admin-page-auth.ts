import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, getUserFromSessionToken } from "@/server/services/auth.service";
import { getAdminPageRedirect } from "@/lib/auth-navigation";

export async function requireAdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserFromSessionToken(sessionToken);
  const destination = getAdminPageRedirect(user);
  if (destination) redirect(destination);
}
