"use client";

import { useState } from "react";

type CloudinaryVideoProps = {
  src: string | null | undefined;
  poster?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  controls?: boolean;
};

export function CloudinaryVideo({
  src,
  poster,
  alt,
  width,
  height,
  className,
  controls = true,
}: CloudinaryVideoProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = src !== null && src !== undefined && loadedSrc === src;
  const failed = src !== null && src !== undefined && failedSrc === src;
  const style = {
    position: "relative" as const,
    aspectRatio: `${width} / ${height}`,
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
        <span>Video unavailable</span>
      </div>
    );
  }

  return (
    <div className={className} style={style} aria-busy={!loaded}>
      {!loaded && <span role="status">Loading video...</span>}
      <video
        src={src}
        poster={poster ?? undefined}
        controls={controls}
        playsInline
        preload="none"
        aria-label={alt}
        onLoadedData={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
