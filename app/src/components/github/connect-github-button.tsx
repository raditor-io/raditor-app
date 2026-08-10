"use client";

/**
 * Vercel-style GitHub connect: opens the install flow in a popup window; the
 * /github/connected bridge posts back when done and the current view
 * refreshes so new installations/repos appear without a manual reload.
 * Falls back to a full-page navigation when the popup is blocked.
 */
import { IconBrandGithub } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const GITHUB_CONNECTED_MESSAGE = "raditor:github-connected";

/** Open the connect flow in a centered popup; full-page nav as fallback. */
export function openGithubConnectPopup(returnTo: string): void {
  const connectUrl = `/api/github/connect?return=${encodeURIComponent(returnTo)}`;
  const width = 1020;
  const height = 780;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const popup = window.open(
    connectUrl,
    "raditor-github-connect",
    `width=${width},height=${height},left=${left},top=${top}`,
  );
  if (!popup) {
    window.location.href = connectUrl;
  }
}

/** Refresh the current view when the connect popup reports completion. */
export function useGithubConnectedRefresh(): void {
  const router = useRouter();
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (
        typeof event.data === "object" &&
        event.data?.type === GITHUB_CONNECTED_MESSAGE
      ) {
        router.refresh();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);
}

export interface ConnectGithubButtonProps {
  /** Same-origin path to return to for the non-popup fallback. */
  returnTo: string;
  label?: string;
  variant?: "button" | "link";
}

export function ConnectGithubButton({
  returnTo,
  label = "Connect GitHub",
  variant = "button",
}: ConnectGithubButtonProps) {
  useGithubConnectedRefresh();

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={() => openGithubConnectPopup(returnTo)}
        className="text-accent hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openGithubConnectPopup(returnTo)}
      className="flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-black"
    >
      <IconBrandGithub size={16} stroke={1.75} />
      {label}
    </button>
  );
}
