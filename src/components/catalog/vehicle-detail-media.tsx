"use client";

import Link from "next/link";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import type { MediaReference, Vehicle } from "@/lib/catalog/types";

/* eslint-disable @next/next/no-img-element */

type GallerySection = "exterior" | "interior" | "details";

function deliveryUrl(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "res.cloudinary.com" || !/\/image\/upload\//.test(parsed.pathname)) {
      return url;
    }
    parsed.pathname = parsed.pathname.replace(
      "/image/upload/",
      `/image/upload/f_auto,q_auto,w_${width},c_limit/`,
    );
    return parsed.toString();
  } catch {
    return url;
  }
}

function uniqueImages(images: readonly MediaReference[]): MediaReference[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    const identity = image.mediaAssetId ?? image.publicId ?? image.url;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function viewLabel(image: MediaReference): string | undefined {
  return image.imageView?.replaceAll("-", " ");
}

function VehicleHero({ vehicle, period, designation }: {
  vehicle: Vehicle;
  period?: string;
  designation?: string;
}) {
  const copyRef = useRef<HTMLDivElement>(null);
  const heroImage = vehicle.images.find((image) => (
    image.verificationStatus === "verified"
    && image.mediaCategory === "exterior"
    && image.isPrimary === true
  )) ?? vehicle.images.find((image) => (
    image.verificationStatus === "verified" && image.mediaCategory === "exterior"
  ));

  useEffect(() => {
    if (!copyRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(copyRef.current, { autoAlpha: 0, y: 20 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
      });
    }, copyRef);
    return () => context.revert();
  }, []);

  return (
    <section className="vehicle-film" aria-labelledby="vehicle-title">
      {heroImage ? (
        <img
          className="vehicle-film__image"
          src={deliveryUrl(heroImage.url, 2200)}
          alt=""
          fetchPriority="high"
        />
      ) : (
        <div className="vehicle-film__image-empty" aria-hidden="true" />
      )}
      <div className="vehicle-film__shade" />
      <div className="vehicle-film__topline">
        <Link href="/discover/vehicles">MODEL ARCHIVE</Link>
        <span>SHIFT / {vehicle.manufacturerName.toUpperCase()}</span>
      </div>
      <div className="vehicle-film__copy" ref={copyRef}>
        <p className="catalog-eyebrow">
          <Link href={`/discover/brands/${vehicle.manufacturerSlug}`}>{vehicle.manufacturerName}</Link>
          {vehicle.category && <span> · {vehicle.category.replaceAll("-", " ")}</span>}
        </p>
        <h1 id="vehicle-title">{vehicle.modelName}</h1>
        {designation && <p className="vehicle-film__designation">{designation}</p>}
        {period && <p className="vehicle-film__period">{period}</p>}
        <a href="#overview" className="vehicle-film__scroll" aria-label="Scroll to vehicle overview">Discover the model <span aria-hidden="true">↓</span></a>
      </div>
      {!heroImage && <p className="vehicle-film__image-note">Exterior photography is not yet available.</p>}
    </section>
  );
}

function GalleryImage({ image, index, onSelect }: {
  image: MediaReference;
  index: number;
  onSelect: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  function markFailed(event: SyntheticEvent<HTMLImageElement>) {
    setFailed(true);
    event.currentTarget.removeAttribute("src");
  }

  return (
    <button
      type="button"
      className={`vehicle-gallery__item vehicle-gallery__item--${index % 3}`}
      onClick={onSelect}
      aria-label={`View ${image.alt}${viewLabel(image) ? `, ${viewLabel(image)}` : ""} full screen`}
    >
      <span className="vehicle-gallery__image-wrap">
        {!loaded && !failed && <span className="vehicle-gallery__image-status" role="status">Loading image</span>}
        {failed && <span className="vehicle-gallery__image-status">Image unavailable</span>}
        {!failed && (
          <img
            src={deliveryUrl(image.url, 1400)}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={markFailed}
          />
        )}
      </span>
      <span className="vehicle-gallery__caption">
        <span>{image.caption || image.alt}</span>
        {viewLabel(image) && <span>{viewLabel(image)}</span>}
        {(image.generationName || image.variantName) && (
          <span>{[image.generationName, image.variantName].filter(Boolean).join(" · ")}</span>
        )}
      </span>
    </button>
  );
}

function ImageViewer({ image, index, total, onClose, onNavigate }: {
  image: MediaReference;
  index: number;
  total: number;
  onClose: () => void;
  onNavigate: (offset: -1 | 1) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="vehicle-viewer"
      aria-label="Vehicle image viewer"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") onNavigate(-1);
        if (event.key === "ArrowRight") onNavigate(1);
      }}
    >
      <div className="vehicle-viewer__bar">
        <p>{image.caption || image.alt}</p>
        <span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close image viewer">Close <span aria-hidden="true">×</span></button>
      </div>
      <div className="vehicle-viewer__stage">
        {total > 1 && <button type="button" onClick={() => onNavigate(-1)} aria-label="Previous image">←</button>}
        <img src={deliveryUrl(image.url, 2200)} alt={image.alt} />
        {total > 1 && <button type="button" onClick={() => onNavigate(1)} aria-label="Next image">→</button>}
      </div>
      {viewLabel(image) && <p className="vehicle-viewer__caption">{viewLabel(image)}</p>}
    </dialog>
  );
}

