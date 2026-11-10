"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Vehicle } from "@/lib/catalog/types";
import VehicleImage from "@/components/catalog/vehicle-image";

type VehicleCatalogueProps = {
  vehicles: Vehicle[];
  available: boolean;
};

export default function VehicleCatalogue({ vehicles, available }: VehicleCatalogueProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [era, setEra] = useState("all");
  const [generation, setGeneration] = useState("all");
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const filtered = useMemo(() => vehicles.filter((vehicle) => {
    const generationNames = vehicle.generations?.map((generation) => generation.name) ?? [];
    const variantNames = vehicle.generations?.flatMap((generation) => (
      generation.variants?.flatMap((variant) => [variant.name, variant.edition].filter(Boolean)) ?? []
    )) ?? [];
    const name = `${vehicle.modelName} ${vehicle.generation ?? ""} ${vehicle.variant ?? ""} ${vehicle.edition ?? ""} ${generationNames.join(" ")} ${variantNames.join(" ")}`;
    const matchesQuery = name.toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || vehicle.status === status;
    const matchesCategory = category === "all" || vehicle.category === category;
    const matchesGeneration = generation === "all"
      || vehicle.generation === generation
      || generationNames.includes(generation);
    const year = vehicle.productionStartYear
      ?? vehicle.generations?.find((item) => item.productionStartYear !== undefined)?.productionStartYear;
    const endYear = vehicle.productionEndYear
      ?? [...(vehicle.generations ?? [])].reverse().find((item) => item.productionEndYear !== undefined)?.productionEndYear;
    const matchesEra = era === "all" || (year !== undefined && (
      era === "classic" ? year < 1980 : era === "modern" ? year >= 1980 && year < 2010 : year >= 2010
    ));
    const matchesYears = (!fromYear || (endYear ?? Infinity) >= Number(fromYear))
      && (!toYear || (year ?? -Infinity) <= Number(toYear));
    return matchesQuery && matchesStatus && matchesCategory && matchesEra && matchesGeneration && matchesYears;
  }), [vehicles, query, status, category, era, generation, fromYear, toYear]);
  const categories = [...new Set(vehicles.flatMap((vehicle) => vehicle.category ? [vehicle.category] : []))];
  const generations = [...new Set(vehicles.flatMap((vehicle) => [
    ...(vehicle.generation ? [vehicle.generation] : []),
    ...(vehicle.generations?.map((item) => item.name) ?? []),
  ]))];

  return (
    <>
      <div className="vehicle-filters">
        <label>
          <span>Search models</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Model, generation, edition" />
        </label>
        <label className="vehicle-filters__years">
          <span>Production years</span>
          <span className="vehicle-filters__range">
            <input aria-label="From year" type="number" min="1886" max="2100" value={fromYear} onChange={(event) => setFromYear(event.currentTarget.value)} disabled={!vehicles.some((vehicle) => vehicle.productionStartYear)} placeholder="From" />
            <span>TO</span>
            <input aria-label="To year" type="number" min="1886" max="2100" value={toYear} onChange={(event) => setToYear(event.currentTarget.value)} disabled={!vehicles.some((vehicle) => vehicle.productionStartYear)} placeholder="To" />
          </span>
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.currentTarget.value)} disabled={!categories.length}>
            <option value="all">All categories</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Generation</span>
          <select value={generation} onChange={(event) => setGeneration(event.currentTarget.value)} disabled={!generations.length}>
            <option value="all">All generations</option>
            {generations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Production era</span>
          <select value={era} onChange={(event) => setEra(event.currentTarget.value)} disabled={!vehicles.some((vehicle) => vehicle.productionStartYear)}>
            <option value="all">All eras</option>
            <option value="classic">Before 1980</option>
            <option value="modern">1980–2009</option>
            <option value="contemporary">2010 onward</option>
          </select>
        </label>
        <label>
          <span>Availability</span>
          <select value={status} onChange={(event) => setStatus(event.currentTarget.value)} disabled={!vehicles.some((vehicle) => vehicle.status)}>
            <option value="all">All models</option>
            <option value="current">Current</option>
            <option value="discontinued">Discontinued</option>
            <option value="limited-production">Limited production</option>
          </select>
        </label>
      </div>

      {filtered.length > 0 ? (
        <div className="vehicle-grid">
          {filtered.map((vehicle) => (
            <Link className="vehicle-tile" href={`/vehicles/${vehicle.slug}`} key={vehicle.id}>
              <span className="vehicle-tile__image">
                <VehicleImage vehicle={vehicle} />
              </span>
              <span className="vehicle-tile__title">{vehicle.modelName}</span>
              {(vehicle.generation || vehicle.variant || vehicle.edition || vehicle.generations?.length) && (
                <span className="vehicle-tile__detail">
                  {[
                    vehicle.generation,
                    vehicle.variant,
                    vehicle.edition,
                    ...(vehicle.generations?.map((item) => item.name) ?? []),
                    ...(vehicle.generations?.flatMap((item) => item.variants?.map((variant) => variant.name) ?? []) ?? []),
                  ].filter(Boolean).join(" · ")}
                </span>
              )}
              {(vehicle.productionStartYear || vehicle.productionEndYear || vehicle.generations?.some((item) => item.productionStartYear || item.productionEndYear)) && (
                <span className="vehicle-tile__detail">
                  {vehicle.productionStartYear
                    ?? vehicle.generations?.find((item) => item.productionStartYear)?.productionStartYear
                    ?? "—"}–{vehicle.productionEndYear
                    ?? [...(vehicle.generations ?? [])].reverse().find((item) => item.productionEndYear)?.productionEndYear
                    ?? "present"}
                </span>
              )}
              {vehicle.category && <span className="vehicle-tile__detail">{vehicle.category}</span>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="catalog-empty">
          <p className="catalog-eyebrow">{available ? vehicles.length ? "NO MATCHING VEHICLES" : "NO VEHICLE RECORDS" : "CATALOGUE UNAVAILABLE"}</p>
          <h2>{available
            ? vehicles.length ? "No models match these filters." : "No vehicle records are available yet."
            : "The model archive could not be loaded."}</h2>
          <p>{available
            ? vehicles.length
              ? "Try a broader search or different filters."
              : "Vehicle models will appear when production records are added to the SHIFT catalogue."
            : "The vehicle service is temporarily unavailable. Please try again later."}</p>
        </div>
      )}
    </>
  );
}
