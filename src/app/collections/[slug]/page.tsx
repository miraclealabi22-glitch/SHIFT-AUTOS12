import SocialPage from "@/components/social/social-page";

export default async function CollectionPage({ params }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  return <SocialPage kind="collection" slug={slug} />;
}
