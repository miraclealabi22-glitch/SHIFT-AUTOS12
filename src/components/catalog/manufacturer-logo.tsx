"use client";

import { useState } from "react";
import type { Manufacturer } from "@/lib/catalog/types";

type ManufacturerLogoProps = {
  manufacturer: Pick<Manufacturer, "name" | "logo" | "logoVerificationStatus">;
  className: string;
  fallbackClassName: string;
  fallbackLabel: string;
};

export default function ManufacturerLogo({
  manufacturer,
  className,
  fallbackClassName,
  fallbackLabel,
}: ManufacturerLogoProps) {
  const [failed, setFailed] = useState(false);
  const logo = manufacturer.logo;
  const verified = manufacturer.logoVerificationStatus === "verified"
    && logo?.verificationStatus === "verified";

  if (!logo || !verified || failed) {
    return (
      <span className={fallbackClassName}>
        {failed && verified ? "LOGO UNAVAILABLE" : fallbackLabel || `${manufacturer.name} logo unavailable`}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={logo.url}
      alt={logo.alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}