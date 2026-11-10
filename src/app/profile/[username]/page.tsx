import SocialPage from "@/components/social/social-page";

export default async function ProfilePage({ params }: PageProps<"/profile/[username]">) {
  const { username } = await params;
  return <SocialPage kind="profile" username={username} />;
}
