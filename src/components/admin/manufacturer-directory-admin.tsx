"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

/* eslint-disable @next/next/no-img-element */

type AdminManufacturerRow = {
  id: string;
  name: string;
  slug: string;
  countryOfOrigin?: string;
  manufacturerType?: string;
  categories: string[];
  logo?: { url: string; alt: string };
  publicationStatus: string;
  vehicleCount: number;
};

const categories = [
  "hypercar", "supercar", "luxury", "sports", "electric", "mainstream",
  "performance-tuner", "coachbuilder", "historic-discontinued",
];

export function ManufacturerDirectoryAdmin() {
  const router = useRouter();
  const [records, setRecords] = useState<AdminManufacturerRow[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("name-asc");
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ sort });
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      const response = await fetch(`/api/admin/manufacturers?${params}`, { cache: "no-store" });
      const result = await response.json() as { manufacturers?: AdminManufacturerRow[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load manufacturer records.");
      setRecords(result.manufacturers ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load manufacturer records.");
    } finally {
      setBusy(false);
    }
  }, [category, search, sort]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ sort });
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    fetch(`/api/admin/manufacturers?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { manufacturers?: AdminManufacturerRow[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to load manufacturer records.");
        if (active) setRecords(result.manufacturers ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load manufacturer records.");
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [category, search, sort]);

  async function createManufacturer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/manufacturers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const result = await response.json() as { manufacturer?: { id: string }; error?: string };
      if (!response.ok || !result.manufacturer) throw new Error(result.error || "Unable to create draft.");
      router.push(`/admin/manufacturers/${result.manufacturer.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create draft.");
      setBusy(false);
    }
  }

  async function seedRegistry() {
    if (!window.confirm("Add the existing 289-name discovery registry as incomplete, unpublished drafts? Country, classification, source, and logo still require review.")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/manufacturers/seed", { method: "POST" });
      const result = await response.json() as { created?: number; candidates?: number; message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to seed draft candidates.");
      setNotice(`${result.created ?? 0} new drafts from ${result.candidates ?? 0} candidates. ${result.message ?? ""}`);
      await load();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Unable to seed draft candidates.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="min-h-screen bg-[#050505] px-5 pb-20 pt-10 text-white sm:px-8 lg:px-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6 border-b border-[#303030] pb-7">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[#858585]">SHIFT / Catalogue operations</p>
            <h1 className="font-[var(--font-display)] text-4xl uppercase tracking-wide sm:text-6xl">Manufacturer registry</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => void seedRegistry()} disabled={busy} className="min-h-11 border border-[#454545] px-4 text-[10px] uppercase tracking-[0.16em] text-[#d0d0d0] hover:border-white disabled:opacity-50">
              Seed draft registry
            </button>
            <button type="button" onClick={() => setShowNew((shown) => !shown)} className="min-h-11 bg-white px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-black hover:bg-[#d0d0d0]">
              Add manufacturer <span aria-hidden="true">＋</span>
            </button>
          </div>
        </div>

        {showNew && (
          <form onSubmit={createManufacturer} className="mb-8 flex flex-wrap items-end gap-3 border border-[#303030] bg-[#101010] p-5">
            <label className="min-w-60 flex-1 text-[10px] uppercase tracking-[0.15em] text-[#a3a3a3]">
              Official manufacturer name
              <input autoFocus value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={160} className="mt-2 block h-11 w-full border border-[#414141] bg-black px-3 text-sm text-white outline-none focus:border-white" />
            </label>
            <button disabled={busy} className="h-11 bg-white px-5 text-[10px] uppercase tracking-widest text-black disabled:opacity-50">Create incomplete draft</button>
          </form>
        )}

        {notice && <p role="status" className="mb-5 border border-[#546b57] bg-[#101610] p-4 text-sm text-[#d3e2d4]">{notice}</p>}
        {error && <p role="alert" className="mb-5 border border-[#744343] bg-[#190e0e] p-4 text-sm text-[#f0c4c4]">{error}</p>}

        <section aria-label="Manufacturer directory" className="border border-[#292929] bg-[#0b0b0b]">
          <div className="grid gap-3 border-b border-[#303030] p-4 md:grid-cols-[1fr_220px_180px]">
            <label className="text-[9px] uppercase tracking-[0.18em] text-[#858585]">
              Search marques
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, e.g. Koenigsegg" className="mt-2 block h-11 w-full border border-[#383838] bg-[#050505] px-3 text-sm normal-case tracking-normal text-white placeholder:text-[#686868] outline-none focus:border-[#c5c5c5]" />
            </label>
            <label className="text-[9px] uppercase tracking-[0.18em] text-[#858585]">
              Classification
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 block h-11 w-full border border-[#383838] bg-[#050505] px-3 text-xs uppercase text-white outline-none focus:border-[#c5c5c5]">
                <option value="">All classifications</option>
                {categories.map((item) => <option key={item} value={item}>{item.replaceAll("-", " ")}</option>)}
              </select>
            </label>
            <label className="text-[9px] uppercase tracking-[0.18em] text-[#858585]">
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="mt-2 block h-11 w-full border border-[#383838] bg-[#050505] px-3 text-xs uppercase text-white outline-none focus:border-[#c5c5c5]">
                <option value="name-asc">A — Z</option>
                <option value="name-desc">Z — A</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between border-b border-[#252525] px-5 py-3 text-[9px] uppercase tracking-[0.17em] text-[#777]">
            <span>{busy ? "Updating directory…" : `${records.length} manufacturers`}</span>
            <span>Only published records appear on Discover</span>
          </div>

          {records.length === 0 && !busy ? (
            <div className="px-6 py-20 text-center">
              <p className="font-[var(--font-display)] text-3xl uppercase text-[#c5c5c5]">No manufacturers found</p>
              <p className="mt-3 text-sm text-[#777]">Add a draft or seed the incomplete discovery registry to begin curation.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#242424]">
              {records.map((record) => (
                <Link key={record.id} href={`/admin/manufacturers/${record.id}`} className="grid min-h-20 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition hover:bg-[#121212] sm:grid-cols-[58px_minmax(0,1fr)_170px_130px_100px] sm:px-5">
                  <div className="grid h-11 w-11 place-items-center overflow-hidden border border-[#303030] bg-[#111]">
                    {record.logo?.url ? <img src={record.logo.url} alt="" className="max-h-full max-w-full object-contain p-1" /> : <span className="text-[8px] uppercase text-[#666]">No logo</span>}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-medium uppercase tracking-wide">{record.name}</h2>
                    <p className="mt-1 truncate text-[10px] text-[#777]">{record.countryOfOrigin || "Country unverified"}{record.manufacturerType ? ` · ${record.manufacturerType}` : ""}</p>
                  </div>
                  <span className="hidden text-[10px] uppercase tracking-wider text-[#999] sm:block">{record.categories?.join(", ") || "Unclassified"}</span>
                  <span className={`hidden w-fit border px-2 py-1 text-[9px] uppercase tracking-wider sm:block ${record.publicationStatus === "published" ? "border-[#526954] text-[#b8d2ba]" : "border-[#504632] text-[#d0be8a]"}`}>{record.publicationStatus || "incomplete"}</span>
                  <span className="justify-self-end text-[10px] text-[#888]">{record.vehicleCount} models <span className="ml-3 text-white">↗</span></span>
                </Link>
              ))}
            </div>
          )}
        </section>
        <footer className="mt-6 flex justify-between text-[9px] uppercase tracking-[0.14em] text-[#666]">
          <Link href="/discover/brands" className="hover:text-white">← Public Discover</Link>
          <span>Administrative changes are role-protected</span>
        </footer>
      </div>
    </main>
  );
}
