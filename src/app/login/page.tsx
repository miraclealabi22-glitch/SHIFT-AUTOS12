import type { Metadata } from "next";
import Link from "next/link";
import AuthExperience from "@/components/auth/auth-experience";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Sign in — SHIFT",
  description: "Sign in to continue your SHIFT automotive experience.",
};

export default function LoginPage() {
  return (
    <AuthExperience
      label="YOUR AUTOMOTIVE WORLD AWAITS."
      heading="WELCOME BACK."
      description="Sign in to continue your SHIFT experience."
      footer={<><span>New to SHIFT?</span> <Link href="/signup">Create an account <span aria-hidden="true">↗</span></Link></>}
    >
      <LoginForm />
    </AuthExperience>
  );
}
