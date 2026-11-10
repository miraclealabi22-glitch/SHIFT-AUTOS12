import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "SHIFT Journal — Automotive Stories",
  description: "Editorial stories on the machines, people and ideas shaping automotive culture.",
};

export default function JournalPage() {
  return (
    <main id="main-content" className="catalog-page">
      <SiteHeader active="journal" />
      <section className="catalog-hero discovery-hero">
        <p className="catalog-eyebrow">SHIFT / JOURNAL</p>
        <h1>THE STORIES<br />BEHIND THE MACHINE.</h1>
        <p className="catalog-hero__copy">Reporting, perspective and considered details from across automotive culture.</p>
      </section>
      <section className="journal-empty" role="status">
        <p className="catalog-eyebrow">EDITORIAL ARCHIVE</p>
        <h2>Stories are not connected yet.</h2>
        <p>The project does not currently include an article service or verified editorial records. Published stories will appear here when the SHIFT Journal source is connected.</p>
        <div className="journal-empty__links">
          <Link className="text-link" href="/discover/brands">EXPLORE MANUFACTURERS <span aria-hidden="true">↗</span></Link>
          <Link className="text-link" href="/reels">EXPERIENCE SHIFT REELS <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
