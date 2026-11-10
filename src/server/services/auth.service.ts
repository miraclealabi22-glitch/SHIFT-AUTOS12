import "server-only";

import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { connectToDatabase } from "@/server/database/mongoose";
import { UserModel, type UserDocument } from "@/server/models/user.model";

export const SESSION_COOKIE_NAME = "shift_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type SafeUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  roles: readonly string[];
  createdAt: string;
};

export type AuthSession = {
  user: SafeUser;
  expiresAt: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function buildSessionCookieHeader(sessionToken: string, expiresAt: Date): string {
  const expires = expiresAt.toUTCString();
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expires}`,
    `Max-Age=${Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
  ];

  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function buildLogoutCookieHeader(): string {
  return [
    `${SESSION_COOKIE_NAME}=;`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

function serializeSafeUser(user: Pick<UserDocument, "_id" | "name" | "username" | "email" | "roles" | "createdAt">): SafeUser {
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    email: user.email,
    roles: user.roles,
    createdAt: user.createdAt.toISOString(),
  };
}

async function ensureDatabaseReady(): Promise<void> {
  const health = await connectToDatabase();
  if (health !== "AVAILABLE") {
    throw new Error("Database is not configured or unavailable. Configure MONGODB_URI to continue.");
  }
}

function normalizeAuthError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    const message = error.message;
    if (/buffering timed out|MongoServerSelectionError|ECONNREFUSED|ENOTFOUND|MongooseError|database/i.test(message)) {
      return new Error("Unable to reach SHIFT's database right now. Please try again shortly.");
    }
    return new Error(message);
  }

  return new Error(fallback);
}

export async function registerUser(input: {
  name: string;
  username: string;
  email: string;
  password: string;
}): Promise<{ user: SafeUser; sessionToken: string; expiresAt: Date }> {
  try {
    await ensureDatabaseReady();

    const name = input.name.trim();
    const username = normalizeUsername(input.username);
    const email = normalizeEmail(input.email);
    const password = input.password;

    if (!name || name.length < 2) {
      throw new Error("Name must be at least 2 characters long.");
    }
    if (username.length < 3 || username.length > 40) {
      throw new Error("Username must be between 3 and 40 characters.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Please enter a valid email address.");
    }
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const existingUser = await UserModel.findOne({ $or: [{ email }, { username }] }).lean();
    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error("An account with that email already exists.");
      }
      throw new Error("That username is already taken.");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({
      name,
      username,
      email,
      passwordHash,
      roles: ["user"],
    });

    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          sessionTokenHash: hashToken(sessionToken),
          sessionExpiresAt: expiresAt,
        },
      },
    );

    return {
      user: serializeSafeUser({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
      }),
      sessionToken,
      expiresAt,
    };
  } catch (error) {
    throw normalizeAuthError(error, "Unable to create your account.");
  }
}

export async function loginUser(input: { email: string; password: string }): Promise<{ user: SafeUser; sessionToken: string; expiresAt: Date }> {
  try {
    await ensureDatabaseReady();

    const email = normalizeEmail(input.email);
    const user = await UserModel.findOne({ email }).lean();

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid email or password.");
    }

    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          sessionTokenHash: hashToken(sessionToken),
          sessionExpiresAt: expiresAt,
        },
      },
    );

    return {
      user: serializeSafeUser({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
      }),
      sessionToken,
      expiresAt,
    };
  } catch (error) {
    throw normalizeAuthError(error, "Unable to sign in.");
  }
}

export async function getUserFromSessionToken(sessionToken: string | null | undefined): Promise<UserDocument | null> {
  if (!sessionToken) {
    return null;
  }

  await ensureDatabaseReady();
  const hashedToken = hashToken(sessionToken);

  return UserModel.findOne({
    sessionTokenHash: hashedToken,
    sessionExpiresAt: { $gt: new Date() },
  }).lean() as Promise<UserDocument | null>;
}

export async function getPrincipalFromRequest(request: NextRequest): Promise<{ userId: string; roles: readonly string[] } | null> {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return null;
  }

  const user = await getUserFromSessionToken(sessionToken);
  if (!user) {
    return null;
  }

  return {
    userId: user._id.toString(),
    roles: user.roles,
  };
}

export async function logoutUser(userId: string): Promise<void> {
  await ensureDatabaseReady();
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        sessionTokenHash: null,
        sessionExpiresAt: null,
      },
    },
  );
}
