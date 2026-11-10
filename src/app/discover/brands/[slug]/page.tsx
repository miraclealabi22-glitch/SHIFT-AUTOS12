import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/site-header";
import VehicleCatalogue from "@/components/catalog/vehicle-catalogue";
import ManufacturerLogo from "@/components/catalog/manufacturer-logo";
import { getManufacturer, getVehiclesForManufacturer } from "@/lib/catalog/catalog";

export const instant = false;

type ManufacturerPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ManufacturerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const manufacturer = await getManufacturer(slug);
  return { title: manufacturer ? `${manufacturer.name} — SHIFT` : "Manufacturer — SHIFT" };
}

export default async function ManufacturerPage({ params }: ManufacturerPageProps) {
  const { slug } = await params;
  const manufacturer = await getManufacturer(slug);
  if (!manufacturer) notFound();

  const catalogue = await getVehiclesForManufacturer(manufacturer.slug);
  return (
    <main id="main-content" className="catalog-page">
      <SiteHeader active="brands" />
      <section className="manufacturer-hero">
        <Link className="catalog-back-link" href="/discover/brands">← ALL MANUFACTURERS</Link>
        <div className="manufacturer-hero__identity">
          <ManufacturerLogo
            manufacturer={manufacturer}
            className="manufacturer-hero__logo"
            fallbackClassName="manufacturer-hero__placeholder"
            fallbackLabel={manufacturer.name}
          />
          <div>
            <p className="catalog-eyebrow">MANUFACTURER ARCHIVE</p>
            <h1>{manufacturer.name}</h1>
            {(manufacturer.countryOfOrigin || manufacturer.description) && (
              <p className="manufacturer-hero__description">
                {[manufacturer.countryOfOrigin, manufacturer.description].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
        <div className="manufacturer-hero__facts">
          {manufacturer.vehicleCount !== undefined && <span>{manufacturer.vehicleCount} vehicles in archive</span>}
          {manufacturer.categories.map((category) => <span key={category}>{category.replace("-", " ")}</span>)}
          {manufacturer.foundingYear && <span>Founded {manufacturer.foundingYear}</span>}
          {manufacturer.manufacturerType && <span>{manufacturer.manufacturerType}</span>}
          {manufacturer.status && <span>{manufacturer.status}</span>}
        </div>
      </section>
      {(manufacturer.about || manufacturer.history) && (
        <section className="grid gap-8 border-b border-[#303030] bg-[#0b0b0b] px-6 py-12 md:grid-cols-2 md:px-12">
          {manufacturer.about && <article><p className="catalog-eyebrow">ABOUT THE MARQUE</p><p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-[#c5c5c5]">{manufacturer.about}</p></article>}
          {manufacturer.history && <article><p className="catalog-eyebrow">HISTORY</p><p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-[#c5c5c5]">{manufacturer.history}</p></article>}
        </section>
      )}
      <section className="vehicle-section">
        <div className="section-heading">
          <div>
            <p className="catalog-eyebrow">THE ARCHIVE</p>
            <h2>Models &amp; generations</h2>
          </div>
          <span>{catalogue.available ? `${catalogue.items.length} VEHICLES` : "CATALOGUE UNAVAILABLE"}</span>
        </div>
        <VehicleCatalogue vehicles={catalogue.items} available={catalogue.available} />
      </section>
    </main>
  );
}
