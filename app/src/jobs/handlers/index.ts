/** Registers every job handler exactly once (called by worker entry points). */
import { registerDeliverFeedItem } from "@/jobs/handlers/deliver-feed-item";
import { registerRunScan } from "@/jobs/handlers/run-scan";

let isRegistered = false;

export function registerAllJobs(): void {
  if (isRegistered) return;
  isRegistered = true;
  registerRunScan();
  registerDeliverFeedItem();
}
