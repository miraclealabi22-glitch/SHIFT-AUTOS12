import type { Metadata } from "next";
import Link from "next/link";
import AuthExperience from "@/components/auth/auth-experience";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Forgot password — SHIFT",
  description: "Request a password reset for your SHIFT account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthExperience
      label="ACCOUNT ACCESS"
      heading="RESET PASSWORD."
      description="Enter the email address associated with your SHIFT account."
      footer={<><span>Remembered your password?</span> <Link href="/login">Back to sign in</Link></>}
    >
      <ForgotPasswordForm />
    </AuthExperience>
  );
}
