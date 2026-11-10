import type { Metadata } from "next";
import Link from "next/link";
import AuthExperience from "@/components/auth/auth-experience";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = {
  title: "Join SHIFT",
  description: "Create your account and enter a world built around automotive culture.",
};

export default function SignupPage() {
  return (
    <AuthExperience
      label="YOUR NEXT CHAPTER STARTS HERE."
      heading="JOIN SHIFT."
      description="Create your account and enter a world built around automotive culture."
      footer={<><span>Already a member?</span> <Link href="/login">Sign in <span aria-hidden="true">↗</span></Link></>}
    >
      <SignupForm />
    </AuthExperience>
  );
}
