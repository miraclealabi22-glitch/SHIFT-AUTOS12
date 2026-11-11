"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Vehicle } from "@/lib/catalog/types";
import VehicleImage from "@/components/catalog/vehicle-image";

type ModelsDiscoveryProps = {
  vehicles: Vehicle[];
  available: boolean;
};

function categoryLabel(category: string): string {
  return category.replaceAll("-", " ");
}

function generationLabel(vehicle: Vehicle): string | undefined {
  return vehicle.generations?.[0]?.name ?? vehicle.generation;
}

export default function ModelsDiscovery({ vehicles, available }: ModelsDiscoveryProps) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const categories = useMemo(
    () => [...new Set(vehicles.flatMap((vehicle) => vehicle.category ? [vehicle.category] : []))]
      .sort((left, right) => left.localeCompare(right)),
    [vehicles],
  );
  const filteredVehicles = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase();
    return vehicles.filter((vehicle) => (
      (category === "all" || vehicle.category === category)
      && (!searchTerm || `${vehicle.manufacturerName} ${vehicle.modelName} ${vehicle.generations?.map((item) => item.name).join(" ") ?? ""}`
        .toLocaleLowerCase()
        .includes(searchTerm))
    ));
  }, [category, search, vehicles]);

  return (
    <>
      <nav className="models-secondary-nav" aria-label="Filter models by category">
        <button
          type="button"
          aria-pressed={category === "all"}
          onClick={() => setCategory("all")}
        >
          All models
        </button>
        {categories.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {categoryLabel(item)}
          </button>
        ))}
        <label className="models-secondary-nav__search">
          <span className="sr-only">Search models</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder="Search models"
          />
        </label>
      </nav>

      <section className="models-editorial-intro" aria-labelledby="models-title">
        <p className="catalog-eyebrow">SHIFT / THE MODEL ARCHIVE</p>
        <h1 id="models-title">DISCOVER THE<br />MACHINES.</h1>
        <p>Explore the world’s remarkable automotive creations, from performance icons to extraordinary luxury vehicles.</p>
        <a href="#model-archive" className="models-editorial-intro__scroll">
          <span>EXPLORE THE ARCHIVE</span><span aria-hidden="true">↓</span>
        </a>
        <span className="models-editorial-intro__index" aria-hidden="true">M / 001</span>
      </section>

      <section className="models-archive" id="model-archive" aria-label="Vehicle models">
        <div className="models-archive__heading">
          <p className="catalog-eyebrow">MACHINES / {String(filteredVehicles.length).padStart(2, "0")}</p>
          <p>{filteredVehicles.length} {filteredVehicles.length === 1 ? "model" : "models"}</p>
        </div>
        {!available ? (
          <div className="catalog-state" role="status">
            <p className="catalog-eyebrow">ARCHIVE UNAVAILABLE</p>
            <h2>Vehicle records could not be loaded.</h2>
            <p>The model archive is temporarily unavailable. Please try again later.</p>
          </div>
        ) : filteredVehicles.length ? (
          <div className="models-editorial-list">
            {filteredVehicles.map((vehicle, index) => (
              <article className="models-editorial-entry" key={vehicle.id}>
                <Link
                  className="models-editorial-entry__media"
                  href={`/vehicles/${vehicle.slug}`}
                  aria-label={`Explore ${vehicle.manufacturerName} ${vehicle.modelName}`}
                >
                  <VehicleImage vehicle={vehicle} />
                  <span className="models-editorial-entry__media-index">
                    SHIFT / MODEL {String(index + 1).padStart(2, "0")}
                  </span>
                </Link>
                <div className="models-editorial-entry__copy">
                  <p className="catalog-eyebrow">{vehicle.manufacturerName}</p>
                  <h2>{vehicle.modelName}</h2>
                  {generationLabel(vehicle) && <p className="models-editorial-entry__generation">{generationLabel(vehicle)}</p>}
                  {vehicle.description && <p className="models-editorial-entry__description">{vehicle.description}</p>}
                  <div className="models-editorial-entry__facts">
                    {vehicle.category && <span>{categoryLabel(vehicle.category)}</span>}
                    {(vehicle.productionStartYear || vehicle.productionEndYear) && (
                      <span>
                        {vehicle.productionStartYear ?? "—"}
                        {vehicle.productionEndYear ? `–${vehicle.productionEndYear}` : "–"}
                      </span>
                    )}
                  </div>
                  <Link className="models-editorial-entry__action" href={`/vehicles/${vehicle.slug}`}>
                    Explore model <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="catalog-empty" role="status">
            <p className="catalog-eyebrow">{vehicles.length ? "NO MATCHING MODELS" : "NO PUBLISHED MODELS"}</p>
            <h2>{vehicles.length ? "No models match this selection." : "The model archive is taking shape."}</h2>
            <p>{vehicles.length
              ? "Try another search or category."
              : "Published vehicle records will appear here when they are available."}</p>
          </div>
        )}
      </section>
    </>
  );
}
