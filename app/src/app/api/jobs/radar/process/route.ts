/**
 * Radar queue worker: executes queued radar jobs (run_scan) and nothing
 * else — each queue gets its own domain route. Vercel cron calls
 * GET /api/jobs/radar/process every minute with Authorization: Bearer
 * CRON_SECRET; self-hosters point any cron at the same URL. Long maxDuration
 * via fluid compute; the loop stops with time to spare so the function never
 * gets killed mid-job. Scan jobs are single-attempt: every message is
 * archived after its first processing, success or failure — the scan row
 * carries the outcome, job_failures the dead-letter log. No
 * visibility-timeout retries (the timeout only shields in-flight scans from
 * overlapping worker runs).
 */
import { NextResponse, type NextRequest } from "next/server";

import { registerAllJobs } from "@/jobs/handlers";
import {
  archiveJob,
  readJobBatch,
  recordJobFailure,
  SCAN_VISIBILITY_TIMEOUT_SECONDS,
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

  const queue: QueueName = "radar";

  registerAllJobs();
  const startedAt = Date.now();
  let processed = 0;
  let failed = 0;

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    const batch = await readJobBatch(
      queue,
      BATCH_SIZE,
      SCAN_VISIBILITY_TIMEOUT_SECONDS,
    );
    if (batch.length === 0) break;

    for (const message of batch) {
      try {
        await dispatch(message.envelope);
        processed += 1;
      } catch (err) {
        failed += 1;
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(
          `[process:${queue}] job "${message.envelope.job}" failed:`,
          errorMessage,
        );
        await recordJobFailure(
          queue,
          message.envelope,
          message.readCount,
          errorMessage,
        );
      }
      await archiveJob(queue, message.msgId);
    }
  }

  return NextResponse.json({ queue, processed, failed });
}

export async function GET(request: NextRequest) {
  return processQueue(request);
}

export async function POST(request: NextRequest) {
  return processQueue(request);
}
