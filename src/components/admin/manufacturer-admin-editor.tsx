"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";

/* eslint-disable @next/next/no-img-element */

type PublicationStatus = "draft" | "incomplete" | "ready-for-review" | "published" | "archived";
type CatalogImage = {
  mediaAssetId?: string;
  publicId?: string;
  url?: string;
  alt?: string;
  caption?: string;
  license?: string;
  usage?: string;
  isPrimary?: boolean;
  sortOrder?: number;
};
type Specification = { label: string; value: string; source: string };
type MediaAssetOption = { id: string; publicId: string; url: string; createdAt: string };
type Variant = { name: string; edition: string; specificationsText: string };
type Generation = {
  name: string;
  productionStartYear?: number;
  productionEndYear?: number;
  description: string;
  variants: Variant[];
};
type VehicleForm = {
  id?: string;
  modelName: string;
  slug: string;
  description: string;
  historicalBackground: string;
  designEngineering: string;
  category: string;
  productionStartYear?: number;
  productionEndYear?: number;
  status: string;
  publicationStatus: PublicationStatus;
  featured: boolean;
  images: CatalogImage[];
  specifications: Specification[];
  generations: Generation[];
  seoTitle: string;
  seoDescription: string;
};
type ManufacturerForm = {
  name: string;
  slug: string;
  countryOfOrigin: string;
  manufacturerType: string;
  officialWebsite: string;
  foundingYear?: number;
  description: string;
  about: string;
  history: string;
  categories: string[];
  featured: boolean;
  publicationStatus: PublicationStatus;
  logo?: CatalogImage;
  coverImage?: CatalogImage;
  seoTitle: string;
  seoDescription: string;
};

const categoryOptions = [
  "hypercar", "supercar", "luxury", "sports", "electric", "mainstream",
  "performance-tuner", "coachbuilder", "historic-discontinued",
];
const publicationOptions: PublicationStatus[] = ["incomplete", "draft", "ready-for-review", "published", "archived"];
const inputClass = "mt-2 block h-11 w-full border border-[#383838] bg-[#080808] px-3 text-sm text-white outline-none placeholder:text-[#666] focus:border-[#c5c5c5]";
const textAreaClass = "mt-2 block min-h-28 w-full resize-y border border-[#383838] bg-[#080808] px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-[#666] focus:border-[#c5c5c5]";
const labelClass = "block text-[9px] uppercase tracking-[0.17em] text-[#949494]";
const emptyVehicle = (): VehicleForm => ({
  modelName: "",
  slug: "",
  description: "",
  historicalBackground: "",
  designEngineering: "",
  category: "",
  status: "",
  publicationStatus: "incomplete",
  featured: false,
  images: [],
  specifications: [],
  generations: [],
  seoTitle: "",
  seoDescription: "",
});

