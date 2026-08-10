import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BreadcrumbProvider } from "@/components/shared/breadcrumb-context";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { SidebarNav } from "@/components/shared/sidebar";
import { getOrgContext } from "@/services/org";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ctx = await getOrgContext();
  if (!ctx) {
    redirect("/login");
  }

  return (
    <BreadcrumbProvider>
      <div className="flex min-h-screen bg-background">
        <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
          <div className="px-5 py-5">
            <Link href="/" aria-label="Raditor home" className="inline-block">
              <Image
                src="/images/raditor-logo.png"
                alt="Raditor"
                width={169}
                height={46}
                priority
                className="block h-8 w-auto"
              />
            </Link>
          </div>
          <SidebarNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-6">
            <Breadcrumbs organizationName={ctx.organization.display_name} />
            <div className="flex shrink-0 items-center gap-3">
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs capitalize text-muted">
                {ctx.membership.member_role}
              </span>
              <span className="hidden text-sm text-muted sm:block">
                {ctx.user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-hover"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
