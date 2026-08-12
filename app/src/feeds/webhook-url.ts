/**
 * Webhook destination validation (SSRF guard, checked at subscription
 * creation): https only, public hostnames only. The deliver job additionally
 * refuses redirects. DNS-rebinding resolution is out of MVP scope.
 */

const BLOCKED_HOSTNAME_SUFFIXES = [".local", ".internal", ".localhost"];

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p > 255)) {
    return false; // not an IPv4 literal
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isIpv4Literal(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

export interface WebhookUrlValidation {
  isValid: boolean;
  reason?: string;
}

export function validateWebhookUrl(rawUrl: string): WebhookUrlValidation {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { isValid: false, reason: "Not a valid URL." };
  }

  if (url.protocol !== "https:") {
    return { isValid: false, reason: "Webhook URLs must use https." };
  }

  const host = url.hostname.toLowerCase();

  if (host === "localhost" || BLOCKED_HOSTNAME_SUFFIXES.some((s) => host.endsWith(s))) {
    return { isValid: false, reason: "Local hostnames are not allowed." };
  }
  if (host.includes(":") || host.startsWith("[")) {
    return { isValid: false, reason: "IPv6 literals are not allowed." };
  }
  if (isIpv4Literal(host)) {
    if (isPrivateIpv4(host)) {
      return { isValid: false, reason: "Private IP ranges are not allowed." };
    }
    return { isValid: true };
  }
  if (!host.includes(".")) {
    return { isValid: false, reason: "Bare intranet hostnames are not allowed." };
  }

  return { isValid: true };
}
