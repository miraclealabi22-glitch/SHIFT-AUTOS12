import { developmentSocialFixtures } from "./development-fixtures";
import type { SocialFixtures } from "./types";

export async function getSocialFixtures(): Promise<SocialFixtures | null> {
  return process.env.NODE_ENV === "development" ? developmentSocialFixtures : null;
}
