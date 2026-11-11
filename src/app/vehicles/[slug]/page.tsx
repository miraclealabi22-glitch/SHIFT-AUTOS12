import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";
import VehicleDetailMedia from "@/components/catalog/vehicle-detail-media";
import { getVehicle } from "@/lib/catalog/catalog";
import type { Vehicle } from "@/lib/catalog/types";

export const instant = false;

type VehiclePageProps = {
  params: Promise<{ slug: string }>;
};

function productionPeriod(vehicle: Vehicle): string | undefined {
  const generations = vehicle.generations ?? [];
  const start = vehicle.productionStartYear ?? generations
    .map((generation) => generation.productionStartYear)
    .filter((year): year is number => year !== undefined)
    .sort((left, right) => left - right)[0];
  const end = vehicle.productionEndYear ?? generations
    .map((generation) => generation.productionEndYear)
    .filter((year): year is number => year !== undefined)
    .sort((left, right) => right - left)[0];
  if (start === undefined && end === undefined) return undefined;
  return `${start ?? "—"}${end === undefined ? "–present" : `–${end}`}`;
}

function readableValue(value: string): string {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

export async function generateMetadata({ params }: VehiclePageProps): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  return {
    title: vehicle ? `${vehicle.modelName} — SHIFT` : "Vehicle — SHIFT",
    description: vehicle?.description,
  };
}

