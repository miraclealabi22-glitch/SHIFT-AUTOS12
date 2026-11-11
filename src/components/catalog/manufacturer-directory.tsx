"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Manufacturer, ManufacturerCategory } from "@/lib/catalog/types";
import { manufacturersQuery, type ManufacturerPageVariables } from "@/lib/catalog/graphql-queries";
import type { ManufacturerDirectoryInput } from "@/lib/catalog/catalog";
import { normalizeManufacturer } from "@/lib/catalog/normalize";
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

type ManufacturerPage = {
  nodes: Manufacturer[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount: number;
};

async function fetchManufacturerPage(
  input: ManufacturerDirectoryInput,
  signal?: AbortSignal,
): Promise<ManufacturerPage> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: manufacturersQuery, variables: { input } satisfies ManufacturerPageVariables }),
    cache: "no-store",
    signal,
  });
  const result = await response.json() as {
    data?: { manufacturers?: ManufacturerPage };
    errors?: { message: string }[];
  };
  if (!response.ok || result.errors?.length || !result.data?.manufacturers) {
    throw new Error(result.errors?.map((error) => error.message).join("; ") || "Manufacturer records could not be loaded.");
  }
  return result.data.manufacturers;
}

function categoryEnum(category: ManufacturerCategory): string {
  return category.toUpperCase().replaceAll("-", "_");
}

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
  pageInfo: ManufacturerPage["pageInfo"];
  totalCount: number;
  initialCategory?: ManufacturerCategory;
};

