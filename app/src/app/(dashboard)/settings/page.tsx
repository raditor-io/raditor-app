import Link from "next/link";

import { requireOrgContext } from "@/services/org";

export const metadata = { title: "Settings | Raditor" };

export default async function SettingsPage() {
  const ctx = await requireOrgContext();

  return (
    <div>
      <div className="max-w-2xl space-y-4">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-medium text-foreground">Organization</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-faint">Name:</dt>
              <dd className="text-foreground">
                {ctx.organization.display_name}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-faint">Slug:</dt>
              <dd className="text-foreground">{ctx.organization.slug}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-faint">Your role:</dt>
              <dd className="capitalize text-foreground">
                {ctx.membership.member_role}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-medium text-foreground">Members</h2>
          <p className="mt-2 text-sm text-muted">
            Invite teammates and manage roles. Admins configure websites,
            sources, and agents; users review and approve content.
          </p>
          <Link
            href="/settings/members"
            className="mt-3 inline-block text-sm text-accent hover:underline"
          >
            Manage members
          </Link>
        </section>
      </div>
    </div>
  );
}
