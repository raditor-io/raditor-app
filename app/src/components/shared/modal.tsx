"use client";

/**
 * Vercel-style modal: dimmed backdrop, centered panel with title,
 * description, and an X close button; closes on Escape, backdrop click, or
 * the X. Content (including the footer buttons) comes from children.
 */
import { IconX } from "@tabler/icons-react";
import { useEffect } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          <IconX size={17} stroke={1.75} />
        </button>
        <h2 className="pr-8 text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-muted">{description}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
