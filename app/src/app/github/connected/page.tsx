"use client";

/**
 * Popup bridge for the GitHub connect flow (Vercel-style). The setup callback
 * redirects here inside the popup; this page notifies the opener window and
 * closes itself. Opened directly (popup blocked or direct install), it
 * forwards to the return path instead.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// Keep in sync with components/github/connect-github-button.tsx.
const GITHUB_CONNECTED_MESSAGE = "raditor:github-connected";

function ConnectedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "ok";
  const reason = searchParams.get("reason");
  const returnTo = searchParams.get("return") ?? "/";
  const safeReturn =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const [isPopup, setIsPopup] = useState(false);

  useEffect(() => {
    if (window.opener && window.opener !== window) {
      setIsPopup(true);
      window.opener.postMessage(
        { type: GITHUB_CONNECTED_MESSAGE, status, reason },
        window.location.origin,
      );
      window.close();
      return;
    }
    if (status === "ok") {
      router.replace(safeReturn);
    }
  }, [router, safeReturn, status, reason]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
        {status === "ok" ? (
          <>
            <h1 className="text-base font-medium text-foreground">
              GitHub connected
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isPopup
                ? "You can close this window."
                : "Taking you back..."}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-base font-medium text-foreground">
              GitHub connection failed
            </h1>
            <p className="mt-2 text-sm text-muted">
              {reason === "admin_required"
                ? "The admin role is required to connect GitHub."
                : reason === "missing_installation"
                  ? "GitHub did not report an installation. Try again."
                  : "Something went wrong storing the installation. Try again."}
            </p>
            <button
              type="button"
              onClick={() => (isPopup ? window.close() : router.replace("/"))}
              className="mt-4 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-hover"
            >
              Close
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function GithubConnectedPage() {
  return (
    <Suspense>
      <ConnectedInner />
    </Suspense>
  );
}
