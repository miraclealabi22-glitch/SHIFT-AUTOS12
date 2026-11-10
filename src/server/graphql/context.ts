import type { NextRequest } from "next/server";
import { getPrincipalFromRequest } from "@/server/services/auth.service";

export type AuthenticatedPrincipal = {
  userId: string;
  roles: readonly string[];
};

export type GraphQLContext = {
  request: NextRequest;
  response: Headers;
  principal: AuthenticatedPrincipal | null;
};

export async function createGraphQLContext(request: NextRequest): Promise<GraphQLContext> {
  const principal = await getPrincipalFromRequest(request);
  return {
    request,
    response: new Headers(),
    principal,
  };
}
