"use client";

import { useState } from "react";
import type { Vehicle } from "@/lib/catalog/types";

export default function VehicleImage({ vehicle }: { vehicle: Vehicle }) {
  const image = vehicle.images.find((item) => item.verificationStatus === "verified");
  const [failed, setFailed] = useState(false);

  if (!image || failed) {
    return <span>IMAGE UNAVAILABLE</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.url}
      alt={image.alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
