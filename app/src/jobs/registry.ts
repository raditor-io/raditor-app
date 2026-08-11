/**
 * Job registry: name → payload schema + handler. dispatch() validates the
 * envelope and runs the handler; unknown jobs and invalid payloads throw
 * (the drain worker dead-letters them after max attempts). Handlers must be
 * idempotent: retries re-run them with the same payload.
 */
import { z } from "zod";

import type { JobEnvelope } from "@/jobs/queue";

export interface JobDefinition<S extends z.ZodType> {
  schema: S;
  handler: (payload: z.infer<S>) => Promise<void>;
}

const registry = new Map<string, JobDefinition<z.ZodType>>();

export function registerJob<S extends z.ZodType>(
  name: string,
  definition: JobDefinition<S>,
): void {
  registry.set(name, definition as JobDefinition<z.ZodType>);
}

export function clearRegistryForTesting(): void {
  registry.clear();
}

export async function dispatch(envelope: JobEnvelope): Promise<void> {
  const definition = registry.get(envelope.job);
  if (!definition) {
    throw new Error(`Unknown job: "${envelope.job}"`);
  }
  const parsed = definition.schema.safeParse(envelope.payload);
  if (!parsed.success) {
    throw new Error(
      `Invalid payload for job "${envelope.job}": ${parsed.error.message}`,
    );
  }
  await definition.handler(parsed.data);
}
