export function assertManufacturerCanPublish(input: {
  name?: string | null;
  countryOfOrigin?: string | null;
  categories?: readonly string[] | null;
  logoUrl?: string | null;
  logoLicense?: string | null;
}): void {
  if (
    !input.name?.trim()
    || !input.countryOfOrigin?.trim()
    || !input.categories?.length
    || !input.logoUrl?.trim()
    || !input.logoLicense?.trim()
  ) {
    throw new Error("Publishing requires a name, country, classification, and licensed logo.");
  }
}

export function assertVehicleCanPublish(input: {
  manufacturerPublished: boolean;
  primaryImageCount: number;
  primaryImageLicensed: boolean;
}): void {
  if (!input.manufacturerPublished || input.primaryImageCount !== 1 || !input.primaryImageLicensed) {
    throw new Error("Publishing a vehicle requires a published manufacturer and exactly one licensed primary image.");
  }
}
