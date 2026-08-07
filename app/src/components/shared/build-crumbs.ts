/**
 * Pure pathname → breadcrumb-trail mapping for the dashboard. Kept free of
 * React/Next imports so it can be unit-tested in isolation (pattern borrowed
 * from the dodi project).
 *
 * The organization is rendered as a separate leading crumb by the Breadcrumbs
 * component (with an instance switcher once multi-org support lands); this
 * function only maps the section path. Instance crumbs (e.g. a website's
 * name with a switcher) join in later phases when detail routes exist.
 */

export interface Crumb {
  label: string;
  /** Link target. The last crumb is always rendered as plain text regardless. */
  href?: string;
}

export function buildCrumbs(pathname: string): Crumb[] {
  const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const section = seg[0];
  if (!section) return [{ label: "Overview" }];

  switch (section) {
    case "websites":
      return [{ label: "Websites", href: "/websites" }];

    case "agents":
      return [{ label: "Agents", href: "/agents" }];

    case "sources":
      return [{ label: "Sources", href: "/sources" }];

    case "suggestions":
      return [{ label: "Suggestions", href: "/suggestions" }];

    case "settings": {
      const crumbs: Crumb[] = [{ label: "Settings", href: "/settings" }];
      if (seg[1] === "members") crumbs.push({ label: "Members" });
      return crumbs;
    }

    default:
      return [];
  }
}
