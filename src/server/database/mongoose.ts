import "server-only";

import mongoose from "mongoose";
import { serverEnvironment } from "@/server/config/env";

type MongooseCache = {
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  shiftMongooseCache?: MongooseCache;
};

const cache = globalWithMongoose.shiftMongooseCache ??= {
  promise: null,
};

export type DatabaseHealth = "AVAILABLE" | "NOT_CONFIGURED" | "UNAVAILABLE";

export async function connectToDatabase(): Promise<DatabaseHealth> {
  const uri = serverEnvironment.MONGODB_URI;
  if (!uri) return "NOT_CONFIGURED";

  if (mongoose.connection.readyState === 1) {
    return "AVAILABLE";
  }

  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cache.promise = null;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      autoIndex: serverEnvironment.NODE_ENV !== "production",
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5_000,
    }).catch((error: unknown) => {
      cache.promise = null;
      throw error;
    });
  }

  await cache.promise;
  return "AVAILABLE";
}
