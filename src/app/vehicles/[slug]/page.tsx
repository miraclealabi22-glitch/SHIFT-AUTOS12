import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";
import { getVehicle } from "@/lib/catalog/catalog";

export const instant = false;

type VehiclePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: VehiclePageProps): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  return { title: vehicle ? `${vehicle.modelName} — SHIFT` : "Vehicle — SHIFT" };
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);

  if (!vehicle) {
    return (
      <main id="main-content" className="catalog-page catalog-page--message">
        <SiteHeader />
        <Link className="catalog-back-link" href="/discover/brands">← MANUFACTURER DIRECTORY</Link>
        <p className="catalog-eyebrow">VEHICLE EXPERIENCE</p>
        <h1>Vehicle record not found.</h1>
        <p>No vehicle record exists for “{slug}” in the SHIFT catalogue.</p>
      </main>
    );
  }

  const verifiedImage = vehicle.images.find((image) => image.verificationStatus === "verified");
  const firstGeneration = vehicle.generations?.[0];

  return (
    <main id="main-content" className="vehicle-detail">
      <SiteHeader />
      <Link className="catalog-back-link" href={`/discover/brands/${vehicle.manufacturerSlug}`}>
        ← {vehicle.manufacturerName.toUpperCase()} ARCHIVE
      </Link>
      <p className="catalog-eyebrow">VEHICLE EXPLORATION</p>
      <h1>{vehicle.modelName}</h1>
      {vehicle.description && <p>{vehicle.description}</p>}
      {vehicle.historicalBackground && <section className="vehicle-specifications"><h2>Historical background</h2><p>{vehicle.historicalBackground}</p></section>}
      {vehicle.designEngineering && <section className="vehicle-specifications"><h2>Design &amp; engineering</h2><p>{vehicle.designEngineering}</p></section>}
      {verifiedImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="vehicle-detail__image"
          src={verifiedImage.url}
          alt={verifiedImage.alt}
        />
      )}
      <dl className="vehicle-specifications">
        {[
          ["Manufacturer", vehicle.manufacturerName],
          ["Production", [
            vehicle.productionStartYear ?? firstGeneration?.productionStartYear,
            vehicle.productionEndYear ?? firstGeneration?.productionEndYear,
          ].filter(Boolean).join("–")],
          ["Category", vehicle.category],
          ["Generation", vehicle.generation],
          ["Variant", vehicle.variant],
          ["Edition", vehicle.edition],
          ...((vehicle.specifications ?? []).map((specification) => [specification.label, specification.value])),
        ].filter((item): item is [string, string] => Boolean(item[1])).map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      {vehicle.generations?.map((generation) => (
        <section className="vehicle-specifications" key={generation.id} aria-label={`${generation.name} generation`}>
          <h2>{generation.name}</h2>
          {(generation.productionStartYear || generation.productionEndYear) && (
            <p>{generation.productionStartYear ?? "—"}–{generation.productionEndYear ?? "present"}</p>
          )}
          {generation.variants?.map((variant) => (
            <p key={variant.id}>{[variant.name, variant.edition].filter(Boolean).join(" · ")}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
