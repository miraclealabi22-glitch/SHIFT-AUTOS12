import SocialPage from "@/components/social/social-page";

export default async function FollowingPage({ params }: PageProps<"/profile/[username]/following">) {
  const { username } = await params;
  return <SocialPage kind="following" username={username} />;
}
