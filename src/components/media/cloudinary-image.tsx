"use client";

import Image from "next/image";
import { useState } from "react";

type CloudinaryImageProps = {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

export function CloudinaryImage({
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 700px) 100vw, 700px",
  priority = false,
  className,
}: CloudinaryImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = src !== null && src !== undefined && loadedSrc === src;
  const failed = src !== null && src !== undefined && failedSrc === src;
  const ratio = `${width} / ${height}`;
  const style = {
    position: "relative" as const,
    aspectRatio: ratio,
    overflow: "hidden",
    backgroundColor: "rgba(127, 127, 127, 0.12)",
  };

  if (!src || failed) {
    return (
      <div
        className={className}
        style={style}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={!alt}
      >
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={className} style={style} aria-busy={!loaded}>
      {!loaded && <span role="status">Loading image...</span>}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={75}
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        style={{ objectFit: "cover", opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}
