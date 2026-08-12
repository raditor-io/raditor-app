"use client";

/**
 * Shared email/password + GitHub OAuth form for /login and /signup.
 *
 * Email confirmation and password reset both use 6-digit OTPs: the form
 * switches to a code-entry step and confirms via supabase.auth.verifyOtp
 * (type "signup" or "recovery"). Codes are delivered through the Send Email
 * auth hook (/api/auth/send-email) via Resend. The reset flow: request code
 * → verify code (creates a session) → set the new password.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { browserClient } from "@/lib/supabase/browser";

export interface AuthFormProps {
  mode: "login" | "signup";
}

const INPUT_CLASSES =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none";

type AuthStep =
  | "credentials"
  | "verify"
  | "reset_request"
  | "reset_verify"
  | "reset_password";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const nextPath = searchParams.get("next") ?? "/";

  async function handleGithub() {
    setIsBusy(true);
    setErrorMessage(null);
    const supabase = browserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      setErrorMessage(error.message);
      setIsBusy(false);
    }
  }

  function enterVerifyStep(message: string) {
    setStep("verify");
    setCode("");
    setErrorMessage(null);
    setNotice(message);
    setIsBusy(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);
    setNotice(null);
    const supabase = browserClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes("not confirmed")) {
          await supabase.auth.resend({ type: "signup", email });
          enterVerifyStep(
            "Your email is not confirmed yet. We sent you a new 6-digit code.",
          );
          return;
        }
        setErrorMessage(error.message);
        setIsBusy(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMessage(error.message);
        setIsBusy(false);
        return;
      }
      if (data.session) {
        router.push(nextPath);
        router.refresh();
      } else {
        enterVerifyStep("We sent a 6-digit code to your email address.");
      }
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);
    const supabase = browserClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("expired")
          ? "That code is invalid or expired. Request a new one below."
          : error.message,
      );
      setIsBusy(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  async function handleResend() {
    setIsBusy(true);
    setErrorMessage(null);
    setNotice(null);
    const supabase = browserClient();
    const { error } =
      step === "reset_verify"
        ? await supabase.auth.resetPasswordForEmail(email)
        : await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setErrorMessage(error.message);
    } else {
      setNotice("A new code is on its way.");
    }
    setIsBusy(false);
  }

  async function handleResetRequest(event: React.FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);
    const supabase = browserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setErrorMessage(error.message);
      setIsBusy(false);
      return;
    }
    setStep("reset_verify");
    setCode("");
    setNotice("We sent a 6-digit reset code to your email address.");
    setIsBusy(false);
  }

  async function handleResetVerify(event: React.FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);
    const supabase = browserClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });
    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("expired")
          ? "That code is invalid or expired. Request a new one below."
          : error.message,
      );
      setIsBusy(false);
      return;
    }
    // The verified recovery OTP established a session; set the new password.
    setStep("reset_password");
    setPassword("");
    setNotice(null);
    setIsBusy(false);
  }

  async function handleSetNewPassword(event: React.FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setErrorMessage(null);
    const supabase = browserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMessage(error.message);
      setIsBusy(false);
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  if (step === "reset_request") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Reset your password
          </h2>
          <p className="mt-1 text-sm text-muted">
            Enter your email address and we send you a 6-digit reset code.
          </p>
        </div>

        <form onSubmit={handleResetRequest} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASSES}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </label>

          {errorMessage ? (
            <p className="text-sm text-accent-deep">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
          >
            Send reset code
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          Remembered it?{" "}
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setErrorMessage(null);
              setNotice(null);
            }}
            className="text-accent hover:underline"
          >
            Back to sign in
          </button>
        </p>
      </div>
    );
  }

  if (step === "reset_verify") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Enter your reset code
          </h2>
          <p className="mt-1 text-sm text-muted">
            We emailed a 6-digit code to {email}.
          </p>
        </div>

        <form onSubmit={handleResetVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${INPUT_CLASSES} text-center text-xl tracking-[0.5em]`}
            placeholder="000000"
            autoFocus
          />

          {errorMessage ? (
            <p className="text-sm text-accent-deep">{errorMessage}</p>
          ) : null}
          {notice ? <p className="text-sm text-muted">{notice}</p> : null}

          <button
            type="submit"
            disabled={isBusy || code.length !== 6}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
          >
            Verify code
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          No code received?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isBusy}
            className="text-accent hover:underline disabled:opacity-50"
          >
            Send a new one
          </button>
        </p>
      </div>
    );
  }

  if (step === "reset_password") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Choose a new password
          </h2>
          <p className="mt-1 text-sm text-muted">
            Your code was verified. Set a new password for {email}.
          </p>
        </div>

        <form onSubmit={handleSetNewPassword} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASSES}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              autoFocus
            />
          </label>

          {errorMessage ? (
            <p className="text-sm text-accent-deep">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={isBusy}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
          >
            Set new password and sign in
          </button>
        </form>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Enter your code
          </h2>
          <p className="mt-1 text-sm text-muted">
            We emailed a 6-digit code to {email}.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${INPUT_CLASSES} text-center text-xl tracking-[0.5em]`}
            placeholder="000000"
            autoFocus
          />

          {errorMessage ? (
            <p className="text-sm text-accent-deep">{errorMessage}</p>
          ) : null}
          {notice ? <p className="text-sm text-muted">{notice}</p> : null}

          <button
            type="submit"
            disabled={isBusy || code.length !== 6}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
          >
            Confirm
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          No code received?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isBusy}
            className="text-accent hover:underline disabled:opacity-50"
          >
            Send a new one
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleGithub}
        disabled={isBusy}
        className="w-full rounded-md bg-foreground px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
      >
        Continue with GitHub
      </button>

      <div className="flex items-center gap-3 text-xs text-faint">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASSES}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between">
            <span className="text-muted">Password</span>
            {mode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setStep("reset_request");
                  setErrorMessage(null);
                  setNotice(null);
                }}
                className="text-xs text-muted hover:text-accent hover:underline"
              >
                Forgot password?
              </button>
            ) : null}
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASSES}
            placeholder="At least 8 characters"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {errorMessage ? (
          <p className="text-sm text-accent-deep">{errorMessage}</p>
        ) : null}
        {notice ? <p className="text-sm text-muted">{notice}</p> : null}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            New to Raditor?{" "}
            <a href="/signup" className="text-accent hover:underline">
              Create an account
            </a>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <a href="/login" className="text-accent hover:underline">
              Sign in
            </a>
          </>
        )}
      </p>
    </div>
  );
}
