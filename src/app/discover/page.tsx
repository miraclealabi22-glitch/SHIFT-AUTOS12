import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/site-header";

export const metadata: Metadata = {
  title: "Discover — SHIFT",
  description: "Explore automotive manufacturers, vehicles and categories on SHIFT.",
};

const destinations = [
  {
    index: "01",
    title: "Manufacturers",
    description: "Explore the SHIFT index of automotive makers, from the established to the specialist.",
    href: "/discover/brands",
    action: "OPEN BRAND DIRECTORY",
  },
  {
    index: "02",
    title: "Vehicles",
    description: "Browse verified model, generation and specification records as they become available.",
    href: "/discover/vehicles",
    action: "BROWSE VEHICLES",
  },
  {
    index: "03",
    title: "Categories",
    description: "Find manufacturers by the type of automotive work they do.",
    href: "/discover/categories",
    action: "EXPLORE CATEGORIES",
  },
  {
    index: "04",
    title: "Collections",
    description: "Visit curated and saved automotive references.",
    href: "/discover/collections",
    action: "VIEW COLLECTIONS",
  },
];

export default function DiscoverPage() {
  return (
    <main id="main-content" className="catalog-page">
      <SiteHeader active="discover" />
      <section className="catalog-hero discovery-hero">
        <p className="catalog-eyebrow">SHIFT / DISCOVER</p>
        <h1>LOOK CLOSER.<br />FIND YOUR NEXT OBSESSION.</h1>
        <p className="catalog-hero__copy">A considered index of the makers, machines and ideas shaping automotive culture.</p>
      </section>
      <section className="discovery-grid" aria-label="Discover SHIFT">
        {destinations.map((destination) => (
          <Link className="discovery-card" href={destination.href} key={destination.href}>
            <span className="discovery-card__index">{destination.index}</span>
            <span className="discovery-card__body">
              <strong>{destination.title}</strong>
              <span>{destination.description}</span>
              <small>{destination.action} <span aria-hidden="true">↗</span></small>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
