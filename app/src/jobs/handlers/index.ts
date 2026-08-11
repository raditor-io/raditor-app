/** Registers every job handler exactly once (called by worker entry points). */
import { registerEvaluateSignal } from "@/jobs/handlers/evaluate-signal";
import { registerOpenPr } from "@/jobs/handlers/open-pr";
import { registerRenderDrafts } from "@/jobs/handlers/render-drafts";
import { registerRunScan } from "@/jobs/handlers/run-scan";

let isRegistered = false;

export function registerAllJobs(): void {
  if (isRegistered) return;
  isRegistered = true;
  registerRunScan();
  registerEvaluateSignal();
  registerRenderDrafts();
  registerOpenPr();
}
