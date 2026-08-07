import { InviteForm } from "@/components/settings/invite-form";
import {
  listMembers,
  listPendingInvitations,
  requireOrgContext,
} from "@/services/org";

import {
  changeMemberRoleAction,
  removeMemberAction,
  revokeInvitationAction,
} from "./actions";

export const metadata = { title: "Members | Raditor" };

export default async function MembersPage() {
  const ctx = await requireOrgContext();
  const [members, invitations] = await Promise.all([
    listMembers(ctx.organization.id),
    ctx.isAdmin ? listPendingInvitations(ctx.organization.id) : [],
  ]);

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-muted">
        Admins configure websites, sources, and agents. Users review and
        approve content.
      </p>

      {ctx.isAdmin ? (
        <section className="mt-4 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-medium text-foreground">
            Invite a teammate
          </h2>
          <div className="mt-3">
            <InviteForm />
          </div>
        </section>
      ) : null}

      <section className="mt-6 space-y-2">
        {members.map((member) => {
          const isSelf = member.user_id === ctx.user.id;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 hover:border-border-strong"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {member.member_email ?? member.user_id}
                </span>
                {isSelf ? (
                  <span className="shrink-0 text-xs text-faint">(you)</span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted">
                  {member.member_role}
                </span>
                {ctx.isAdmin ? (
                  <div className="flex items-center gap-3">
                    <form action={changeMemberRoleAction}>
                      <input
                        type="hidden"
                        name="membership_id"
                        value={member.id}
                      />
                      <input
                        type="hidden"
                        name="member_role"
                        value={member.member_role === "admin" ? "user" : "admin"}
                      />
                      <button
                        type="submit"
                        className="text-xs text-muted hover:text-foreground hover:underline"
                      >
                        {member.member_role === "admin"
                          ? "Make user"
                          : "Make admin"}
                      </button>
                    </form>
                    {!isSelf ? (
                      <form action={removeMemberAction}>
                        <input
                          type="hidden"
                          name="membership_id"
                          value={member.id}
                        />
                        <button
                          type="submit"
                          className="text-xs text-accent-deep hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      {ctx.isAdmin && invitations.length > 0 ? (
        <>
          <h2 className="mt-8 text-sm font-medium text-foreground">
            Pending invitations
          </h2>
          <section className="mt-3 space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 hover:border-border-strong"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {invitation.email}
                  </span>
                  <span className="shrink-0 text-xs text-faint">
                    expires{" "}
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted">
                    {invitation.member_role}
                  </span>
                  <form action={revokeInvitationAction}>
                    <input
                      type="hidden"
                      name="invitation_id"
                      value={invitation.id}
                    />
                    <button
                      type="submit"
                      className="text-xs text-accent-deep hover:underline"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
