import SocialExperience, { type SocialPageKind } from "./social-experience";
import { getSocialFixtures } from "@/lib/social/social-data";

type SocialPageProps = {
  kind: SocialPageKind;
  username?: string;
  slug?: string;
};

export default async function SocialPage({ kind, username, slug }: SocialPageProps) {
  const fixtures = await getSocialFixtures();
  return <SocialExperience kind={kind} fixtures={fixtures} username={username} slug={slug} />;
}
