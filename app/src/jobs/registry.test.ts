import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { clearRegistryForTesting, dispatch, registerJob } from "./registry";

describe("job registry", () => {
  beforeEach(() => {
    clearRegistryForTesting();
  });

  it("dispatches to the registered handler with a validated payload", async () => {
    const seen: string[] = [];
    registerJob("test_job", {
      schema: z.object({ id: z.string() }),
      handler: async (payload) => {
        seen.push(payload.id);
      },
    });
    await dispatch({ job: "test_job", payload: { id: "abc" } });
    expect(seen).toEqual(["abc"]);
  });

  it("throws for unknown jobs", async () => {
    await expect(dispatch({ job: "nope", payload: {} })).rejects.toThrow(
      /Unknown job/,
    );
  });

  it("throws for invalid payloads without running the handler", async () => {
    let ran = false;
    registerJob("strict_job", {
      schema: z.object({ id: z.uuid() }),
      handler: async () => {
        ran = true;
      },
    });
    await expect(
      dispatch({ job: "strict_job", payload: { id: "not-a-uuid" } }),
    ).rejects.toThrow(/Invalid payload/);
    expect(ran).toBe(false);
  });
});
