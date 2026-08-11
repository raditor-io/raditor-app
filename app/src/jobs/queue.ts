/**
 * Thin client over the pgmq wrapper functions (jobs_enqueue / jobs_read_batch
 * / jobs_archive, service-role only). Retry semantics: an unarchived message
 * reappears after the visibility timeout; the drain worker dead-letters into
 * job_failures after MAX_ATTEMPTS reads.
 */
import type { Json } from "@/lib/database.types";
import { adminClient } from "@/lib/supabase/server";

export type QueueName = "radar" | "publish";

export const MAX_ATTEMPTS = 3;
export const VISIBILITY_TIMEOUT_SECONDS = 120;

export interface JobEnvelope {
  job: string;
  payload: Record<string, unknown>;
}

export interface QueueMessage {
  msgId: number;
  readCount: number;
  envelope: JobEnvelope;
}

export async function enqueueJob(
  queue: QueueName,
  job: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await adminClient().rpc("jobs_enqueue", {
    p_queue: queue,
    p_message: { job, payload } as Json,
  });
  if (error) throw error;
}

export async function readJobBatch(
  queue: QueueName,
  batchSize: number,
): Promise<QueueMessage[]> {
  const { data, error } = await adminClient().rpc("jobs_read_batch", {
    p_queue: queue,
    p_visibility_timeout: VISIBILITY_TIMEOUT_SECONDS,
    p_batch_size: batchSize,
  });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const message = row.message as { job?: unknown; payload?: unknown } | null;
    return {
      msgId: Number(row.msg_id),
      readCount: row.read_ct,
      envelope: {
        job: typeof message?.job === "string" ? message.job : "",
        payload:
          message?.payload && typeof message.payload === "object"
            ? (message.payload as Record<string, unknown>)
            : {},
      },
    };
  });
}

export async function archiveJob(
  queue: QueueName,
  msgId: number,
): Promise<void> {
  const { error } = await adminClient().rpc("jobs_archive", {
    p_queue: queue,
    p_msg_id: msgId,
  });
  if (error) throw error;
}

export async function recordJobFailure(
  queue: QueueName,
  envelope: JobEnvelope,
  attemptCount: number,
  errorMessage: string,
): Promise<void> {
  const { error } = await adminClient().from("job_failures").insert({
    queue_name: queue,
    job_name: envelope.job,
    payload: envelope.payload as Json,
    attempt_count: attemptCount,
    error_message: errorMessage,
  });
  if (error) {
    console.error("[jobs] failed to record job failure:", error);
  }
}
