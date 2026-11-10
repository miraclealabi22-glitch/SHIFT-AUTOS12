import type { Metadata } from "next";
import Link from "next/link";
import AuthExperience from "@/components/auth/auth-experience";

export const metadata: Metadata = {
  title: "Verify your email — SHIFT",
  description: "Email verification information for SHIFT accounts.",
};

export default function VerifyEmailPage() {
  return (
    <AuthExperience
      label="ONE LAST STEP"
      heading="CHECK YOUR EMAIL."
      description="Email verification will be available once SHIFT account services are connected."
      footer={<><span>Already verified?</span> <Link href="/login">Sign in</Link></>}
    >
      <div className="auth-message">
        <span className="auth-message__rule" aria-hidden="true" />
        <p>We haven&apos;t sent a verification email. Account services are not connected yet.</p>
      </div>
    </AuthExperience>
  );
}
