export const VEHICLE_MEDIA_CATEGORIES = ["exterior", "interior", "technical", "other"] as const;
export type VehicleMediaCategory = typeof VEHICLE_MEDIA_CATEGORIES[number];

export const VEHICLE_IMAGE_VIEWS = [
  "front",
  "rear",
  "side",
  "front-three-quarter",
  "rear-three-quarter",
  "wheel",
  "body-detail",
  "dashboard",
  "cockpit",
  "steering-wheel",
  "front-seats",
  "rear-seats",
  "centre-console",
  "door-panel",
  "interior-detail",
  "engine",
  "chassis",
  "mechanical-detail",
  "other",
] as const;
export type VehicleImageView = typeof VEHICLE_IMAGE_VIEWS[number];

export const VEHICLE_IMAGE_VIEWS_BY_CATEGORY: Record<VehicleMediaCategory, readonly VehicleImageView[]> = {
  exterior: ["front", "rear", "side", "front-three-quarter", "rear-three-quarter", "wheel", "body-detail"],
  interior: ["dashboard", "cockpit", "steering-wheel", "front-seats", "rear-seats", "centre-console", "door-panel", "interior-detail"],
  technical: ["engine", "chassis", "mechanical-detail"],
  other: ["other"],
};

export function isVehicleImageViewForCategory(
  category: VehicleMediaCategory,
  view: VehicleImageView,
): boolean {
  return VEHICLE_IMAGE_VIEWS_BY_CATEGORY[category].includes(view);
}

export function normalizeMediaAssociationName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
