import type { Metadata } from "next";
import Link from "next/link";
import AuthExperience from "@/components/auth/auth-experience";
import { ResetPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Choose a new password — SHIFT",
  description: "Choose a new password for your SHIFT account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthExperience
      label="ACCOUNT ACCESS"
      heading="NEW PASSWORD."
      description="Choose a new password to get back to your automotive world."
      footer={<><span>Need a new reset link?</span> <Link href="/forgot-password">Request one</Link></>}
    >
      <ResetPasswordForm />
    </AuthExperience>
  );
}
