import { ApolloServer } from "@apollo/server";
import { serverEnvironment } from "@/server/config/env";
import type { GraphQLContext } from "@/server/graphql/context";
import { resolvers, typeDefs } from "@/server/graphql/schema";

function getErrorStacktraceMessage(extensions: Readonly<Record<string, unknown>> | undefined): string | undefined {
  const exception = extensions?.exception;
  if (typeof exception !== "object" || exception === null || !("stacktrace" in exception)) {
    return undefined;
  }

  const stacktrace = exception.stacktrace;
  return Array.isArray(stacktrace) && typeof stacktrace[0] === "string"
    ? stacktrace[0]
    : undefined;
}

export const apolloServer = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: serverEnvironment.NODE_ENV !== "production",
  formatError(formattedError) {
    if (formattedError.extensions?.code !== "INTERNAL_SERVER_ERROR") {
      return formattedError;
    }

    const originalMessage = getErrorStacktraceMessage(formattedError.extensions);

    const fallbackMessage = originalMessage ?? "Internal server error.";

    console.error(JSON.stringify({
      event: "graphql.internal_error",
      path: formattedError.path,
      message: fallbackMessage,
    }));

    return {
      message: serverEnvironment.NODE_ENV === "production"
        ? "Internal server error."
        : fallbackMessage,
      locations: formattedError.locations,
      path: formattedError.path,
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    };
  },
});