export default function ManufacturerDirectory({
  manufacturers,
  available,
  pageInfo: initialPageInfo,
  totalCount: initialTotalCount,
  initialCategory,
}: ManufacturerDirectoryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ManufacturerCategory | "all">(initialCategory ?? "all");
  const [letter, setLetter] = useState<string | null>(null);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("overall");
  const [rankingCategory, setRankingCategory] = useState<ManufacturerCategory>("hypercar");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState<"all" | "ACTIVE" | "DISCONTINUED">("all");
  const [items, setItems] = useState(manufacturers);
  const [endCursor, setEndCursor] = useState(initialPageInfo.endCursor);
  const [hasNextPage, setHasNextPage] = useState(initialPageInfo.hasNextPage);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [catalogueAvailable, setCatalogueAvailable] = useState(available);
  const lastLoadedInput = useRef("");
  const loadMoreController = useRef<AbortController | null>(null);
  const categoryChoices = categories;
  const rankedCount = items.filter((manufacturer) => getRank(manufacturer, sortMode, rankingCategory) !== undefined).length;
  const hasActiveFilters = Boolean(
    query.trim()
    || category !== "all"
    || letter
    || country.trim()
    || status !== "all"
    || featuredOnly,
  );

  const pageInput = useMemo<ManufacturerDirectoryInput>(() => ({
    first: pageSize,
    sort: sortMode === "category"
      ? "CATEGORY_RANK"
      : sortMode === "alphabetical"
        ? "NAME_ASC"
        : "OVERALL_RANK",
    rankingCategory: categoryEnum(rankingCategory),
    filter: {
      ...(query.trim() ? { search: query.trim() } : {}),
      ...(category !== "all" ? { category: categoryEnum(category) } : {}),
      ...(letter ? { startsWith: letter } : {}),
      ...(country.trim() ? { countryOfOrigin: country.trim() } : {}),
      ...(status !== "all" ? { status } : {}),
      ...(featuredOnly ? { featured: true } : {}),
    },
  }), [sortMode, rankingCategory, query, category, letter, country, status, featuredOnly]);

  useEffect(() => {
    const requestKey = JSON.stringify(pageInput);
    if (!lastLoadedInput.current) {
      lastLoadedInput.current = requestKey;
      return;
    }
    if (lastLoadedInput.current === requestKey) return;
    lastLoadedInput.current = requestKey;
    loadMoreController.current?.abort();
    setLoadingMore(false);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setLoadError("");
      void fetchManufacturerPage(pageInput, controller.signal)
        .then((result) => {
          setItems(result.nodes.map(normalizeManufacturer));
          setEndCursor(result.pageInfo.endCursor);
          setHasNextPage(result.pageInfo.hasNextPage);
          setTotalCount(result.totalCount);
          setCatalogueAvailable(true);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setLoadError(error instanceof Error ? error.message : "Manufacturer records could not be loaded.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [pageInput]);

  async function loadMore() {
    if (!endCursor || loadingMore) return;
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setLoadError("");
    try {
      const result = await fetchManufacturerPage({ ...pageInput, after: endCursor }, controller.signal);
      if (controller.signal.aborted) return;
      setItems((current) => [...current, ...result.nodes.map(normalizeManufacturer)]);
      setEndCursor(result.pageInfo.endCursor);
      setHasNextPage(result.pageInfo.hasNextPage);
      setTotalCount(result.totalCount);
      setCatalogueAvailable(true);
    } catch (error) {
      if (!controller.signal.aborted) {
        setLoadError(error instanceof Error ? error.message : "More manufacturer records could not be loaded.");
      }
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  return (
    <>
      {!catalogueAvailable && (
        <div className="catalog-state" role="status">
          <p className="catalog-eyebrow">CATALOGUE UNAVAILABLE</p>
          <h2>Manufacturer records could not be loaded.</h2>
          <p>The manufacturer service is temporarily unavailable. Please try again later.</p>
        </div>
      )}
      {loadError && <p className="catalog-notice" role="alert">{loadError}</p>}

      <div className="directory-controls">
        <label className="directory-search">
          <span>Search manufacturers</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search by name"
          />
        </label>
        <div className="directory-selects">
          <label>
            <span>Sort directory</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.currentTarget.value as SortMode)}
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
                onChange={(event) => setRankingCategory(event.currentTarget.value as ManufacturerCategory)}
              >
                {categoryChoices.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
              </select>
            </label>
          )}
          <label>
            <span>Country</span>
            <input type="search" value={country} onChange={(event) => setCountry(event.currentTarget.value)} placeholder="Filter by country" />
          </label>
          <label>
            <span>Marque status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.currentTarget.value as typeof status)}
            >
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>
          </label>
        </div>
        <div className="directory-categories" aria-label="Filter by manufacturer category">
          <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>All</button>
          {categoryChoices.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {categoryLabels[item]}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={featuredOnly}
            onClick={() => setFeaturedOnly((current) => !current)}
          >
            Featured
          </button>
        </div>
      </div>

      <nav className="directory-alphabet" aria-label="Filter manufacturers alphabetically">
        <button type="button" aria-pressed={!letter} onClick={() => setLetter(null)}>All</button>
        {alphabet.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={letter === item}
            onClick={() => setLetter(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="directory-result-line" aria-live="polite">
        <span>{totalCount} {totalCount === 1 ? "manufacturer" : "manufacturers"}</span>
        <span>{rankedCount} verified {sortMode === "category" ? `${categoryLabels[rankingCategory]} ` : ""}SHIFT {rankedCount === 1 ? "rank" : "ranks"} loaded</span>
        {category !== "all" && <span>{categoryLabels[category]}</span>}
        {letter && <span>Starting with {letter}</span>}
      </div>

      {loading && items.length === 0 ? (
        <div className="catalog-state" role="status"><p className="catalog-eyebrow">LOADING DIRECTORY</p><h2>Loading manufacturer records…</h2></div>
      ) : items.length > 0 ? (
        <>
          <p className="ranking-methodology">
            SHIFT editorial ranking · prestige, performance, exclusivity, innovation, heritage, and industry influence are equally weighted. Each criterion is assessed from 0–5 using cited evidence; the mean is normalized to 100. Ranks are SHIFT editorial judgments, not official industry awards. Unresearched manufacturers remain unranked.
          </p>
          <div className="manufacturer-grid">
          {items.map((manufacturer) => (
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
          <h2>{hasActiveFilters ? "No manufacturers match these filters." : "No manufacturer records are available yet."}</h2>
          <p>{hasActiveFilters
            ? "Try another name, letter, or category."
            : "Manufacturer cards will appear when production records are added to the SHIFT catalogue."}</p>
        </div>
      )}

      {hasNextPage && (
        <div className="directory-pagination">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? "Loading…" : `Load more (${items.length} of ${totalCount})`}
          </button>
        </div>
      )}
    </>
  );
}
