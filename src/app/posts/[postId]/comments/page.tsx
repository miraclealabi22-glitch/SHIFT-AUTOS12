import SocialPage from "@/components/social/social-page";

export default async function PostCommentsPage({ params }: PageProps<"/posts/[postId]/comments">) {
  const { postId } = await params;
  return <SocialPage kind="comments" slug={postId} />;
}
