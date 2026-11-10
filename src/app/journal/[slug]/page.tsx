import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Story — SHIFT Journal",
};

export default async function JournalStoryPage({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  return (
    <main id="main-content" className="catalog-page catalog-page--message">
      <SiteHeader active="journal" />
      <Link className="catalog-back-link" href="/journal">← SHIFT JOURNAL</Link>
      <p className="catalog-eyebrow">EDITORIAL ARCHIVE</p>
      <h1>Story not available.</h1>
      <p>No verified SHIFT Journal article is available for “{slug}”. Stories will be published here when the editorial source is connected.</p>
      <Link className="text-link" href="/journal">RETURN TO JOURNAL <span aria-hidden="true">↗</span></Link>
    </main>
  );
}
