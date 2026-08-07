"use client";

import { useActionState } from "react";

import {
  inviteMemberAction,
  type ActionResult,
} from "@/app/(dashboard)/settings/members/actions";

const INITIAL: ActionResult = {};

export function InviteForm() {
  const [state, formAction, isPending] = useActionState(
    inviteMemberAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="teammate@example.com"
          className="min-w-56 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <select
          name="member_role"
          defaultValue="user"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value="user">User (review and approve)</option>
          <option value="admin">Admin (full configuration)</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50"
        >
          {isPending ? "Inviting..." : "Invite"}
        </button>
      </div>
      {state.error ? (
        <p className="text-sm text-accent-deep">{state.error}</p>
      ) : null}
      {state.notice ? <p className="text-sm text-muted">{state.notice}</p> : null}
    </form>
  );
}
