/**
 * Pure pathname → breadcrumb-trail mapping for the dashboard. Kept free of
 * React/Next imports so it can be unit-tested in isolation (pattern borrowed
 * from the dodi project).
 *
 * Two-level IA: at the org home (`/`, the project selection screen) the org
 * crumb rendered by the Breadcrumbs component is the leaf, so this returns no
 * crumbs. On project routes the Breadcrumbs component inserts the project
 * crumb (name via breadcrumb context, with a switcher); this module only maps
 * the section trail after it.
 */

export interface Crumb {
  label: string;
  /** Link target. The last crumb is always rendered as plain text regardless. */
  href?: string;
}

/** Active project id when on a project-scoped route, else null. */
export function activeProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)/);
  const id = match?.[1];
  return id && id !== "new" ? id : null;
}

export function buildCrumbs(pathname: string): Crumb[] {
  const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  const section = seg[0];
  if (!section) return [];

  if (section === "projects") {
    const id = seg[1];
    if (id === "new") return [{ label: "New project" }];
    if (!id) return [];
    // The project crumb itself comes from context; map the sub-section.
    const sub = seg[2];
    const base = `/projects/${id}`;
    switch (sub) {
      case undefined:
        return [];
      case "content": {
        const crumbs: Crumb[] = [{ label: "Content", href: `${base}/content` }];
        if (seg[3]) crumbs.push({ label: "Suggestion" });
        return crumbs;
      }
      case "radar": {
        const crumbs: Crumb[] = [{ label: "Radars", href: `${base}/radar` }];
        if (seg[3]) crumbs.push({ label: "Radar detail" });
        return crumbs;
      }
      case "editors":
        return [{ label: "Editors", href: `${base}/editors` }];
      case "settings":
        return [{ label: "Settings", href: `${base}/settings` }];
      default:
        return [];
    }
  }

  switch (section) {
    case "content":
      return [{ label: "Content", href: "/content" }];

    case "radar":
      return [{ label: "Radars", href: "/radar" }];

    case "editors": {
      const crumbs: Crumb[] = [{ label: "Editors", href: "/editors" }];
      if (seg[1] === "new") crumbs.push({ label: "New editor" });
      else if (seg[1]) crumbs.push({ label: "…" });
      return crumbs;
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
