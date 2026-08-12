/**
 * Pure pathname → breadcrumb-trail mapping for the dashboard. Kept free of
 * React/Next imports so it can be unit-tested in isolation (pattern borrowed
 * from the dodi project).
 *
 * IA: the org home (`/`) is the feeds view, so it renders no crumbs (the org
 * crumb is the leaf). On radar routes the Breadcrumbs component inserts the
 * radar crumb (name via breadcrumb context, with a switcher); this module
 * only maps the section trail after it.
 */

export interface Crumb {
  label: string;
  /** Link target. The last crumb is always rendered as plain text regardless. */
  href?: string;
}

/** Active radar id when on a radar-scoped route, else null. */
export function activeRadarId(pathname: string): string | null {
  const match = pathname.match(/^\/radars\/([^/]+)/);
  const id = match?.[1];
  return id ?? null;
}

export function buildCrumbs(pathname: string): Crumb[] {
  const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const section = seg[0];
  if (!section) return [];

  switch (section) {
    case "feeds": {
      const crumbs: Crumb[] = [{ label: "Feeds", href: "/" }];
      if (seg[2] === "settings") crumbs.push({ label: "Configure" });
      return crumbs;
    }

    case "radars": {
      // The radar crumb itself comes from context; map the tab trail.
      if (!seg[1]) return [];
      if (seg[2] === "signals") return [{ label: "Signals" }];
      if (seg[2] === "settings") return [{ label: "Settings" }];
      return [];
    }

    case "settings": {
      const crumbs: Crumb[] = [{ label: "Settings", href: "/settings" }];
      if (seg[1] === "members") crumbs.push({ label: "Members" });
      return crumbs;
    }

    default:
      return [];
  }
}