export default function VehicleDetailMedia({
  vehicle,
  period,
  designation,
}: {
  vehicle: Vehicle;
  period?: string;
  designation?: string;
}) {
  const [section, setSection] = useState<GallerySection>("exterior");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const verifiedImages = uniqueImages(vehicle.images.filter((image) => image.verificationStatus === "verified"));
  const galleries = useMemo(() => ({
    exterior: verifiedImages.filter((image) => image.mediaCategory === "exterior"),
    interior: verifiedImages.filter((image) => image.mediaCategory === "interior"),
    details: verifiedImages.filter((image) => image.mediaCategory === "technical" || image.mediaCategory === "other"),
  }), [verifiedImages]);
  const gallery = galleries[section];
  const primaryInteriorIndex = gallery.findIndex((image) => image.isPrimaryInterior);
  const sortedGallery = section === "interior" && primaryInteriorIndex > 0
    ? [gallery[primaryInteriorIndex], ...gallery.filter((_, index) => index !== primaryInteriorIndex)]
    : gallery;
  const viewerImage = viewerIndex === null ? null : sortedGallery[viewerIndex];

  function navigateViewer(offset: -1 | 1) {
    if (viewerIndex === null || sortedGallery.length < 2) return;
    setViewerIndex((viewerIndex + offset + sortedGallery.length) % sortedGallery.length);
  }

  return (
    <>
      <VehicleHero vehicle={vehicle} period={period} designation={designation} />
      <section className="vehicle-gallery" id="gallery" aria-labelledby="gallery-title">
        <header className="vehicle-gallery__heading">
          <div>
            <p className="catalog-eyebrow">THE ARCHIVE / IN DETAIL</p>
            <h2 id="gallery-title">Seen from every angle.</h2>
          </div>
          <span>{vehicle.images.length} {vehicle.images.length === 1 ? "IMAGE" : "IMAGES"}</span>
        </header>
        <nav className="vehicle-gallery__tabs" aria-label="Vehicle image categories">
          {([
            ["exterior", "Exterior"],
            ["interior", "Interior"],
            ["details", "Details"],
          ] as const).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={section === key}
              onClick={() => {
                setSection(key);
                setViewerIndex(null);
              }}
            >
              {label}
              <span>{String(galleries[key].length).padStart(2, "0")}</span>
            </button>
          ))}
        </nav>
        {sortedGallery.length ? (
          <div className="vehicle-gallery__grid" key={section}>
            {sortedGallery.map((image, index) => (
              <GalleryImage
                key={image.mediaAssetId ?? image.publicId ?? image.url}
                image={image}
                index={index}
                onSelect={() => setViewerIndex(index)}
              />
            ))}
          </div>
        ) : (
          <p className="vehicle-gallery__empty">
            {section === "interior"
              ? "Interior photography has not been added to the archive yet."
              : section === "exterior"
                ? "Verified exterior photography has not been added to the archive yet."
                : "Additional detail photography has not been added to the archive yet."}
          </p>
        )}
        {viewerImage && viewerIndex !== null && (
          <ImageViewer
            image={viewerImage}
            index={viewerIndex}
            total={sortedGallery.length}
            onClose={() => setViewerIndex(null)}
            onNavigate={navigateViewer}
          />
        )}
      </section>
    </>
  );
}
