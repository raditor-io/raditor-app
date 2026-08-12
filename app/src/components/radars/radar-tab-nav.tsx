"use client";

/** Tab nav inside a radar: Overview | Signals | Settings. */
import Link from "next/link";
import { usePathname } from "next/navigation";

export function RadarTabNav({ radarId }: { radarId: string }) {
  const pathname = usePathname();
  const base = `/radars/${radarId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/signals`, label: "Signals" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <nav className="mb-5 flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-3 py-2 text-sm ${
              isActive
                ? "border-accent font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
