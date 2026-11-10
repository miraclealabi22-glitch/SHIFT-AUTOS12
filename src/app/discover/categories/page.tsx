import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";
import { getManufacturers } from "@/lib/catalog/catalog";
import type { ManufacturerCategory } from "@/lib/catalog/types";

export const instant = false;

export const metadata: Metadata = {
  title: "Automotive Categories — SHIFT",
  description: "Explore manufacturers by automotive category.",
};

const categoryLabels: Record<ManufacturerCategory, string> = {
  hypercar: "Hypercar",
  supercar: "Supercar",
  luxury: "Luxury",
  sports: "Sports car",
  electric: "Electric",
  mainstream: "Mainstream",
  "performance-tuner": "Performance & tuners",
  coachbuilder: "Coachbuilders",
  "historic-discontinued": "Historic marques",
};

export default async function CategoriesPage() {
  const result = await getManufacturers();
  const categories = [...new Set(result.items.flatMap((manufacturer) => manufacturer.categories))];

  return (
    <main id="main-content" className="catalog-page">
      <SiteHeader active="discover" />
      <section className="catalog-hero discovery-hero discovery-hero--compact">
        <p className="catalog-eyebrow">DISCOVER / CATEGORIES</p>
        <h1>BUILT WITH<br />INTENT.</h1>
        <p className="catalog-hero__copy">Explore the disciplines, ambitions and traditions of automotive makers.</p>
      </section>
      <section className="category-index" aria-label="Automotive manufacturer categories">
        {!result.available && (
          <p className="catalog-notice" role="status">The manufacturer catalogue is temporarily unavailable.</p>
        )}
        {categories.length ? categories.map((category, index) => {
          const count = result.items.filter((manufacturer) => manufacturer.categories.includes(category)).length;
          return (
            <Link href={`/discover/brands?category=${category}`} className="category-index__item" key={category}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{categoryLabels[category]}</strong>
              <small>{count} {count === 1 ? "maker" : "makers"} · VIEW DIRECTORY ↗</small>
            </Link>
          );
        }) : (
          <div className="catalog-state" role="status">
            <p className="catalog-eyebrow">{result.available ? "NO CATEGORIES" : "CATALOGUE OFFLINE"}</p>
            <h2>{result.available ? "No manufacturer categories are available." : "Manufacturer categories could not be loaded."}</h2>
            <p>{result.available
              ? "Categories will appear here when manufacturer records are available in the catalogue."
              : "The manufacturer service is temporarily unavailable. Please try again later."}</p>
            <Link className="text-link" href="/discover/brands">OPEN MANUFACTURER DIRECTORY <span aria-hidden="true">↗</span></Link>
          </div>
        )}
      </section>
    </main>
  );
}
