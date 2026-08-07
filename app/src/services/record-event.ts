/**
 * Append-only audit log (events table). Every mutation in the app records an
 * event through here; the log powers the public events API and webhooks.
 *
 * Inserts use the service-role client (the table has no insert policy), and
 * never throw: a failed audit write is logged loudly but must not break the
 * user action that triggered it.
 */
import type { Json } from "@/lib/database.types";
import { adminClient } from "@/lib/supabase/server";

export type ActorKind = "user" | "agent" | "system";

export interface RecordEventInput {
  organizationId: string;
  eventType: string;
  subjectType?: string;
  subjectId?: string;
  actorKind?: ActorKind;
  actorId?: string;
  payload?: Json;
}

/** Pure row builder, kept separate for testability. */
export function buildEventRow(input: RecordEventInput) {
  return {
    organization_id: input.organizationId,
    event_type: input.eventType,
    subject_type: input.subjectType ?? null,
    subject_id: input.subjectId ?? null,
    actor_kind: input.actorKind ?? "system",
    actor_id: input.actorId ?? null,
    payload: input.payload ?? {},
  };
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  try {
    const { error } = await adminClient()
      .from("events")
      .insert(buildEventRow(input));
    if (error) {
      console.error(
        `[events] failed to record "${input.eventType}" for org ${input.organizationId}:`,
        error,
      );
    }
  } catch (err) {
    console.error(
      `[events] failed to record "${input.eventType}" for org ${input.organizationId}:`,
      err,
    );
  }
}
