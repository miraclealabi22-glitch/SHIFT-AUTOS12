import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Automotive Collections — SHIFT",
  description: "Explore curated automotive collections on SHIFT.",
};

export default function DiscoverCollectionsPage() {
  return (
    <main id="main-content" className="catalog-page">
      <SiteHeader active="discover" />
      <section className="catalog-hero discovery-hero discovery-hero--compact">
        <p className="catalog-eyebrow">DISCOVER / COLLECTIONS</p>
        <h1>CURATED<br />PERSPECTIVES.</h1>
        <p className="catalog-hero__copy">Collections bring together the machines, details and ideas worth returning to.</p>
      </section>
      <section className="journal-empty" role="status">
        <p className="catalog-eyebrow">CURATED ARCHIVE</p>
        <h2>Public collections are not connected yet.</h2>
        <p>No verified editorial collection records are available in the current data source. Connect the SHIFT curation service before publishing public collections.</p>
        <div className="journal-empty__links">
          <Link className="text-link" href="/discover/brands">EXPLORE MANUFACTURERS <span aria-hidden="true">↗</span></Link>
          <Link className="text-link" href="/collections">OPEN MY COLLECTIONS <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </main>
  );
}
