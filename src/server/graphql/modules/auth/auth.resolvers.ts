import { GraphQLError } from "graphql";
import type { GraphQLContext } from "@/server/graphql/context";
import {
  buildLogoutCookieHeader,
  buildSessionCookieHeader,
  getUserFromSessionToken,
  loginUser,
  logoutUser,
  registerUser,
} from "@/server/services/auth.service";

function setSessionCookie(context: GraphQLContext, sessionToken: string, expiresAt: Date): void {
  context.response.append("set-cookie", buildSessionCookieHeader(sessionToken, expiresAt));
}

function clearSessionCookie(context: GraphQLContext): void {
  context.response.append("set-cookie", buildLogoutCookieHeader());
}

export const authResolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.principal) {
        return null;
      }

      const sessionUser = await getUserFromSessionToken(context.request.cookies.get("shift_session")?.value ?? null);
      if (!sessionUser) {
        return null;
      }

      return {
        id: sessionUser._id.toString(),
        name: sessionUser.name,
        username: sessionUser.username,
        email: sessionUser.email,
        roles: sessionUser.roles,
        createdAt: sessionUser.createdAt.toISOString(),
      };
    },
  },
  Mutation: {
    register: async (_parent: unknown, { input }: { input: { name: string; username: string; email: string; password: string } }, context: GraphQLContext) => {
      try {
        const result = await registerUser(input);
        setSessionCookie(context, result.sessionToken, result.expiresAt);
        return {
          user: result.user,
          expiresAt: result.expiresAt.toISOString(),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create your account.";
        throw new GraphQLError(message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
    },
    login: async (_parent: unknown, { input }: { input: { email: string; password: string } }, context: GraphQLContext) => {
      try {
        const result = await loginUser(input);
        setSessionCookie(context, result.sessionToken, result.expiresAt);
        return {
          user: result.user,
          expiresAt: result.expiresAt.toISOString(),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to sign in.";
        throw new GraphQLError(message, {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }
    },
    logout: async (_parent: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.principal) {
        clearSessionCookie(context);
        return true;
      }

      await logoutUser(context.principal.userId);
      clearSessionCookie(context);
      return true;
    },
  },
};
