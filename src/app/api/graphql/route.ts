import type { NextRequest } from "next/server";
import { createGraphQLContext, type GraphQLContext } from "@/server/graphql/context";
import { apolloServer } from "@/server/graphql/server";

async function readRequestBody(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json() as Promise<Record<string, unknown>>;
  }

  const text = await request.text();
  if (!text) {
    return {};
  }

  const params = new URLSearchParams(text);
  const query = params.get("query") ?? "";
  const variables = params.get("variables");
  const operationName = params.get("operationName");

  return {
    query,
    variables: variables ? JSON.parse(variables) : undefined,
    operationName: operationName ?? undefined,
  };
}

async function executeGraphQLRequest(request: NextRequest, payload: Record<string, unknown>): Promise<Response> {
  const context = await createGraphQLContext(request);
  const query = typeof payload.query === "string" ? payload.query : "";
  const operationName = typeof payload.operationName === "string" ? payload.operationName : undefined;
  const variables = payload.variables ?? undefined;

  try {
    const result = await apolloServer.executeOperation(
      { query, operationName, variables },
      { contextValue: context as GraphQLContext },
    );

    const responseHeaders = new Headers({ "content-type": "application/json" });
    const setCookieValues = (context.response as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const value of setCookieValues) {
      responseHeaders.append("set-cookie", value);
    }

    const body = result.body.kind === "single" ? result.body.singleResult : { errors: [{ message: "Unexpected GraphQL response format." }] };
    return new Response(JSON.stringify(body), { status: 200, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected GraphQL server error.";
    return new Response(JSON.stringify({
      errors: [{ message, extensions: { code: "INTERNAL_SERVER_ERROR" } }],
    }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const payload = {
    query: url.searchParams.get("query") ?? "",
    variables: url.searchParams.get("variables") ? JSON.parse(url.searchParams.get("variables") ?? "{}") : undefined,
    operationName: url.searchParams.get("operationName") ?? undefined,
  };

  return executeGraphQLRequest(request, payload);
}

export async function POST(request: NextRequest): Promise<Response> {
  const payload = await readRequestBody(request);
  return executeGraphQLRequest(request, payload);
}
