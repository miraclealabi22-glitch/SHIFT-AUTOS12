import SocialPage from "@/components/social/social-page";

export default async function ProfileReelsPage({ params }: PageProps<"/profile/[username]/reels">) {
  const { username } = await params;
  return <SocialPage kind="profile-reels" username={username} />;
}
