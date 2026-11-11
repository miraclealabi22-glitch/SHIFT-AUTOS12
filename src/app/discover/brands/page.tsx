import type { Metadata } from "next";
import SiteHeader from "@/components/site/site-header";
import ManufacturerDirectory from "@/components/catalog/manufacturer-directory";
import { getManufacturerDirectoryPage } from "@/lib/catalog/catalog";
import type { ManufacturerCategory } from "@/lib/catalog/types";

export const metadata: Metadata = {
  title: "Manufacturer Directory — SHIFT",
  description: "Explore the automotive manufacturer index from SHIFT.",
};

export const instant = false;

export default async function BrandsPage({ searchParams }: PageProps<"/discover/brands">) {
  const { category: requestedCategory } = await searchParams;
  const validCategories = ["hypercar", "supercar", "luxury", "sports", "electric", "mainstream", "performance-tuner", "coachbuilder", "historic-discontinued"];
  const initialCategory = typeof requestedCategory === "string" && validCategories.includes(requestedCategory)
    ? requestedCategory as ManufacturerCategory
    : undefined;
  const result = await getManufacturerDirectoryPage({
    first: 48,
    sort: "OVERALL_RANK",
    rankingCategory: "HYPERCAR",
    ...(initialCategory ? { filter: { category: initialCategory.toUpperCase().replaceAll("-", "_") } } : {}),
  });

  return (
    <main id="main-content" className="catalog-page">
      <SiteHeader active="brands" />
      <section className="catalog-hero">
        <p className="catalog-eyebrow">DISCOVER / MANUFACTURERS</p>
        <h1>THE MAKERS<br />BEHIND THE MACHINE.</h1>
        <p className="catalog-hero__copy">An index of the names that shape automotive culture.</p>
      </section>
      <section className="directory-section" aria-label="Manufacturer directory">
        <ManufacturerDirectory
          key={initialCategory ?? "all"}
          manufacturers={result.items}
          available={result.available}
          pageInfo={result.pageInfo}
          totalCount={result.totalCount}
          initialCategory={initialCategory}
        />
      </section>
    </main>
  );
}
