/**
 * Publish queue worker: executes queued publish jobs
 * (render_suggestion_drafts, open_suggestion_pr) and nothing else — each
 * queue gets its own domain route. Vercel cron calls
 * GET /api/jobs/publish/process every minute with Authorization: Bearer
 * CRON_SECRET; self-hosters point any cron at the same URL.
 */
import { NextResponse, type NextRequest } from "next/server";

import { registerAllJobs } from "@/jobs/handlers";
import {
  archiveJob,
  MAX_ATTEMPTS,
  readJobBatch,
  recordJobFailure,
  type QueueName,
} from "@/jobs/queue";
import { dispatch } from "@/jobs/registry";
import { requireEnv } from "@/lib/env";

export const maxDuration = 800;

const TIME_BUDGET_MS = 240_000;
const BATCH_SIZE = 5;

async function processQueue(request: NextRequest) {
  const env = requireEnv("CRON_SECRET");
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const queue: QueueName = "publish";

  registerAllJobs();
  const startedAt = Date.now();
  let processed = 0;
  let failed = 0;
  let deadLettered = 0;

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const batch = await readJobBatch(queue, BATCH_SIZE);
    if (batch.length === 0) break;

    for (const message of batch) {
      try {
        await dispatch(message.envelope);
        await archiveJob(queue, message.msgId);
        processed += 1;
      } catch (err) {
        failed += 1;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(
          `[process:${queue}] job "${message.envelope.job}" failed (attempt ${message.readCount}):`,
          errorMessage,
        );
        if (message.readCount >= MAX_ATTEMPTS) {
          await recordJobFailure(
            queue,
            message.envelope,
            message.readCount,
            errorMessage,
          );
          await archiveJob(queue, message.msgId);
          deadLettered += 1;
        }
      }
    }
  }

  return NextResponse.json({ queue, processed, failed, deadLettered });
}

export async function GET(request: NextRequest) {
  return processQueue(request);
}

export async function POST(request: NextRequest) {
  return processQueue(request);
}
