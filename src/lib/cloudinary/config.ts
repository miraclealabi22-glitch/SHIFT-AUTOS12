export const MEDIA_FOLDERS = {
  landingHero: "shift/landing/hero",
  landingHeroFrames: "shift/landing/hero-frames",
  authenticationLogin: "shift/authentication/login",
  authenticationSignup: "shift/authentication/signup",
  manufacturers: "shift/manufacturers",
  vehicles: "shift/vehicles",
  editorial: "shift/editorial",
} as const;

export type MediaCategory = keyof typeof MEDIA_FOLDERS;
export type MediaResourceType = "image" | "video";

type CloudinaryDeliveryAsset = {
  publicId: string;
  resourceType: MediaResourceType;
  format: string;
  version: number;
};

export const SHIFT_MEDIA_ASSETS = {
  landingHero: {
    folder: "SHIFT/landing/hero",
    publicId: "d3fe7629-a8c0-4303-9f50-070c6423b3b0_oqpmfq",
    resourceType: "image",
    format: "png",
    version: 1794228567,
  },
  loginBackgroundVideo: {
    folder: "SHIFT/authentication/login",
    publicId: "Ferrari_commercial_in_black_studio_610e2c11_1080p_1_omu24a",
    resourceType: "video",
    format: "mp4",
    version: 1794228719,
  },
} as const satisfies Record<string, CloudinaryDeliveryAsset & { folder: string }>;

export const MAX_MEDIA_FILE_BYTES = {
  image: 15 * 1024 * 1024,
  video: 100 * 1024 * 1024,
} as const;

export const MEDIA_FORMATS: Record<MediaResourceType, readonly string[]> = {
  image: ["jpg", "jpeg", "png", "webp", "avif"],
  video: ["mp4", "mov", "webm"],
};

export function getCloudinaryDeliveryUrl(
  asset: CloudinaryDeliveryAsset,
  cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
): string | null {
  const normalizedCloudName = cloudName?.trim();
  const publicId = asset.publicId.trim();
  const segments = publicId.split("/");

  if (
    !normalizedCloudName
    || !publicId
    || segments.some((segment) => !segment || segment === "." || segment === "..")
    || !/^[a-z0-9]+$/i.test(asset.format)
    || !Number.isInteger(asset.version)
    || asset.version <= 0
  ) {
    return null;
  }

  const encodedPublicId = segments.map((segment) => encodeURIComponent(segment)).join("/");
  return `https://res.cloudinary.com/${encodeURIComponent(normalizedCloudName)}/${asset.resourceType}/upload/v${asset.version}/${encodedPublicId}.${asset.format}`;
}

export function getCloudinaryImageUrl(
  publicId: string | null | undefined,
  cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
): string | null {
  const normalizedPublicId = publicId?.trim();
  const normalizedCloudName = cloudName?.trim();

  if (!normalizedPublicId || !normalizedCloudName) {
    return null;
  }

  const segments = normalizedPublicId.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }

  const encodedPublicId = segments.map((segment) => encodeURIComponent(segment)).join("/");

  return `https://res.cloudinary.com/${encodeURIComponent(normalizedCloudName)}/image/upload/${encodedPublicId}`;
}
