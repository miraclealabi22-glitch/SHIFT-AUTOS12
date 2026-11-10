import type { Metadata } from "next";
import SiteHeader from "@/components/site/site-header";
import VehicleCatalogue from "@/components/catalog/vehicle-catalogue";
import { getVehicles } from "@/lib/catalog/catalog";

export const instant = false;

export const metadata: Metadata = {
  title: "Vehicle Archive — SHIFT",
  description: "Search the SHIFT vehicle archive.",
};

export default async function VehiclesPage() {
  const result = await getVehicles();

  return (
    <main id="main-content" className="catalog-page">
      <SiteHeader active="discover" />
      <section className="catalog-hero discovery-hero discovery-hero--compact">
        <p className="catalog-eyebrow">DISCOVER / VEHICLES</p>
        <h1>THE VEHICLE<br />ARCHIVE.</h1>
        <p className="catalog-hero__copy">Search verified models, generations and editions across automotive history.</p>
      </section>
      <section className="vehicle-section discovery-vehicle-section" aria-label="Vehicle catalogue">
        <VehicleCatalogue vehicles={result.items} available={result.available} />
      </section>
    </main>
  );
}
