import type { Metadata } from "next";
import SiteHeader from "@/components/site/site-header";
import ModelsDiscovery from "@/components/catalog/models-discovery";
import { getVehicles } from "@/lib/catalog/catalog";

export const instant = false;

export const metadata: Metadata = {
  title: "Models — SHIFT",
  description: "Discover the machines in the SHIFT automotive archive.",
};

export default async function VehiclesPage() {
  const result = await getVehicles();

  return (
    <main id="main-content" className="models-page">
      <SiteHeader active="models" />
      <ModelsDiscovery vehicles={result.items} available={result.available} />
    </main>
  );
}
