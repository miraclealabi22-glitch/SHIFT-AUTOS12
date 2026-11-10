import SocialPage from "@/components/social/social-page";

export default async function PostPage({ params }: PageProps<"/posts/[postId]">) {
  const { postId } = await params;
  return <SocialPage kind="post" slug={postId} />;
}
