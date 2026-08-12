import { redirect } from "next/navigation";

import { BreadcrumbProvider } from "@/components/shared/breadcrumb-context";
import { DashboardShell } from "@/components/shared/dashboard-shell";
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
      <DashboardShell
        organizationName={ctx.organization.display_name}
        memberRole={ctx.membership.member_role}
        userName={
          typeof ctx.user.user_metadata?.full_name === "string"
            ? ctx.user.user_metadata.full_name
            : typeof ctx.user.user_metadata?.name === "string"
              ? ctx.user.user_metadata.name
              : null
        }
        userEmail={ctx.user.email ?? null}
      >
        {children}
      </DashboardShell>
    </BreadcrumbProvider>
  );
}
