/**
 * Invitation landing page. Unauthenticated visitors are sent to signup with a
 * return path; authenticated ones accept immediately (the definer function
 * enforces email match and expiry).
 */
import { redirect } from "next/navigation";

import { serverClient } from "@/lib/supabase/server";
import {
  acceptInvitationByToken,
  getInvitationPreview,
} from "@/services/org";

export const metadata = { title: "Invitation | Raditor" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const preview = await getInvitationPreview(token);

  if (!preview || preview.isExpired) {
    return (
      <InviteShell>
        <h1 className="text-lg font-semibold text-foreground">
          Invitation not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          This invitation link is invalid, expired, or already used. Ask an
          admin of the organization to send a new one.
        </p>
      </InviteShell>
    );
  }

  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  let errorMessage: string | null = null;
  try {
    await acceptInvitationByToken(token);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Something went wrong.";
  }

  if (!errorMessage) {
    redirect("/");
  }

  return (
    <InviteShell>
      <h1 className="text-lg font-semibold text-foreground">
        Could not accept invitation
      </h1>
      <p className="mt-2 text-sm text-muted">{errorMessage}</p>
      <p className="mt-4 text-sm text-faint">
        Invitation for {preview.email} to join {preview.organizationName}.
      </p>
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
