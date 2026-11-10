import SocialPage from "@/components/social/social-page";

export default async function LikedPage({ params }: PageProps<"/profile/[username]/liked">) {
  const { username } = await params;
  return <SocialPage kind="liked" username={username} />;
}
