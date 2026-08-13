/**
 * Organization service: active-org resolution, members, and invitations.
 * Both the UI (server components / actions) and future API routes go through
 * these functions; RLS is the backstop, these guards give clear errors.
 */
import type { User } from "@supabase/supabase-js";

import { MemberInvitationEmail } from "@/emails/member-invitation";
import type { Database } from "@/lib/database.types";
import type { DateTimeSettings } from "@/lib/format-date";
import type { MemberRole } from "@/lib/roles";
import {
  generateInviteToken,
  hashInviteToken,
} from "@/lib/crypto/invite-token";
import { sendEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { adminClient, serverClient } from "@/lib/supabase/server";
import { recordEvent } from "@/services/record-event";

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
type MembershipRow =
  Database["public"]["Tables"]["organization_memberships"]["Row"];
export type InvitationRow =
  Database["public"]["Tables"]["organization_invitations"]["Row"];

export interface OrgContext {
  user: User;
  organization: OrganizationRow;
  membership: MembershipRow;
  isAdmin: boolean;
}

/**
 * Resolve the signed-in user's active organization, bootstrapping on first
 * login (create org, or auto-join a pending invitation matching the verified
 * email). Returns null when there is no session.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: membership } = await supabase
    .from("organization_memberships")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    const { error } = await supabase.rpc("bootstrap_organization");
    if (error) {
      console.error("[org] bootstrap_organization failed:", error);
      return null;
    }
    ({ data: membership } = await supabase
      .from("organization_memberships")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle());
  }
  if (!membership) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", membership.organization_id)
    .single();
  if (!organization) return null;

  return {
    user,
    organization,
    membership,
    isAdmin: membership.member_role === "admin",
  };
}

export async function requireOrgContext(): Promise<OrgContext> {
  const ctx = await getOrgContext();
  if (!ctx) throw new Error("Not authenticated or no organization");
  return ctx;
}

export async function requireAdminContext(): Promise<OrgContext> {
  const ctx = await requireOrgContext();
  if (!ctx.isAdmin) {
    throw new Error("Admin role required for configuration changes");
  }
  return ctx;
}

export async function listMembers(
  organizationId: string,
): Promise<MembershipRow[]> {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("organization_memberships")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listPendingInvitations(
  organizationId: string,
): Promise<InvitationRow[]> {
  const supabase = await serverClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function inviteMember(input: {
  email: string;
  memberRole: MemberRole;
}): Promise<{ isEmailSent: boolean }> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  const email = input.email.trim().toLowerCase();
  const token = generateInviteToken();

  const { error } = await supabase.from("organization_invitations").insert({
    organization_id: ctx.organization.id,
    email,
    member_role: input.memberRole,
    token_hash: hashInviteToken(token),
    invited_by: ctx.user.id,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("This email already has a pending invitation");
    }
    throw error;
  }

  const inviteUrl = `${serverEnv().PUBLIC_APP_URL}/invite/${token}`;
  const isEmailSent = await sendEmail({
    to: email,
    subject: `You are invited to ${ctx.organization.display_name} on Raditor`,
    react: MemberInvitationEmail({
      organizationName: ctx.organization.display_name,
      inviteUrl,
      memberRole: input.memberRole,
    }),
  });

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "member_invited",
    subjectType: "organization_invitation",
    subjectId: email,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { member_role: input.memberRole },
  });

  return { isEmailSent };
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();
  const { error } = await supabase
    .from("organization_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "invitation_revoked",
    subjectType: "organization_invitation",
    subjectId: invitationId,
    actorKind: "user",
    actorId: ctx.user.id,
  });
}

/** Throws when `membershipId` is the organization's only admin. */
async function assertNotLastAdmin(
  organizationId: string,
  membershipId: string,
): Promise<void> {
  const supabase = await serverClient();
  const { data: admins, error } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("member_role", "admin");
  if (error) throw error;
  const isLastAdmin =
    admins.length === 1 && admins[0] !== undefined && admins[0].id === membershipId;
  if (isLastAdmin) {
    throw new Error(
      "An organization needs at least one admin. Promote someone else first.",
    );
  }
}

export async function changeMemberRole(
  membershipId: string,
  memberRole: MemberRole,
): Promise<void> {
  const ctx = await requireAdminContext();
  if (memberRole === "user") {
    await assertNotLastAdmin(ctx.organization.id, membershipId);
  }
  const supabase = await serverClient();
  const { error } = await supabase
    .from("organization_memberships")
    .update({ member_role: memberRole })
    .eq("id", membershipId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "member_role_changed",
    subjectType: "organization_membership",
    subjectId: membershipId,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { member_role: memberRole },
  });
}

