import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().trim().min(1).optional(),
});

const parsedEnvironment = serverEnvironmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
  throw new Error("Invalid server configuration. Check the names and formats in .env.example.");
}

if (
  parsedEnvironment.data.MONGODB_URI
  && !/^mongodb(?:\+srv)?:\/\//i.test(parsedEnvironment.data.MONGODB_URI)
) {
  throw new Error("Invalid server configuration: MONGODB_URI must use mongodb:// or mongodb+srv://.");
}

export const serverEnvironment = parsedEnvironment.data;
