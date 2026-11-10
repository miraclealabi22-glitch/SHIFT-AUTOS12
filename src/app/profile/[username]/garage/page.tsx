import SocialPage from "@/components/social/social-page";

export default async function GaragePage({ params }: PageProps<"/profile/[username]/garage">) {
  const { username } = await params;
  return <SocialPage kind="garage" username={username} />;
}
