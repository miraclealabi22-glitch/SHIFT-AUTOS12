"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { getLoginDestination } from "@/lib/auth-navigation";

function PasswordField({
  id,
  label,
  autoComplete,
}: {
  id: string;
  label: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-password">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          onInput={(event) => event.currentTarget.setCustomValidity("")}
        />
        <button
          className="auth-password__toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? "HIDE" : "SHOW"}
        </button>
      </div>
    </div>
  );
}

function SubmitNotice({ children }: { children: ReactNode }) {
  return <p className="auth-notice" role="status">{children}</p>;
}

async function submitGraphQLMutation<T>(mutation: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: mutation, variables }),
    credentials: "same-origin",
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    const message = payload.errors?.[0]?.message ?? "The request could not be completed.";
    throw new Error(message);
  }

  return payload.data as T;
}

function useAuthSubmit<T>(mutation: string, onSuccess?: (data: T) => void) {
  const [notice, setNotice] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>, variables: Record<string, unknown>) {
    event.preventDefault();
    setNotice("");
    setIsPending(true);

    try {
      const data = await submitGraphQLMutation<T>(mutation, variables);
      onSuccess?.(data);
      setNotice("Authentication succeeded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setIsPending(false);
    }
  }

  return { notice, isPending, onSubmit };
}

export function LoginForm() {
  const router = useRouter();
  const { notice, isPending, onSubmit } = useAuthSubmit<{ login: { user: { id: string; roles: string[] } } }>(`mutation Login($input: LoginInput!) { login(input: $input) { user { id name username email roles createdAt } expiresAt } }`, (data) => {
    if (data.login?.user) {
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      router.push(getLoginDestination(data.login.user.roles, requestedPath));
    }
  });

  return (
    <form className="auth-form" method="post" onSubmit={(event) => {
      const form = event.currentTarget;
      const email = form.querySelector<HTMLInputElement>("#login-email");
      const password = form.querySelector<HTMLInputElement>("#login-password");
      if (!email || !password) return;
      void onSubmit(event, { input: { email: email.value, password: password.value } });
    }}>
      <div className="auth-field">
        <label htmlFor="login-email">Email address</label>
        <input id="login-email" type="email" autoComplete="email" required />
      </div>
      <PasswordField id="login-password" label="Password" autoComplete="current-password" />
      <div className="auth-options">
        <label className="auth-checkbox">
          <input type="checkbox" />
          <span>Remember me</span>
        </label>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
      <button className="auth-submit" type="submit" disabled={isPending}>{isPending ? "SIGNING IN..." : "SIGN IN"} <span aria-hidden="true">↗</span></button>
      {notice && <SubmitNotice>{notice}</SubmitNotice>}
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const { notice, isPending, onSubmit } = useAuthSubmit<{ register: { user: { id: string } } }>(`mutation Register($input: RegisterInput!) { register(input: $input) { user { id name username email roles createdAt } expiresAt } }`, (data) => {
    if (data.register?.user) {
      router.push("/discover");
    }
  });
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  function onSignupSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const password = form.querySelector<HTMLInputElement>("#signup-password");
    const confirmation = form.querySelector<HTMLInputElement>("#confirm-password");
    if (
      password instanceof HTMLInputElement &&
      confirmation instanceof HTMLInputElement &&
      password.value !== confirmation.value
    ) {
      event.preventDefault();
      setPasswordMismatch(true);
      confirmation.setCustomValidity("Passwords do not match.");
      confirmation.reportValidity();
      return;
    }
    setPasswordMismatch(false);
    if (confirmation instanceof HTMLInputElement) confirmation.setCustomValidity("");
    const fullName = form.querySelector<HTMLInputElement>("#full-name");
    const username = form.querySelector<HTMLInputElement>("#username");
    const email = form.querySelector<HTMLInputElement>("#signup-email");
    if (!fullName || !username || !email || !password) return;
    void onSubmit(event, { input: { name: fullName.value, username: username.value, email: email.value, password: password.value } });
  }

  return (
    <form className="auth-form auth-form--signup" method="post" onSubmit={onSignupSubmit}>
      <div className="auth-field">
        <label htmlFor="full-name">Full name</label>
        <input id="full-name" type="text" autoComplete="name" required />
      </div>
      <div className="auth-field">
        <label htmlFor="username">Username</label>
        <input id="username" type="text" autoComplete="username" minLength={3} required />
      </div>
      <div className="auth-field">
        <label htmlFor="signup-email">Email address</label>
        <input id="signup-email" type="email" autoComplete="email" required />
      </div>
      <PasswordField id="signup-password" label="Password" autoComplete="new-password" />
      <PasswordField id="confirm-password" label="Confirm password" autoComplete="new-password" />
      {passwordMismatch && <p className="auth-error" role="alert">Your passwords do not match.</p>}
      <label className="auth-checkbox auth-terms">
        <input type="checkbox" required />
        <span>I agree to the SHIFT terms and privacy policy.</span>
      </label>
      <button className="auth-submit" type="submit" disabled={isPending}>{isPending ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"} <span aria-hidden="true">↗</span></button>
      {notice && <SubmitNotice>{notice}</SubmitNotice>}
    </form>
  );
}

export function ForgotPasswordForm() {
  return (
    <form className="auth-form" method="post" onSubmit={(event) => event.preventDefault()}>
      <div className="auth-field">
        <label htmlFor="recovery-email">Email address</label>
        <input id="recovery-email" type="email" autoComplete="email" required />
      </div>
      <button className="auth-submit" type="submit">REQUEST RESET <span aria-hidden="true">↗</span></button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  function onResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = form.querySelector<HTMLInputElement>("#reset-password");
    const confirmation = form.querySelector<HTMLInputElement>("#reset-confirm-password");
    if (
      password instanceof HTMLInputElement &&
      confirmation instanceof HTMLInputElement &&
      password.value !== confirmation.value
    ) {
      setPasswordMismatch(true);
      confirmation.setCustomValidity("Passwords do not match.");
      confirmation.reportValidity();
      return;
    }
    setPasswordMismatch(false);
    if (confirmation instanceof HTMLInputElement) confirmation.setCustomValidity("");
  }

  return (
    <form className="auth-form" method="post" onSubmit={onResetSubmit}>
      <PasswordField id="reset-password" label="New password" autoComplete="new-password" />
      <PasswordField id="reset-confirm-password" label="Confirm new password" autoComplete="new-password" />
      {passwordMismatch && <p className="auth-error" role="alert">Your passwords do not match.</p>}
      <button className="auth-submit" type="submit">RESET PASSWORD <span aria-hidden="true">↗</span></button>
    </form>
  );
}
