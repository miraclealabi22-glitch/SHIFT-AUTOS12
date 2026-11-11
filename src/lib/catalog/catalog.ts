import "server-only";

import { headers } from "next/headers";
import { connection } from "next/server";
import {
  manufacturerBySlugQuery,
  manufacturersQuery,
  vehicleBySlugQuery,
  vehiclesQuery,
} from "@/lib/catalog/graphql-queries";
import type {
  CatalogResult,
  Manufacturer,
  Vehicle,
} from "@/lib/catalog/types";
import { normalizeManufacturer, normalizeVehicle } from "@/lib/catalog/normalize";

type CatalogPageInput = {
  sort?: "NAME_ASC" | "OVERALL_RANK" | "CATEGORY_RANK";
  filter?: {
    manufacturerSlug?: string;
  };
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

type CatalogConnection<T> = {
  nodes: T[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  totalCount: number;
};

export type ManufacturerDirectoryPage = {
  items: Manufacturer[];
  pageInfo: CatalogConnection<Manufacturer>["pageInfo"];
  totalCount: number;
  available: boolean;
};

export type ManufacturerDirectoryInput = {
  first?: number;
  after?: string;
  sort?: "NAME_ASC" | "OVERALL_RANK" | "CATEGORY_RANK";
  rankingCategory?: string;
  filter?: {
    search?: string;
    category?: string;
    startsWith?: string;
    countryOfOrigin?: string;
    status?: "ACTIVE" | "DISCONTINUED";
    featured?: boolean;
  };
};

export type ManufacturerCategoryCounts = {
  counts: Partial<Record<Manufacturer["categories"][number], number>>;
  available: boolean;
};

async function getGraphQLEndpoint(): Promise<string> {
  await connection();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim()
    || requestHeaders.get("host");
  if (!host) {
    throw new Error("The catalog GraphQL endpoint cannot be determined for this request.");
  }

  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol === "https" || forwardedProtocol === "http"
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return new URL("/api/graphql", `${protocol}://${host}`).toString();
}

async function executeCatalogQuery<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Catalog GraphQL request failed with status ${response.status}.`);
  }

  const result = await response.json() as GraphQLResponse<T>;
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join("; "));
  }
  if (!result.data) {
    throw new Error("Catalog GraphQL returned no data.");
  }
  return result.data;
}

async function getAllPages<T>(
  endpoint: string,
  query: string,
  connectionName: "manufacturers" | "vehicles",
  input: CatalogPageInput,
): Promise<CatalogConnection<T>["nodes"]> {
  const nodes: T[] = [];
  const seenCursors = new Set<string>();
  let after: string | undefined;

  while (true) {
    const data = await executeCatalogQuery<Record<string, CatalogConnection<T>>>(
      endpoint,
      query,
      { input: { ...input, first: 50, ...(after ? { after } : {}) } },
    );
    const connection = data[connectionName];
    nodes.push(...connection.nodes);
    if (!connection.pageInfo.hasNextPage) {
      return nodes;
    }

    const nextCursor = connection.pageInfo.endCursor;
    if (!nextCursor || seenCursors.has(nextCursor)) {
      throw new Error(`Catalog GraphQL returned an invalid ${connectionName} pagination cursor.`);
    }
    seenCursors.add(nextCursor);
    after = nextCursor;
  }
}

function logCatalogFailure(resource: string, error: unknown): void {
  console.error(JSON.stringify({
    event: "catalog.fetch_failed",
    resource,
    errorName: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unexpected catalog error.",
  }));
}

export async function getManufacturerDirectoryPage(
  input: ManufacturerDirectoryInput,
): Promise<ManufacturerDirectoryPage> {
  const endpoint = await getGraphQLEndpoint();
  try {
    const data = await executeCatalogQuery<{ manufacturers: CatalogConnection<Manufacturer> }>(
      endpoint,
      manufacturersQuery,
      { input },
    );
    return {
      ...data.manufacturers,
      items: data.manufacturers.nodes.map(normalizeManufacturer),
      available: true,
    };
  } catch (error) {
    logCatalogFailure("manufacturers", error);
    return {
      items: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      totalCount: 0,
      available: false,
    };
  }
}

export async function getManufacturerCategoryCounts(): Promise<ManufacturerCategoryCounts> {
  const endpoint = await getGraphQLEndpoint();
  const categories: Manufacturer["categories"][number][] = [
    "hypercar",
    "supercar",
    "luxury",
    "sports",
    "electric",
    "mainstream",
    "performance-tuner",
    "coachbuilder",
    "historic-discontinued",
  ];

  try {
    const entries = await Promise.all(categories.map(async (category) => {
      const data = await executeCatalogQuery<{ manufacturers: CatalogConnection<Manufacturer> }>(
        endpoint,
        manufacturersQuery,
        {
          input: {
            first: 1,
            sort: "NAME_ASC",
            filter: { category: category.toUpperCase().replaceAll("-", "_") },
          },
        },
      );
      return [category, data.manufacturers.totalCount] as const;
    }));
    return { counts: Object.fromEntries(entries), available: true };
  } catch (error) {
    logCatalogFailure("manufacturer_category_counts", error);
    return { counts: {}, available: false };
  }
}

export async function getManufacturers(): Promise<CatalogResult<Manufacturer>> {
  const endpoint = await getGraphQLEndpoint();
  try {
    const items = await getAllPages<Manufacturer>(
      endpoint,
      manufacturersQuery,
      "manufacturers",
      { sort: "NAME_ASC" },
    );
    return { items: items.map(normalizeManufacturer), source: "backend", available: true };
  } catch (error) {
    logCatalogFailure("manufacturers", error);
    return { items: [], source: "backend", available: false };
  }
}

export async function getManufacturer(slug: string): Promise<Manufacturer | undefined> {
  const endpoint = await getGraphQLEndpoint();
  try {
    const data = await executeCatalogQuery<{ manufacturer: Manufacturer | null }>(
      endpoint,
      manufacturerBySlugQuery,
      { slug },
    );
    return data.manufacturer ? normalizeManufacturer(data.manufacturer) : undefined;
  } catch (error) {
    logCatalogFailure("manufacturer", error);
    return undefined;
  }
}

export async function getVehiclesForManufacturer(
  manufacturerSlug: string,
): Promise<CatalogResult<Vehicle>> {
  const endpoint = await getGraphQLEndpoint();
  try {
    const items = await getAllPages<Vehicle>(
      endpoint,
      vehiclesQuery,
      "vehicles",
      { filter: { manufacturerSlug } },
    );
    return { items: items.map(normalizeVehicle), source: "backend", available: true };
  } catch (error) {
    logCatalogFailure("manufacturer_vehicles", error);
    return { items: [], source: "backend", available: false };
  }
}

export async function getVehicles(): Promise<CatalogResult<Vehicle>> {
  const endpoint = await getGraphQLEndpoint();
  try {
    const items = await getAllPages<Vehicle>(endpoint, vehiclesQuery, "vehicles", {});
    return { items: items.map(normalizeVehicle), source: "backend", available: true };
  } catch (error) {
    logCatalogFailure("vehicles", error);
    return { items: [], source: "backend", available: false };
  }
}

export async function getVehicle(slug: string): Promise<Vehicle | undefined> {
  const endpoint = await getGraphQLEndpoint();
  try {
    const data = await executeCatalogQuery<{ vehicle: Vehicle | null }>(
      endpoint,
      vehicleBySlugQuery,
      { slug },
    );
    return data.vehicle ? normalizeVehicle(data.vehicle) : undefined;
  } catch (error) {
    logCatalogFailure("vehicle", error);
    return undefined;
  }
}
