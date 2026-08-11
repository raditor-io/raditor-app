"use server";

import { errorMessage } from "@/lib/error-message";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  changeMemberRole,
  inviteMember,
  removeMember,
  revokeInvitation,
} from "@/services/org";

export interface ActionResult {
  error?: string;
  notice?: string;
}

const inviteSchema = z.object({
  email: z.email(),
  member_role: z.enum(["admin", "user"]),
});

export async function inviteMemberAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    member_role: formData.get("member_role"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email address and role." };
  }
  try {
    const { isEmailSent } = await inviteMember({
      email: parsed.data.email,
      memberRole: parsed.data.member_role,
    });
    revalidatePath("/settings/members");
    return {
      notice: isEmailSent
        ? `Invitation sent to ${parsed.data.email}.`
        : `Invitation created for ${parsed.data.email} (email delivery is not configured; share the link manually from your outbox).`,
    };
  } catch (err) {
    return {
      error: errorMessage(err, "Could not send invitation."),
    };
  }
}

const roleSchema = z.object({
  membership_id: z.uuid(),
  member_role: z.enum(["admin", "user"]),
});

export async function changeMemberRoleAction(
  formData: FormData,
): Promise<void> {
  const parsed = roleSchema.safeParse({
    membership_id: formData.get("membership_id"),
    member_role: formData.get("member_role"),
  });
  if (!parsed.success) return;
  await changeMemberRole(parsed.data.membership_id, parsed.data.member_role);
  revalidatePath("/settings/members");
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const membershipId = z.uuid().safeParse(formData.get("membership_id"));
  if (!membershipId.success) return;
  await removeMember(membershipId.data);
  revalidatePath("/settings/members");
}

export async function revokeInvitationAction(
  formData: FormData,
): Promise<void> {
  const invitationId = z.uuid().safeParse(formData.get("invitation_id"));
  if (!invitationId.success) return;
  await revokeInvitation(invitationId.data);
  revalidatePath("/settings/members");
}
