"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Manufacturer, ManufacturerCategory } from "@/lib/catalog/types";
import ManufacturerLogo from "@/components/catalog/manufacturer-logo";

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
const categories = Object.keys(categoryLabels) as ManufacturerCategory[];
const criteriaLabels = {
  prestige: "Prestige",
  performance: "Performance",
  exclusivity: "Exclusivity",
  innovation: "Innovation",
  heritage: "Heritage",
  industryInfluence: "Industry influence",
} as const;
const criteriaKeys = Object.keys(criteriaLabels) as (keyof typeof criteriaLabels)[];
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const pageSize = 48;

type SortMode = "overall" | "category" | "alphabetical";

function isVerifiedRanking(manufacturer: Manufacturer) {
  const criteria = manufacturer.rankingCriteria;
  const criteriaScores = criteria ? criteriaKeys.map((key) => criteria[key]) : [];
  const calculatedScore = criteriaScores.reduce((total, score) => total + score, 0) / 30 * 100;
  const sources = manufacturer.rankingSources;
  const validSources = sources?.length
    && sources.every((source) => source.title.trim() && source.publisher.trim() && /^https?:\/\//i.test(source.url) && source.accessedAt.trim())
    && criteriaKeys.every((key) => sources.some((source) => source.supports?.includes(key)));
  return Boolean(
    manufacturer.rankingScore !== undefined
    && manufacturer.rankingScore >= 0
    && manufacturer.rankingScore <= 100
    && criteriaScores.length === 6
    && criteriaScores.every((score) => Number.isFinite(score) && score >= 0 && score <= 5)
    && Math.abs(manufacturer.rankingScore - calculatedScore) < 0.1
    && manufacturer.rankingExplanation?.trim()
    && validSources
    && manufacturer.lastRankedAt
    && Number.isFinite(Date.parse(manufacturer.lastRankedAt)),
  );
}

function getRank(manufacturer: Manufacturer, sortMode: SortMode, rankingCategory: ManufacturerCategory) {
  if (!isVerifiedRanking(manufacturer)) return undefined;
  const rank = sortMode === "category"
    ? manufacturer.categoryRanks?.[rankingCategory]
    : manufacturer.overallRank;
  return rank !== undefined && Number.isInteger(rank) && rank > 0 ? rank : undefined;
}

type ManufacturerDirectoryProps = {
  manufacturers: Manufacturer[];
  available: boolean;
  initialCategory?: ManufacturerCategory;
};

export default function ManufacturerDirectory({
  manufacturers,
  available,
  initialCategory,
}: ManufacturerDirectoryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ManufacturerCategory | "all">(initialCategory ?? "all");
  const [letter, setLetter] = useState<string | null>(null);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("overall");
  const [rankingCategory, setRankingCategory] = useState<ManufacturerCategory>("hypercar");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "discontinued">("all");
  const [page, setPage] = useState(0);
  const hasFeatured = manufacturers.some((manufacturer) => manufacturer.featured);
  const countries = [...new Set(manufacturers.flatMap((manufacturer) => manufacturer.countryOfOrigin ? [manufacturer.countryOfOrigin] : []))].sort();
  const rankedCount = manufacturers.filter((manufacturer) => getRank(manufacturer, sortMode, rankingCategory) !== undefined).length;
  const categoryChoices = categories.filter((item) => manufacturers.some((manufacturer) => manufacturer.categories.includes(item)));

  const filtered = useMemo(() => manufacturers
    .filter((manufacturer) => {
      const matchesQuery = manufacturer.name.toLowerCase().includes(query.trim().toLowerCase());
      const matchesCategory = category === "all" || manufacturer.categories.includes(category);
      const matchesLetter = !letter || manufacturer.name.toUpperCase().startsWith(letter);
      const matchesFeatured = !featuredOnly || manufacturer.featured === true;
      const matchesCountry = country === "all" || manufacturer.countryOfOrigin === country;
      const matchesStatus = status === "all" || manufacturer.status === status;
      return matchesQuery && matchesCategory && matchesLetter && matchesFeatured && matchesCountry && matchesStatus;
    })
    .sort((a, b) => {
      if (sortMode === "alphabetical") return a.name.localeCompare(b.name);
      const rankA = getRank(a, sortMode, rankingCategory);
      const rankB = getRank(b, sortMode, rankingCategory);
      if (rankA !== undefined && rankB !== undefined && rankA !== rankB) return rankA - rankB;
      if (rankA !== undefined && rankB === undefined) return -1;
      if (rankA === undefined && rankB !== undefined) return 1;
      if (rankA !== undefined && rankB !== undefined
        && a.rankingScore !== undefined && b.rankingScore !== undefined
        && a.rankingScore !== b.rankingScore) {
        return b.rankingScore - a.rankingScore;
      }
      return a.name.localeCompare(b.name);
    }), [manufacturers, query, category, letter, featuredOnly, country, status, sortMode, rankingCategory]);

  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function resetPage(action: () => void) {
    action();
    setPage(0);
  }

  return (
    <>
      {!available && (
        <div className="catalog-state" role="status">
          <p className="catalog-eyebrow">CATALOGUE UNAVAILABLE</p>
          <h2>Manufacturer records could not be loaded.</h2>
          <p>The manufacturer service is temporarily unavailable. Please try again later.</p>
        </div>
      )}

      <div className="directory-controls">
        <label className="directory-search">
          <span>Search manufacturers</span>
          <input
            type="search"
            value={query}
            onChange={(event) => resetPage(() => setQuery(event.currentTarget.value))}
            placeholder="Search by name"
          />
        </label>
        <div className="directory-selects">
          <label>
            <span>Sort directory</span>
            <select
              value={sortMode}
              onChange={(event) => resetPage(() => setSortMode(event.currentTarget.value as SortMode))}
            >
              <option value="overall">Overall SHIFT ranking</option>
              <option value="category">Category ranking</option>
              <option value="alphabetical">A–Z alphabetical</option>
            </select>
          </label>
          {sortMode === "category" && (
            <label>
              <span>Ranking category</span>
              <select
                value={rankingCategory}
                onChange={(event) => resetPage(() => setRankingCategory(event.currentTarget.value as ManufacturerCategory))}
              >
                {categoryChoices.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
              </select>
            </label>
          )}
          <label>
            <span>Country</span>
            <select value={country} disabled={!countries.length} onChange={(event) => resetPage(() => setCountry(event.currentTarget.value))}>
              <option value="all">{countries.length ? "All countries" : "Country data unavailable"}</option>
              {countries.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Marque status</span>
            <select
              value={status}
              disabled={!manufacturers.some((manufacturer) => manufacturer.status)}
              onChange={(event) => resetPage(() => setStatus(event.currentTarget.value as typeof status))}
            >
              <option value="all">{manufacturers.some((manufacturer) => manufacturer.status) ? "All statuses" : "Status data unavailable"}</option>
              {manufacturers.some((manufacturer) => manufacturer.status === "active") && <option value="active">Active</option>}
              {manufacturers.some((manufacturer) => manufacturer.status === "discontinued") && <option value="discontinued">Discontinued</option>}
            </select>
          </label>
        </div>
        <div className="directory-categories" aria-label="Filter by manufacturer category">
          <button type="button" aria-pressed={category === "all"} onClick={() => resetPage(() => setCategory("all"))}>All</button>
          {categoryChoices.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => resetPage(() => setCategory(item))}
            >
              {categoryLabels[item]}
            </button>
          ))}
          {hasFeatured && (
            <button
              type="button"
              aria-pressed={featuredOnly}
              onClick={() => resetPage(() => setFeaturedOnly((current) => !current))}
            >
              Featured
            </button>
          )}
        </div>
      </div>

      <nav className="directory-alphabet" aria-label="Filter manufacturers alphabetically">
        <button type="button" aria-pressed={!letter} onClick={() => resetPage(() => setLetter(null))}>All</button>
        {alphabet.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={letter === item}
            onClick={() => resetPage(() => setLetter(item))}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="directory-result-line" aria-live="polite">
        <span>{filtered.length} {filtered.length === 1 ? "manufacturer" : "manufacturers"}</span>
        <span>{rankedCount} verified {sortMode === "category" ? `${categoryLabels[rankingCategory]} ` : ""}SHIFT {rankedCount === 1 ? "rank" : "ranks"}</span>
        {category !== "all" && <span>{categoryLabels[category]}</span>}
        {letter && <span>Starting with {letter}</span>}
      </div>

      {visible.length > 0 ? (
        <>
          <p className="ranking-methodology">
            SHIFT editorial ranking · prestige, performance, exclusivity, innovation, heritage, and industry influence are equally weighted. Each criterion is assessed from 0–5 using cited evidence; the mean is normalized to 100. Ranks are SHIFT editorial judgments, not official industry awards. Unresearched manufacturers remain unranked.
          </p>
          <div className="manufacturer-grid">
          {visible.map((manufacturer) => (
            <article className="manufacturer-tile" key={manufacturer.id}>
              <Link
                className="manufacturer-tile__link"
                href={`/discover/brands/${manufacturer.slug}`}
                aria-label={`Explore ${manufacturer.name}`}
              >
                {(() => {
                  const rank = getRank(manufacturer, sortMode, rankingCategory);
                  const verifiedLogo = manufacturer.logoVerificationStatus === "verified"
                    ? manufacturer.logo
                    : undefined;
                  return (
                    <>
                      <span className="manufacturer-tile__rank" aria-label={rank === undefined ? "Unranked" : `Rank ${rank}`}>
                        {rank === undefined ? "—" : rank}
                      </span>
                      <span className="manufacturer-tile__logo">
                        <ManufacturerLogo
                          manufacturer={manufacturer}
                          className="manufacturer-tile__logo-image"
                          fallbackClassName="manufacturer-tile__logo-missing"
                          fallbackLabel={verifiedLogo ? "LOGO UNAVAILABLE" : manufacturer.logo ? "LOGO NOT VERIFIED" : "LOGO UNAVAILABLE"}
                        />
                      </span>
                      {manufacturer.categories[0] && (
                        <span className="manufacturer-tile__category">{categoryLabels[manufacturer.categories[0]]}</span>
                      )}
                    </>
                  );
                })()}
                <span className="manufacturer-tile__meta">
                  <span>{manufacturer.name}</span>
                  {manufacturer.vehicleCount !== undefined && <span>{manufacturer.vehicleCount} models</span>}
                </span>
              </Link>
              {isVerifiedRanking(manufacturer) && (
                <details className="manufacturer-ranking-detail">
                  <summary>Ranking evidence · {manufacturer.rankingScore?.toFixed(1)} / 100</summary>
                  <p>{manufacturer.rankingExplanation}</p>
                  <dl>
                    {manufacturer.rankingCriteria && criteriaKeys.map((key) => (
                      <div key={key}>
                        <dt>{criteriaLabels[key]}</dt>
                        <dd>{manufacturer.rankingCriteria?.[key]} / 5</dd>
                      </div>
                    ))}
                  </dl>
                  <ul>
                    {manufacturer.rankingSources?.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.publisher}: {source.title}
                        </a>
                        {source.supports?.length ? ` — ${source.supports.map((key) => criteriaLabels[key]).join(", ")}` : ""}
                      </li>
                    ))}
                  </ul>
                  <time dateTime={manufacturer.lastRankedAt}>
                    Researched {manufacturer.lastRankedAt}
                  </time>
                </details>
              )}
            </article>
          ))}
          </div>
        </>
      ) : (
        <div className="catalog-empty">
          <h2>{manufacturers.length ? "No manufacturers match these filters." : "No manufacturer records are available yet."}</h2>
          <p>{manufacturers.length
            ? "Try another name, letter, or category."
            : "Manufacturer cards will appear when production records are added to the SHIFT catalogue."}</p>
        </div>
      )}

      {filtered.length > pageSize && (
        <div className="directory-pagination">
          <button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span>{page + 1} / {Math.ceil(filtered.length / pageSize)}</span>
          <button
            type="button"
            disabled={(page + 1) * pageSize >= filtered.length}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
