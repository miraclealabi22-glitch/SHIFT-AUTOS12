import Image from "next/image";

type ShiftLogoProps = {
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
  size?: "small" | "medium" | "large";
};

export default function ShiftLogo({
  alt = "SHIFT emblem",
  className,
  loading = "lazy",
  size = "medium",
}: ShiftLogoProps) {
  return (
    <Image
      src="/shift-emblem.png"
      width={768}
      height={768}
      alt={alt}
      className={["shift-logo", `shift-logo--${size}`, className].filter(Boolean).join(" ")}
      sizes={size === "large" ? "176px" : size === "medium" ? "52px" : "40px"}
      loading={loading}
      unoptimized
    />
  );
}