export async function removeMember(membershipId: string): Promise<void> {
  const ctx = await requireAdminContext();
  await assertNotLastAdmin(ctx.organization.id, membershipId);
  const supabase = await serverClient();
  const { error } = await supabase
    .from("organization_memberships")
    .delete()
    .eq("id", membershipId)
    .eq("organization_id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "member_removed",
    subjectType: "organization_membership",
    subjectId: membershipId,
    actorKind: "user",
    actorId: ctx.user.id,
  });
}

/**
 * Update the org's per-functionality model routing (admin). Empty values
 * remove the override so the platform default applies.
 */
export async function updateModelRouting(
  routing: Record<string, string>,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  const cleaned = Object.fromEntries(
    Object.entries(routing).filter(([, model]) => model.trim().length > 0),
  );

  const { error } = await supabase
    .from("organizations")
    .update({ model_routing: cleaned })
    .eq("id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "model_routing_updated",
    subjectType: "organization",
    subjectId: ctx.organization.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: { routing: cleaned },
  });
}

/** Update the org's date & time display settings (admin). */
export async function updateDateTimeSettings(
  settings: DateTimeSettings,
): Promise<void> {
  const ctx = await requireAdminContext();
  const supabase = await serverClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      timezone: settings.timezone,
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,
    })
    .eq("id", ctx.organization.id);
  if (error) throw error;

  await recordEvent({
    organizationId: ctx.organization.id,
    eventType: "date_time_settings_updated",
    subjectType: "organization",
    subjectId: ctx.organization.id,
    actorKind: "user",
    actorId: ctx.user.id,
    payload: {
      timezone: settings.timezone,
      date_format: settings.dateFormat,
      time_format: settings.timeFormat,
    },
  });
}

/**
 * Accept an invitation via its emailed token (the /invite/<token> page).
 * Returns the joined organization id. The definer function enforces email
 * match and expiry; errors surface as messages for the page to render.
 */
export async function acceptInvitationByToken(token: string): Promise<string> {
  const supabase = await serverClient();
  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token_hash: hashInviteToken(token),
  });
  if (error) {
    if (error.message.includes("invitation_email_mismatch")) {
      throw new Error(
        "This invitation was sent to a different email address than the one you are signed in with.",
      );
    }
    if (error.message.includes("invitation_invalid")) {
      throw new Error("This invitation link is invalid or has expired.");
    }
    throw error;
  }
  return data;
}

/** Preview an invitation for the accept page (service role: token lookup). */
export async function getInvitationPreview(token: string): Promise<{
  organizationName: string;
  email: string;
  isExpired: boolean;
} | null> {
  const admin = adminClient();
  const { data: invitation } = await admin
    .from("organization_invitations")
    .select("*")
    .eq("token_hash", hashInviteToken(token))
    .is("accepted_at", null)
    .maybeSingle();
  if (!invitation) return null;

  const { data: organization } = await admin
    .from("organizations")
    .select("display_name")
    .eq("id", invitation.organization_id)
    .single();

  return {
    organizationName: organization?.display_name ?? "an organization",
    email: invitation.email,
    isExpired: new Date(invitation.expires_at).getTime() < Date.now(),
  };
}
