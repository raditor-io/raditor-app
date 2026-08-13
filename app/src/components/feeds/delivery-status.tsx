"use client";

/**
 * The status cell of a delivery attempt row. When the attempt captured a
 * response body, the status becomes a button opening that body in a modal.
 * Destination responses are untrusted content: the body renders as
 * HTML-escaped text inside a fully sandboxed iframe (sandbox="" — no
 * scripts, no same-origin), so even hostile HTML stays inert.
 */
import { useState } from "react";

import { Modal } from "@/components/shared/modal";

function statusTextClasses(status: string): string {
  if (status === "delivered") return "text-success";
  if (status === "failed") return "text-accent-deep";
  return "text-muted";
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Minimal standalone document: the raw body, escaped, in a <pre>. */
function buildResponseDocument(raw: string): string {
  return (
    '<!doctype html><meta charset="utf-8">' +
    '<pre style="margin:0;padding:12px;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;color:#171717;background:#fff">' +
    escapeHtml(raw) +
    "</pre>"
  );
}

export function DeliveryStatus({
  status,
  statusCode,
  responseDataRaw,
  feedItemId,
}: {
  status: string;
  statusCode: number | null;
  responseDataRaw: string | null;
  feedItemId: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const label = statusCode === null ? status : `${status} · ${statusCode}`;

  if (!responseDataRaw) {
    return <span className={statusTextClasses(status)}>{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`View response for item #${feedItemId}`}
        title="View response"
        className={`cursor-pointer hover:underline ${statusTextClasses(status)}`}
      >
        {label}
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Response · item #${feedItemId}`}
        description={statusCode === null ? undefined : `HTTP ${statusCode}`}
      >
        <iframe
          sandbox=""
          srcDoc={buildResponseDocument(responseDataRaw)}
          title={`Raw response data for item #${feedItemId}`}
          className="h-72 w-full rounded-md border border-border bg-white"
        />
      </Modal>
    </>
  );
}
