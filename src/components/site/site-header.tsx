import Link from "next/link";
import ShiftLogo from "@/components/brand/shift-logo";

type SiteHeaderProps = {
  active?: "discover" | "brands" | "journal" | "models";
  cinematic?: boolean;
};

export default function SiteHeader({ active, cinematic = false }: SiteHeaderProps) {
  return (
    <header className={`site-header${cinematic ? " site-header--cinematic" : ""}`}>
      <Link className="brand-link" href="/login" aria-label="SHIFT home">
        <ShiftLogo alt="SHIFT home" loading="eager" />
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link className="site-nav__brands" href="/login" aria-current={active === "discover" || active === "brands" ? "page" : undefined}>Discover</Link>
        <Link className="site-nav__models" href="/discover/vehicles" aria-current={active === "models" ? "page" : undefined}>Models</Link>
        <Link className="site-nav__secondary" href="/login" aria-current={active === "journal" ? "page" : undefined}>Journal</Link>
        <Link className="site-nav__social" href="/login">Community</Link>
      </nav>
      <Link className="header-action" href="/login">
        <span>Enter Shift</span><span aria-hidden="true">↗</span>
      </Link>
    </header>
  );
}