function toYear(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function parseVariantSpecifications(text: string): Specification[] {
  if (!text.trim()) return [];
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Variant specifications must be a JSON array.");
  return parsed as Specification[];
}

async function uploadImage(file: File, category: "manufacturers" | "vehicles", license: string): Promise<CatalogImage> {
  const form = new FormData();
  form.set("file", file);
  form.set("category", category);
  form.set("resourceType", "image");
  const response = await fetch("/api/media", { method: "POST", body: form });
  const result = await response.json() as { asset?: { id: string; publicId: string; secureUrl: string }; error?: string };
  if (!response.ok || !result.asset) throw new Error(result.error || "Image upload failed.");
  return {
    mediaAssetId: result.asset.id,
    publicId: result.asset.publicId,
    url: result.asset.secureUrl,
    license,
    usage: "SHIFT catalogue display; rights declared by authorized administrator",
    isPrimary: false,
    sortOrder: 0,
  };
}

function ImageUploader({
  category,
  image,
  onChange,
  label,
}: {
  category: "manufacturers" | "vehicles";
  image?: CatalogImage;
  onChange: (image?: CatalogImage) => void;
  label: string;
}) {
  const [license, setLicense] = useState(image?.license ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<MediaAssetOption[]>([]);
  const [showAssets, setShowAssets] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setError("Choose a supported image no larger than 15 MB.");
      return;
    }
    if (!confirmed || !license.trim()) {
      setError("Confirm you have permission to use this image and enter its license or rights basis.");
      event.target.value = "";
      return;
    }
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadImage(file, category, license.trim());
      uploaded.alt = file.name.replace(/\.[^.]+$/, "");
      onChange(uploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function loadAssets() {
    setError("");
    try {
      const response = await fetch(`/api/admin/media?category=${category}`, { cache: "no-store" });
      const result = await response.json() as { assets?: MediaAssetOption[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load saved media.");
      setAssets(result.assets ?? []);
      setShowAssets(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load saved media.");
    }
  }

  return (
    <div className="border border-[#303030] bg-[#080808] p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className={labelClass}>{label}</p>
        {image?.url && <button type="button" onClick={() => onChange(undefined)} className="text-[9px] uppercase tracking-widest text-[#bd9696] hover:text-white">Remove</button>}
      </div>
      <div className="grid min-h-28 place-items-center border border-dashed border-[#3c3c3c] bg-[#0d0d0d] p-3">
        {image?.url ? <img src={image.url} alt={image.alt || label} className="max-h-40 max-w-full object-contain" /> : <span className="text-[9px] uppercase tracking-widest text-[#696969]">No image selected</span>}
      </div>
      <label className="mt-4 block text-[9px] uppercase tracking-widest text-[#888]">
        Rights / license
        <input value={license} onChange={(event) => setLicense(event.target.value)} placeholder="e.g. SHIFT-owned photo, CC BY 4.0" className={inputClass} />
      </label>
      <label className="mt-3 flex items-start gap-2 text-[10px] leading-5 text-[#aaa]">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-white" />
        I confirm SHIFT is authorized to use this image under the stated rights.
      </label>
      <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center border border-[#505050] px-3 text-[9px] uppercase tracking-widest hover:border-white">
        {busy ? "Uploading…" : "Upload image"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => void onFile(event)} disabled={busy} className="sr-only" />
      </label>
      <button type="button" onClick={() => void loadAssets()} className="ml-2 min-h-10 border border-[#383838] px-3 text-[9px] uppercase tracking-widest text-[#aaa] hover:border-white">Choose saved asset</button>
      {error && <p role="alert" className="mt-2 text-xs text-[#e2a8a8]">{error}</p>}
      {image?.mediaAssetId && <p className="mt-2 truncate text-[9px] text-[#686868]">Cloudinary asset · {image.publicId}</p>}
      {showAssets && (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto border border-[#333] p-2">
          <div className="flex items-center justify-between text-[8px] uppercase tracking-widest text-[#888]">
            <span>Last 100 saved uploads</span>
            <button type="button" onClick={() => setShowAssets(false)} className="text-white">Close</button>
          </div>
          {assets.map((asset) => (
            <button key={asset.id} type="button" onClick={() => {
              if (!confirmed || !license.trim()) {
                setError("Confirm rights and enter a license before using a saved image.");
                return;
              }
              onChange({
                mediaAssetId: asset.id,
                publicId: asset.publicId,
                url: asset.url,
                alt: label,
                license: license.trim(),
                usage: "SHIFT catalogue display; rights declared by authorized administrator",
              });
              setShowAssets(false);
            }} className="grid w-full grid-cols-[52px_1fr] items-center gap-3 border border-[#292929] p-2 text-left hover:border-[#999]">
              <img src={asset.url} alt="" className="h-10 w-12 object-contain" />
              <span className="truncate text-[9px] text-[#aaa]">{asset.publicId}</span>
            </button>
          ))}
          {assets.length === 0 && <p className="p-3 text-xs text-[#777]">No saved uploads in this folder yet.</p>}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className={labelClass}>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

function SpecificationEditor({
  values,
  onChange,
}: {
  values: Specification[];
  onChange: (values: Specification[]) => void;
}) {
  const commonLabels = ["Engine type", "Engine capacity", "Horsepower", "Torque", "Top speed", "Acceleration"];
  function addCommon(label: string) {
    if (values.some((item) => item.label.toLowerCase() === label.toLowerCase())) return;
    onChange([...values, { label, value: "", source: "" }]);
  }
  return (
    <div className="space-y-3">
      {values.map((spec, index) => (
        <div key={`${index}-${spec.label}`} className="grid gap-2 sm:grid-cols-[1fr_1.2fr_1.2fr_auto]">
          <input aria-label="Specification label" value={spec.label} onChange={(event) => onChange(values.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} placeholder="Engine type" className={`${inputClass} mt-0`} />
          <input aria-label="Specification value" value={spec.value} onChange={(event) => onChange(values.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} placeholder="Value provided by admin" className={`${inputClass} mt-0`} />
          <input aria-label="Specification source" value={spec.source} onChange={(event) => onChange(values.map((item, i) => i === index ? { ...item, source: event.target.value } : item))} placeholder="Source / admin confirmation" className={`${inputClass} mt-0`} />
          <button type="button" onClick={() => onChange(values.filter((_, i) => i !== index))} aria-label="Remove specification" className="h-11 border border-[#383838] px-3 text-[#b88f8f] hover:border-white">×</button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {commonLabels.map((label) => <button key={label} type="button" onClick={() => addCommon(label)} className="border border-[#383838] px-2 py-2 text-[8px] uppercase tracking-widest text-[#aaa] hover:border-white">{label}</button>)}
        <button type="button" onClick={() => onChange([...values, { label: "", value: "", source: "" }])} className="border border-[#454545] px-3 py-2 text-[9px] uppercase tracking-widest text-[#ccc] hover:border-white">＋ Custom specification</button>
      </div>
    </div>
  );
}

export function ManufacturerAdminEditor({ manufacturerId }: { manufacturerId: string }) {
  const [manufacturer, setManufacturer] = useState<ManufacturerForm>({
    name: "", slug: "", countryOfOrigin: "", manufacturerType: "", officialWebsite: "",
    description: "", about: "", history: "", categories: [], featured: false,
    publicationStatus: "incomplete", seoTitle: "", seoDescription: "",
  });
  const [vehicles, setVehicles] = useState<Array<{ id: string; modelName: string; slug: string; publicationStatus: string; images: CatalogImage[] }>>([]);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/manufacturers/${manufacturerId}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { manufacturer?: Record<string, unknown> & { vehicles?: Array<Record<string, unknown>> }; error?: string };
        if (!response.ok || !result.manufacturer) throw new Error(result.error || "Unable to load manufacturer.");
        if (!active) return;
        const record = result.manufacturer;
        const seo = record.seo as { title?: string; description?: string } | undefined;
        setManufacturer({
          name: String(record.name ?? ""),
          slug: String(record.slug ?? ""),
          countryOfOrigin: String(record.countryOfOrigin ?? ""),
          manufacturerType: String(record.manufacturerType ?? ""),
          officialWebsite: String(record.officialWebsite ?? ""),
          foundingYear: toYear(record.foundingYear),
          description: String(record.description ?? ""),
          about: String(record.about ?? ""),
          history: String(record.history ?? ""),
          categories: Array.isArray(record.categories) ? record.categories as string[] : [],
          featured: record.featured === true,
          publicationStatus: (record.publicationStatus as PublicationStatus) || "incomplete",
          logo: record.logo as CatalogImage | undefined,
          coverImage: record.coverImage as CatalogImage | undefined,
          seoTitle: seo?.title ?? "",
          seoDescription: seo?.description ?? "",
        });
        setVehicles((record.vehicles ?? []).map((vehicle) => ({
          id: String(vehicle._id ?? vehicle.id),
          modelName: String(vehicle.modelName ?? ""),
          slug: String(vehicle.slug ?? ""),
          publicationStatus: String(vehicle.publicationStatus ?? "incomplete"),
          images: Array.isArray(vehicle.images) ? vehicle.images as CatalogImage[] : [],
        })));
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load manufacturer."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [manufacturerId]);

  async function saveManufacturer(publicationStatus: PublicationStatus) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        name: manufacturer.name,
        slug: manufacturer.slug || undefined,
        countryOfOrigin: manufacturer.countryOfOrigin || undefined,
        manufacturerType: manufacturer.manufacturerType || undefined,
        officialWebsite: manufacturer.officialWebsite,
        foundingYear: manufacturer.foundingYear,
        description: manufacturer.description || undefined,
        about: manufacturer.about || undefined,
        history: manufacturer.history || undefined,
        categories: manufacturer.categories,
        featured: manufacturer.featured,
        logo: manufacturer.logo ?? null,
        coverImage: manufacturer.coverImage ?? null,
        seo: { title: manufacturer.seoTitle || undefined, description: manufacturer.seoDescription || undefined },
        publicationStatus,
      };
      const response = await fetch(`/api/admin/manufacturers/${manufacturerId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { manufacturer?: { slug?: string }; error?: string };
      if (!response.ok || !result.manufacturer) throw new Error(result.error || "Unable to save manufacturer.");
      setManufacturer((current) => ({ ...current, publicationStatus }));
      setNotice(`Manufacturer saved as ${publicationStatus.replaceAll("-", " ")}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save manufacturer.");
    } finally {
      setBusy(false);
    }
  }

  async function beginVehicleEdit(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, { cache: "no-store" });
      const result = await response.json() as { vehicle?: Record<string, unknown>; error?: string };
      if (!response.ok || !result.vehicle) throw new Error(result.error || "Unable to load vehicle.");
      const data = result.vehicle;
      const seo = data.seo as { title?: string; description?: string } | undefined;
      const generations = Array.isArray(data.generations) ? data.generations as Array<Record<string, unknown>> : [];
      setVehicleForm({
        ...emptyVehicle(),
        id,
        modelName: String(data.modelName ?? ""),
        slug: String(data.slug ?? ""),
        description: String(data.description ?? ""),
        historicalBackground: String(data.historicalBackground ?? ""),
        designEngineering: String(data.designEngineering ?? ""),
        category: String(data.category ?? ""),
        productionStartYear: toYear(data.productionStartYear),
        productionEndYear: toYear(data.productionEndYear),
        status: String(data.status ?? ""),
        publicationStatus: (data.publicationStatus as PublicationStatus) || "incomplete",
        featured: data.featured === true,
        images: Array.isArray(data.images) ? data.images as CatalogImage[] : [],
        specifications: Array.isArray(data.specifications) ? data.specifications as Specification[] : [],
        generations: generations.map((generation) => ({
          name: String(generation.name ?? ""),
          productionStartYear: toYear(generation.productionStartYear),
          productionEndYear: toYear(generation.productionEndYear),
          description: String(generation.description ?? ""),
          variants: (Array.isArray(generation.variants) ? generation.variants as Array<Record<string, unknown>> : []).map((variant) => ({
            name: String(variant.name ?? ""),
            edition: String(variant.edition ?? ""),
            specificationsText: JSON.stringify(variant.specifications ?? [], null, 2),
          })),
        })),
        seoTitle: seo?.title ?? "",
        seoDescription: seo?.description ?? "",
      });
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Unable to load vehicle.");
    } finally {
      setBusy(false);
    }
  }

  async function saveVehicle(publicationStatus: PublicationStatus) {
    if (!vehicleForm) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const generations = vehicleForm.generations.map((generation) => ({
        ...generation,
        variants: generation.variants.map((variant) => ({
          name: variant.name,
          edition: variant.edition || undefined,
          specifications: parseVariantSpecifications(variant.specificationsText),
        })),
      }));
      const payload = {
        modelName: vehicleForm.modelName,
        slug: vehicleForm.slug || undefined,
        description: vehicleForm.description || undefined,
        historicalBackground: vehicleForm.historicalBackground || undefined,
        designEngineering: vehicleForm.designEngineering || undefined,
        category: vehicleForm.category || undefined,
        productionStartYear: vehicleForm.productionStartYear,
        productionEndYear: vehicleForm.productionEndYear,
        status: vehicleForm.status || undefined,
        featured: vehicleForm.featured,
        publicationStatus,
        images: vehicleForm.images,
        specifications: vehicleForm.specifications.filter((item) => item.label && item.value && item.source),
        generations,
        seo: { title: vehicleForm.seoTitle || undefined, description: vehicleForm.seoDescription || undefined },
      };
      const response = await fetch(vehicleForm.id
        ? `/api/admin/vehicles/${vehicleForm.id}`
        : `/api/admin/manufacturers/${manufacturerId}/vehicles`, {
        method: vehicleForm.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { vehicle?: { id?: string }; error?: string };
      if (!response.ok || !result.vehicle) throw new Error(result.error || "Unable to save vehicle.");
      setNotice(`Vehicle saved as ${publicationStatus.replaceAll("-", " ")}.`);
      setVehicleForm(null);
      await reloadManufacturerVehicles();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save vehicle. Check variant specification JSON.");
    } finally {
      setBusy(false);
    }
  }

  async function reloadManufacturerVehicles() {
    const response = await fetch(`/api/admin/manufacturers/${manufacturerId}`, { cache: "no-store" });
    const result = await response.json() as { manufacturer?: { vehicles?: Array<Record<string, unknown>> } };
    if (!response.ok || !result.manufacturer) return;
    setVehicles((result.manufacturer.vehicles ?? []).map((vehicle) => ({
      id: String(vehicle._id ?? vehicle.id),
      modelName: String(vehicle.modelName ?? ""),
      slug: String(vehicle.slug ?? ""),
      publicationStatus: String(vehicle.publicationStatus ?? "incomplete"),
      images: Array.isArray(vehicle.images) ? vehicle.images as CatalogImage[] : [],
    })));
  }

  async function archiveVehicle(id: string) {
    if (!window.confirm("Archive this vehicle? It will no longer appear publicly.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/vehicles/${id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to archive vehicle.");
      setNotice("Vehicle archived.");
      await reloadManufacturerVehicles();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive vehicle.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#050505] p-10 text-sm text-[#888]">Loading manufacturer records…</main>;
  if (error && !manufacturer.name) return <main id="main-content" className="min-h-screen bg-[#050505] p-10 text-[#e2a8a8]">{error}</main>;

  return (
    <main id="main-content" className="min-h-screen bg-[#050505] px-5 pb-24 pt-8 text-white sm:px-8 lg:px-14">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 text-[9px] uppercase tracking-[0.2em] text-[#777]">
          <Link href="/admin/manufacturers" className="hover:text-white">Catalogue / Manufacturers</Link>
          <span className="mx-3">/</span><span className="text-[#ccc]">{manufacturer.name || "New manufacturer"}</span>
        </nav>
        <header className="mb-10 flex flex-wrap items-end justify-between gap-5 border-b border-[#303030] pb-7">
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[0.3em] text-[#858585]">SHIFT / Marque dossier</p>
            <h1 className="font-[var(--font-display)] text-4xl uppercase sm:text-6xl">{manufacturer.name || "Manufacturer editor"}</h1>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-[#777]">/{manufacturer.slug} · {manufacturer.publicationStatus.replaceAll("-", " ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void saveManufacturer("draft")} className="h-11 border border-[#4c4c4c] px-4 text-[9px] uppercase tracking-widest text-[#ccc] hover:border-white disabled:opacity-50">Save draft</button>
            <button type="button" disabled={busy} onClick={() => void saveManufacturer("ready-for-review")} className="h-11 border border-[#74704e] px-4 text-[9px] uppercase tracking-widest text-[#ded2a3] hover:border-white disabled:opacity-50">Ready for review</button>
            <button type="button" disabled={busy} onClick={() => void saveManufacturer(manufacturer.publicationStatus)} className="h-11 border border-[#4c4c4c] px-4 text-[9px] uppercase tracking-widest text-[#ccc] hover:border-white disabled:opacity-50">Save selected status</button>
            <button type="button" disabled={busy} onClick={() => void saveManufacturer("published")} className="h-11 bg-white px-5 text-[9px] font-semibold uppercase tracking-widest text-black hover:bg-[#d0d0d0] disabled:opacity-50">Publish</button>
          </div>
        </header>
        {notice && <p role="status" className="mb-5 border border-[#546b57] bg-[#101610] p-4 text-sm text-[#d3e2d4]">{notice}</p>}
        {error && <p role="alert" className="mb-5 border border-[#744343] bg-[#190e0e] p-4 text-sm text-[#f0c4c4]">{error}</p>}

        <section className="mb-10 grid gap-8 xl:grid-cols-[1fr_330px]">
          <div className="space-y-8">
            <section className="border border-[#303030] bg-[#0b0b0b] p-5 sm:p-7">
              <h2 className="mb-6 font-[var(--font-display)] text-2xl uppercase tracking-wide">Identity & classification</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Official manufacturer name" value={manufacturer.name} onChange={(value) => setManufacturer({ ...manufacturer, name: value })} />
                <Field label="Stable slug" value={manufacturer.slug} onChange={(value) => setManufacturer({ ...manufacturer, slug: value })} placeholder="generated from name if blank" />
                <Field label="Country of origin" value={manufacturer.countryOfOrigin} onChange={(value) => setManufacturer({ ...manufacturer, countryOfOrigin: value })} />
                <Field label="Classification / organization type" value={manufacturer.manufacturerType} onChange={(value) => setManufacturer({ ...manufacturer, manufacturerType: value })} placeholder="OEM, tuner, marque, coachbuilder…" />
                <Field label="Official website" value={manufacturer.officialWebsite} onChange={(value) => setManufacturer({ ...manufacturer, officialWebsite: value })} placeholder="https://" />
                <Field label="Founding year" type="number" value={manufacturer.foundingYear ?? ""} onChange={(value) => setManufacturer({ ...manufacturer, foundingYear: value ? Number(value) : undefined })} />
              </div>
              <fieldset className="mt-7">
                <legend className={labelClass}>Directory categories</legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categoryOptions.map((category) => (
                    <label key={category} className="flex min-h-10 items-center gap-2 border border-[#292929] bg-[#080808] px-3 text-[9px] uppercase tracking-wide text-[#bbb]">
                      <input type="checkbox" checked={manufacturer.categories.includes(category)} onChange={(event) => setManufacturer({
                        ...manufacturer,
                        categories: event.target.checked
                          ? [...manufacturer.categories, category]
                          : manufacturer.categories.filter((item) => item !== category),
                      })} className="accent-white" />
                      {category.replaceAll("-", " ")}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#c5c5c5]">
                <input type="checkbox" checked={manufacturer.featured} onChange={(event) => setManufacturer({ ...manufacturer, featured: event.target.checked })} className="accent-white" />
                Feature this manufacturer
              </label>
            </section>

            <section className="border border-[#303030] bg-[#0b0b0b] p-5 sm:p-7">
              <h2 className="mb-6 font-[var(--font-display)] text-2xl uppercase tracking-wide">Editorial profile</h2>
              <label className={labelClass}>Short description<textarea value={manufacturer.description} onChange={(event) => setManufacturer({ ...manufacturer, description: event.target.value })} maxLength={3000} className={textAreaClass} /></label>
              <label className={`${labelClass} mt-5`}>About<textarea value={manufacturer.about} onChange={(event) => setManufacturer({ ...manufacturer, about: event.target.value })} maxLength={10000} className={textAreaClass} /></label>
              <label className={`${labelClass} mt-5`}>Manufacturer history<textarea value={manufacturer.history} onChange={(event) => setManufacturer({ ...manufacturer, history: event.target.value })} maxLength={10000} className={textAreaClass} /></label>
            </section>

            <section className="border border-[#303030] bg-[#0b0b0b] p-5 sm:p-7">
              <h2 className="mb-6 font-[var(--font-display)] text-2xl uppercase tracking-wide">Search metadata</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="SEO title" value={manufacturer.seoTitle} onChange={(value) => setManufacturer({ ...manufacturer, seoTitle: value })} />
                <Field label="SEO description" value={manufacturer.seoDescription} onChange={(value) => setManufacturer({ ...manufacturer, seoDescription: value })} />
              </div>
              <label className={`${labelClass} mt-5`}>Publication status
                <select value={manufacturer.publicationStatus} onChange={(event) => setManufacturer({ ...manufacturer, publicationStatus: event.target.value as PublicationStatus })} className={inputClass}>
                  {publicationOptions.map((status) => <option key={status} value={status}>{status.replaceAll("-", " ")}</option>)}
                </select>
              </label>
            </section>
          </div>
          <aside className="space-y-5">
            <ImageUploader category="manufacturers" label="Official logo" image={manufacturer.logo} onChange={(logo) => setManufacturer({ ...manufacturer, logo })} />
            <ImageUploader category="manufacturers" label="Cover image" image={manufacturer.coverImage} onChange={(coverImage) => setManufacturer({ ...manufacturer, coverImage })} />
            <div className="border border-[#343434] bg-[#0b0b0b] p-4 text-xs leading-6 text-[#888]">
              <p className="mb-2 text-[9px] uppercase tracking-[0.18em] text-[#bbb]">Publication checks</p>
              <p>Manufacturer requires a name, country, at least one classification, and a logo before publishing.</p>
              <p className="mt-2">Uploaded assets are retained in the SHIFT Cloudinary folders. Rights and license must be declared by the administrator.</p>
            </div>
          </aside>
        </section>

        <section className="border border-[#303030] bg-[#0b0b0b]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#303030] p-5 sm:p-7">
            <div>
              <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[#777]">Model range</p>
              <h2 className="font-[var(--font-display)] text-3xl uppercase">Vehicle models <span className="text-[#858585]">({vehicles.length})</span></h2>
            </div>
            <button type="button" onClick={() => setVehicleForm(emptyVehicle())} className="h-11 bg-white px-5 text-[9px] font-semibold uppercase tracking-widest text-black hover:bg-[#d0d0d0]">Add vehicle model ＋</button>
          </div>
          <div className="divide-y divide-[#242424]">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 p-4 sm:grid-cols-[64px_minmax(0,1fr)_auto_auto] sm:px-6">
                <div className="grid h-12 w-14 place-items-center overflow-hidden border border-[#303030] bg-[#070707]">
                  {vehicle.images.find((image) => image.isPrimary)?.url ? <img src={vehicle.images.find((image) => image.isPrimary)?.url} alt="" className="h-full w-full object-cover" /> : <span className="text-[7px] uppercase text-[#666]">No image</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm uppercase tracking-wide">{vehicle.modelName}</p>
                  <p className="mt-1 truncate text-[9px] text-[#777]">/{vehicle.slug}</p>
                </div>
                <span className="hidden border border-[#393939] px-2 py-1 text-[8px] uppercase tracking-widest text-[#aaa] sm:inline">{vehicle.publicationStatus}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void beginVehicleEdit(vehicle.id)} className="h-9 border border-[#454545] px-3 text-[8px] uppercase tracking-widest hover:border-white disabled:opacity-40">Edit</button>
                  <button type="button" disabled={busy || vehicle.publicationStatus === "archived"} onClick={() => void archiveVehicle(vehicle.id)} className="h-9 border border-[#493333] px-3 text-[8px] uppercase tracking-widest text-[#c99] hover:border-white disabled:opacity-40">Archive</button>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && <p className="px-6 py-10 text-sm text-[#777]">No vehicle models have been added to this manufacturer.</p>}
          </div>
        </section>

        {vehicleForm && (
          <div className="fixed inset-0 z-30 overflow-y-auto bg-black/90 p-3 sm:p-8">
            <section className="mx-auto my-6 max-w-6xl border border-[#424242] bg-[#0b0b0b] shadow-2xl">
              <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#303030] bg-[#0b0b0b] px-5 py-4 sm:px-8">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#777]">{vehicleForm.id ? "Edit model" : "New model"}</p>
                  <h2 className="mt-1 font-[var(--font-display)] text-2xl uppercase">{vehicleForm.modelName || "Vehicle editor"}</h2>
                </div>
                <button type="button" onClick={() => setVehicleForm(null)} aria-label="Close vehicle editor" className="h-10 w-10 border border-[#444] text-xl text-[#bbb] hover:text-white">×</button>
              </header>
              <div className="grid gap-7 p-5 sm:p-8 xl:grid-cols-[1fr_330px]">
                <div className="space-y-7">
                  <section>
                    <h3 className="mb-4 text-[10px] uppercase tracking-[0.19em] text-[#bbb]">Model identity</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Model name" value={vehicleForm.modelName} onChange={(value) => setVehicleForm({ ...vehicleForm, modelName: value })} />
                      <Field label="Stable slug" value={vehicleForm.slug} onChange={(value) => setVehicleForm({ ...vehicleForm, slug: value })} placeholder="generated if blank" />
                      <Field label="Vehicle category" value={vehicleForm.category} onChange={(value) => setVehicleForm({ ...vehicleForm, category: value })} placeholder="hypercar, coupe…" />
                      <label className={labelClass}>Vehicle status
                        <select value={vehicleForm.status} onChange={(event) => setVehicleForm({ ...vehicleForm, status: event.target.value })} className={inputClass}>
                          <option value="">Not specified</option>
                          {["current", "discontinued", "limited-production"].map((status) => <option key={status} value={status}>{status.replaceAll("-", " ")}</option>)}
                        </select>
                      </label>
                      <Field label="Production start year" type="number" value={vehicleForm.productionStartYear ?? ""} onChange={(value) => setVehicleForm({ ...vehicleForm, productionStartYear: value ? Number(value) : undefined })} />
                      <Field label="Production end year" type="number" value={vehicleForm.productionEndYear ?? ""} onChange={(value) => setVehicleForm({ ...vehicleForm, productionEndYear: value ? Number(value) : undefined })} />
                    </div>
                    <label className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-[#c5c5c5]"><input type="checkbox" checked={vehicleForm.featured} onChange={(event) => setVehicleForm({ ...vehicleForm, featured: event.target.checked })} className="accent-white" />Feature this vehicle</label>
                  </section>
                  <section>
                    <h3 className="mb-4 text-[10px] uppercase tracking-[0.19em] text-[#bbb]">Editorial & engineering</h3>
                    <label className={labelClass}>Description<textarea value={vehicleForm.description} onChange={(event) => setVehicleForm({ ...vehicleForm, description: event.target.value })} className={textAreaClass} /></label>
                    <label className={`${labelClass} mt-4`}>Historical background<textarea value={vehicleForm.historicalBackground} onChange={(event) => setVehicleForm({ ...vehicleForm, historicalBackground: event.target.value })} className={textAreaClass} /></label>
                    <label className={`${labelClass} mt-4`}>Design & engineering<textarea value={vehicleForm.designEngineering} onChange={(event) => setVehicleForm({ ...vehicleForm, designEngineering: event.target.value })} className={textAreaClass} /></label>
                  </section>
                  <section>
                    <h3 className="mb-2 text-[10px] uppercase tracking-[0.19em] text-[#bbb]">Specifications</h3>
                    <p className="mb-4 text-[10px] leading-5 text-[#777]">Add only values supplied or verified by the administrator, and record their source.</p>
                    <SpecificationEditor values={vehicleForm.specifications} onChange={(specifications) => setVehicleForm({ ...vehicleForm, specifications })} />
                  </section>
                  <section>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h3 className="text-[10px] uppercase tracking-[0.19em] text-[#bbb]">Generations & variants</h3>
                      <button type="button" onClick={() => setVehicleForm({ ...vehicleForm, generations: [...vehicleForm.generations, { name: "", description: "", variants: [] }] })} className="border border-[#454545] px-3 py-2 text-[8px] uppercase tracking-widest hover:border-white">＋ Generation</button>
                    </div>
                    <div className="space-y-4">
                      {vehicleForm.generations.map((generation, index) => (
                        <div key={index} className="border border-[#343434] bg-[#080808] p-4">
                          <div className="flex items-start gap-3">
                            <div className="grid flex-1 gap-3 sm:grid-cols-3">
                              <Field label="Generation name" value={generation.name} onChange={(value) => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, name: value } : item) })} />
                              <Field label="Start year" type="number" value={generation.productionStartYear ?? ""} onChange={(value) => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, productionStartYear: value ? Number(value) : undefined } : item) })} />
                              <Field label="End year" type="number" value={generation.productionEndYear ?? ""} onChange={(value) => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, productionEndYear: value ? Number(value) : undefined } : item) })} />
                            </div>
                            <button type="button" onClick={() => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.filter((_, i) => i !== index) })} className="mt-5 text-xl text-[#bd9696]" aria-label="Remove generation">×</button>
                          </div>
                          <div className="mt-4 space-y-3 border-l border-[#454545] pl-4">
                            {generation.variants.map((variant, variantIndex) => (
                              <div key={variantIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                                <input aria-label="Variant name" value={variant.name} onChange={(event) => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, variants: item.variants.map((entry, j) => j === variantIndex ? { ...entry, name: event.target.value } : entry) } : item) })} placeholder="Variant name" className={`${inputClass} mt-0`} />
                                <input aria-label="Edition" value={variant.edition} onChange={(event) => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, variants: item.variants.map((entry, j) => j === variantIndex ? { ...entry, edition: event.target.value } : entry) } : item) })} placeholder="Edition / trim" className={`${inputClass} mt-0`} />
                                <button type="button" onClick={() => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, variants: item.variants.filter((_, j) => j !== variantIndex) } : item) })} className="h-11 border border-[#383838] px-3 text-[#b88f8f]">×</button>
                                <textarea aria-label="Variant specifications JSON" value={variant.specificationsText} onChange={(event) => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, variants: item.variants.map((entry, j) => j === variantIndex ? { ...entry, specificationsText: event.target.value } : entry) } : item) })} placeholder={'Variant specifications JSON: [{"label":"Power","value":"...","source":"..."}]'} className="min-h-20 border border-[#383838] bg-[#080808] p-3 text-xs text-white outline-none focus:border-[#c5c5c5] sm:col-span-3" />
                              </div>
                            ))}
                            <button type="button" onClick={() => setVehicleForm({ ...vehicleForm, generations: vehicleForm.generations.map((item, i) => i === index ? { ...item, variants: [...item.variants, { name: "", edition: "", specificationsText: "[]" }] } : item) })} className="text-[8px] uppercase tracking-widest text-[#bbb] hover:text-white">＋ Add variant</button>
                          </div>
                        </div>
                      ))}
                      {vehicleForm.generations.length === 0 && <p className="text-xs text-[#777]">No generations added.</p>}
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-4 text-[10px] uppercase tracking-[0.19em] text-[#bbb]">SEO</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="SEO title" value={vehicleForm.seoTitle} onChange={(value) => setVehicleForm({ ...vehicleForm, seoTitle: value })} />
                      <Field label="SEO description" value={vehicleForm.seoDescription} onChange={(value) => setVehicleForm({ ...vehicleForm, seoDescription: value })} />
                    </div>
                  </section>
                </div>
                <aside>
                  <h3 className="mb-4 text-[10px] uppercase tracking-[0.19em] text-[#bbb]">Vehicle gallery</h3>
                  <label className="mb-3 block text-[9px] leading-5 text-[#888]">Upload multiple photos one at a time; set one primary. Existing files are retained unless removed.</label>
                  <VehicleGallery images={vehicleForm.images} onChange={(images) => setVehicleForm({ ...vehicleForm, images })} />
                </aside>
              </div>
              <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#303030] bg-[#0b0b0b] px-5 py-4 sm:px-8">
                <label className={`${labelClass} w-52`}>Status
                  <select value={vehicleForm.publicationStatus} onChange={(event) => setVehicleForm({ ...vehicleForm, publicationStatus: event.target.value as PublicationStatus })} className={`${inputClass} mt-1`}>
                    {publicationOptions.map((status) => <option key={status} value={status}>{status.replaceAll("-", " ")}</option>)}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void saveVehicle("draft")} className="h-10 border border-[#4c4c4c] px-4 text-[8px] uppercase tracking-widest text-[#ccc]">Save draft</button>
                  <button type="button" disabled={busy} onClick={() => void saveVehicle("ready-for-review")} className="h-10 border border-[#74704e] px-4 text-[8px] uppercase tracking-widest text-[#ded2a3]">Ready for review</button>
                  <button type="button" disabled={busy} onClick={() => void saveVehicle(vehicleForm.publicationStatus)} className="h-10 border border-[#4c4c4c] px-4 text-[8px] uppercase tracking-widest text-[#ccc]">Save selected status</button>
                  <button type="button" disabled={busy} onClick={() => void saveVehicle("published")} className="h-10 bg-white px-5 text-[8px] font-semibold uppercase tracking-widest text-black">Publish vehicle</button>
                </div>
              </footer>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function VehicleGallery({ images, onChange }: { images: CatalogImage[]; onChange: (images: CatalogImage[]) => void }) {
  const [license, setLicense] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [assets, setAssets] = useState<MediaAssetOption[]>([]);
  const [showAssets, setShowAssets] = useState(false);

  async function loadAssets() {
    setError("");
    try {
      const response = await fetch("/api/admin/media?category=vehicles", { cache: "no-store" });
      const result = await response.json() as { assets?: MediaAssetOption[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load saved media.");
      setAssets(result.assets ?? []);
      setShowAssets(true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load saved media.");
    }
  }

  async function addFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!confirmed || !license.trim()) {
      setError("Confirm image rights and enter a license before uploading.");
      event.target.value = "";
      return;
    }
    setBusy(true);
    setError("");
    try {
      const image = await uploadImage(file, "vehicles", license.trim());
      image.alt = file.name.replace(/\.[^.]+$/, "");
      image.caption = image.alt;
      image.sortOrder = images.length;
      image.isPrimary = images.length === 0;
      onChange([...images, image]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((image, sortOrder) => ({ ...image, sortOrder })));
  }

  return (
    <div className="space-y-3">
      {images.map((image, index) => (
        <div key={`${image.mediaAssetId ?? image.url}-${index}`} className={`border p-3 ${image.isPrimary ? "border-[#9b9b9b] bg-[#111]" : "border-[#303030] bg-[#080808]"}`}>
          <div className="grid h-36 place-items-center overflow-hidden bg-black">
            {image.url && <img src={image.url} alt={image.alt || ""} className="h-full w-full object-contain" />}
          </div>
          <input value={image.caption ?? ""} onChange={(event) => onChange(images.map((item, i) => i === index ? { ...item, caption: event.target.value, alt: event.target.value || item.alt } : item))} placeholder="Caption" aria-label="Image caption" className={`${inputClass} mt-3`} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => onChange(images.map((item, i) => ({ ...item, isPrimary: i === index })))} className={`text-[8px] uppercase tracking-widest ${image.isPrimary ? "text-white" : "text-[#888] hover:text-white"}`}>{image.isPrimary ? "Primary image" : "Set primary"}</button>
            <div className="flex gap-1">
              <button type="button" onClick={() => move(index, -1)} aria-label="Move image up" className="h-7 w-7 border border-[#383838] text-xs">↑</button>
              <button type="button" onClick={() => move(index, 1)} aria-label="Move image down" className="h-7 w-7 border border-[#383838] text-xs">↓</button>
              <button type="button" onClick={() => {
                const removedPrimary = images[index].isPrimary === true;
                onChange(images.filter((_, i) => i !== index).map((item, sortOrder) => ({
                  ...item,
                  sortOrder,
                  isPrimary: removedPrimary ? sortOrder === 0 : item.isPrimary,
                })));
              }} aria-label="Remove image" className="h-7 w-7 border border-[#493333] text-xs text-[#c99]">×</button>
            </div>
          </div>
        </div>
      ))}
      <label className="block text-[9px] uppercase tracking-widest text-[#888]">
        Rights / license
        <input value={license} onChange={(event) => setLicense(event.target.value)} placeholder="e.g. SHIFT-owned, CC BY 4.0" className={inputClass} />
      </label>
      <label className="flex items-start gap-2 text-[10px] leading-5 text-[#aaa]">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-white" />
        I confirm SHIFT is authorized to use these images.
      </label>
      <label className="grid min-h-11 cursor-pointer place-items-center border border-dashed border-[#505050] text-[9px] uppercase tracking-widest text-[#ccc] hover:border-white">{busy ? "Uploading…" : "＋ Upload gallery photo"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => void addFile(event)} className="sr-only" />
      </label>
      <button type="button" onClick={() => void loadAssets()} className="min-h-10 w-full border border-[#383838] text-[9px] uppercase tracking-widest text-[#aaa] hover:border-white">Choose existing Cloudinary asset</button>
      {showAssets && (
        <div className="max-h-56 space-y-2 overflow-y-auto border border-[#333] p-2">
          <div className="flex items-center justify-between text-[8px] uppercase tracking-widest text-[#888]"><span>Saved uploads</span><button type="button" onClick={() => setShowAssets(false)} className="text-white">Close</button></div>
          {assets.map((asset) => (
            <button key={asset.id} type="button" onClick={() => {
              if (!confirmed || !license.trim()) {
                setError("Confirm rights and enter a license before using a saved image.");
                return;
              }
              onChange([...images, {
                mediaAssetId: asset.id,
                publicId: asset.publicId,
                url: asset.url,
                alt: asset.publicId,
                caption: "",
                license: license.trim(),
                usage: "SHIFT catalogue display; rights declared by authorized administrator",
                isPrimary: images.length === 0,
                sortOrder: images.length,
              }]);
              setShowAssets(false);
            }} className="grid w-full grid-cols-[52px_1fr] items-center gap-3 border border-[#292929] p-2 text-left hover:border-[#999]">
              <img src={asset.url} alt="" className="h-10 w-12 object-contain" />
              <span className="truncate text-[9px] text-[#aaa]">{asset.publicId}</span>
            </button>
          ))}
          {assets.length === 0 && <p className="p-3 text-xs text-[#777]">No saved uploads in this folder yet.</p>}
        </div>
      )}
      {error && <p role="alert" className="text-xs text-[#e2a8a8]">{error}</p>}
    </div>
  );
}
