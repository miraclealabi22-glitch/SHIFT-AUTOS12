import type { ReactNode } from "react";
import Link from "next/link";
import AuthVideoPanel from "./auth-video-panel";
import ShiftLogo from "@/components/brand/shift-logo";

type AuthExperienceProps = {
  children: ReactNode;
  description: string;
  footer: ReactNode;
  heading: string;
  label: string;
};

export default function AuthExperience({
  children,
  description,
  footer,
  heading,
  label,
}: AuthExperienceProps) {
  return (
    <main id="main-content" className="auth-shell">
      <AuthVideoPanel />
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-panel__mobile-brand">
          <Link className="auth-brand-link" href="/" aria-label="SHIFT home">
            <ShiftLogo alt="SHIFT home" />
          </Link>
        </div>
        <div className="auth-panel__content">
          <p className="auth-kicker">{label}</p>
          <h1 id="auth-heading">{heading}</h1>
          <p className="auth-panel__description">{description}</p>
          {children}
          <div className="auth-panel__footer">{footer}</div>
        </div>
        <div className="auth-panel__legal">
          <span>© 2026 SHIFT</span>
          <span>DISCOVER. EXPERIENCE. SHARE.</span>
        </div>
      </section>
    </main>
  );
}
