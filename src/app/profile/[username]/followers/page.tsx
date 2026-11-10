import SocialPage from "@/components/social/social-page";

export default async function FollowersPage({ params }: PageProps<"/profile/[username]/followers">) {
  const { username } = await params;
  return <SocialPage kind="followers" username={username} />;
}