export default async function VehiclePage({ params }: VehiclePageProps) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);

  if (!vehicle) {
    return (
      <main id="main-content" className="catalog-page catalog-page--message">
        <SiteHeader active="models" />
        <Link className="catalog-back-link" href="/discover/vehicles">← ALL MODELS</Link>
        <p className="catalog-eyebrow">SHIFT / MODEL ARCHIVE</p>
        <h1>Vehicle record not found.</h1>
        <p>No published vehicle record exists for “{slug}” in the SHIFT catalogue.</p>
      </main>
    );
  }

  const generations = vehicle.generations ?? [];
  const allVariants = generations.flatMap((generation) => (
    (generation.variants ?? []).map((variant) => ({ generation, variant }))
  ));
  const designation = [
    ...(generations.length === 1 ? [generations[0].name] : []),
    ...(allVariants.length === 1 ? [allVariants[0].variant.name] : []),
  ].join(" · ") || undefined;
  const period = productionPeriod(vehicle);
  const baseSpecifications = vehicle.specifications ?? [];
  const performanceHighlights = baseSpecifications.filter((specification) => (
    /horsepower|power|torque|acceleration|top speed/i.test(specification.label)
  ));

  return (
    <main id="main-content" className="vehicle-detail">
      <SiteHeader active="models" />
      <nav className="vehicle-detail__nav" aria-label="Vehicle page sections">
        <Link href="/discover/vehicles">Archive</Link>
        <a href="#overview">The model</a>
        <a href="#gallery">Gallery</a>
        <a href="#specifications">Specifications</a>
        {generations.length > 0 && <a href="#evolution">Generations</a>}
      </nav>

      <VehicleDetailMedia vehicle={vehicle} period={period} designation={designation} />

      <section className="vehicle-introduction" id="overview">
        <div className="vehicle-introduction__title">
          <p className="catalog-eyebrow">THE MACHINE / {vehicle.manufacturerName}</p>
          <h2>{vehicle.modelName}</h2>
          <Link href={`/discover/brands/${vehicle.manufacturerSlug}`}>
            Discover the marque <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="vehicle-introduction__story">
          <div className="vehicle-introduction__facts">
            {period && <p><span>Production</span><strong>{period}</strong></p>}
            {vehicle.category && <p><span>Classification</span><strong>{readableValue(vehicle.category)}</strong></p>}
            {vehicle.status && <p><span>Status</span><strong>{readableValue(vehicle.status)}</strong></p>}
            {generations.length === 1 && <p><span>Generation</span><strong>{generations[0].name}</strong></p>}
            {allVariants.length === 1 && <p><span>Variant</span><strong>{allVariants[0].variant.name}</strong></p>}
            {vehicle.edition && <p><span>Edition</span><strong>{vehicle.edition}</strong></p>}
          </div>
          {vehicle.description ? (
            <p className="vehicle-introduction__description">{vehicle.description}</p>
          ) : (
            <p className="vehicle-detail__empty">An editorial description is not yet available for this vehicle.</p>
          )}
          {performanceHighlights.length > 0 && (
            <dl className="vehicle-introduction__highlights">
              {performanceHighlights.map((item) => (
                <div key={`${item.label}-${item.value}`}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {vehicle.historicalBackground && (
            <div className="vehicle-introduction__note">
              <h3>Heritage</h3>
              <p>{vehicle.historicalBackground}</p>
            </div>
          )}
          {vehicle.designEngineering && (
            <div className="vehicle-introduction__note">
              <h3>Design &amp; engineering</h3>
              <p>{vehicle.designEngineering}</p>
            </div>
          )}
        </div>
      </section>

      <section className="vehicle-specifications" id="specifications">
        <header className="vehicle-specifications__heading">
          <p className="catalog-eyebrow">ENGINEERING / DATA</p>
          <h2>Defined by its details.</h2>
          <p>Specifications are shown only where the catalogue has verified information.</p>
        </header>
        {baseSpecifications.length > 0 ? (
          <dl className="vehicle-specifications__list">
            {baseSpecifications.map((specification, index) => (
              <div key={`${specification.label}-${specification.value}-${index}`}>
                <dt>{specification.label}</dt>
                <dd>{specification.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="vehicle-detail__empty">Technical specifications are not available for this model yet.</p>
        )}
        {allVariants.some(({ variant }) => variant.specifications?.length) && (
          <div className="vehicle-specifications__variants">
            {allVariants.filter(({ variant }) => variant.specifications?.length).map(({ generation, variant }) => (
              <section key={variant.id}>
                <h3>{[generation.name, variant.name].join(" · ")}</h3>
                <dl className="vehicle-specifications__list">
                  {variant.specifications.map((specification, index) => (
                    <div key={`${specification.label}-${specification.value}-${index}`}>
                      <dt>{specification.label}</dt>
                      <dd>{specification.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        )}
      </section>

      {generations.length > 0 && (
        <section className="vehicle-evolution" id="evolution">
          <header className="vehicle-specifications__heading">
            <p className="catalog-eyebrow">MODEL / EVOLUTION</p>
            <h2>Generations &amp; variants.</h2>
          </header>
          <div className="vehicle-evolution__list">
            {generations.map((generation, index) => (
              <article key={generation.id}>
                <span className="vehicle-evolution__index">{String(index + 1).padStart(2, "0")}</span>
                <div className="vehicle-evolution__entry">
                  <div className="vehicle-evolution__title">
                    <h3>{generation.name}</h3>
                    {(generation.productionStartYear || generation.productionEndYear) && (
                      <p>
                        {generation.productionStartYear ?? "—"}
                        {generation.productionEndYear ? `–${generation.productionEndYear}` : "–present"}
                      </p>
                    )}
                  </div>
                  {generation.description && <p className="vehicle-evolution__description">{generation.description}</p>}
                  {(generation.variants?.length ?? 0) > 0 && (
                    <ul>
                      {generation.variants?.map((variant) => (
                        <li key={variant.id}>
                          <span>{variant.name}</span>
                          {variant.edition && <span>{variant.edition}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="vehicle-detail__footer">
        <p className="catalog-eyebrow">CONTINUE EXPLORING</p>
        <Link href={`/discover/brands/${vehicle.manufacturerSlug}`}>
          <span>{vehicle.manufacturerName}</span>
          <strong>Discover the marque <span aria-hidden="true">↗</span></strong>
        </Link>
      </footer>
    </main>
  );
}
