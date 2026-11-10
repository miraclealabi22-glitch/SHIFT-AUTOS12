import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

const cloudinaryEnvironmentSchema = z.object({
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().trim().min(1),
  CLOUDINARY_API_KEY: z.string().trim().min(1),
  CLOUDINARY_API_SECRET: z.string().trim().min(1),
});

export class CloudinaryConfigurationError extends Error {
  constructor(missingVariables: readonly string[]) {
    super(`Cloudinary is not configured. Set valid values for: ${missingVariables.join(", ")}.`);
    this.name = "CloudinaryConfigurationError";
  }
}

export function getCloudinaryServerConfig() {
  const result = cloudinaryEnvironmentSchema.safeParse(process.env);

  if (!result.success) {
    const invalidNames = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new CloudinaryConfigurationError(invalidNames);
  }

  return {
    cloudName: result.data.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: result.data.CLOUDINARY_API_KEY,
    apiSecret: result.data.CLOUDINARY_API_SECRET,
  };
}

export function getCloudinaryClient() {
  const config = getCloudinaryServerConfig();
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  return cloudinary;
}
