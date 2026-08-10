import { describe, expect, it } from "vitest";

import { signConnectState, verifyConnectState } from "./signed-state";

const SECRET = "state-secret";
const INPUT = {
  organizationId: "org-1",
  userId: "user-1",
  returnTo: "/projects/new",
};

describe("signed connect state", () => {
  it("round-trips a valid state", () => {
    const token = signConnectState(INPUT, SECRET);
    const state = verifyConnectState(token, SECRET);
    expect(state).toMatchObject(INPUT);
  });

  it("rejects a tampered payload", () => {
    const token = signConnectState(INPUT, SECRET);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...INPUT, organizationId: "org-2", expiresAtMs: Date.now() + 1000 }),
    ).toString("base64url");
    expect(verifyConnectState(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifyConnectState(`${payload}.wrong`, SECRET)).toBeNull();
  });

  it("rejects the wrong secret", () => {
    const token = signConnectState(INPUT, SECRET);
    expect(verifyConnectState(token, "other-secret")).toBeNull();
  });

  it("rejects an expired state", () => {
    const now = Date.now();
    const token = signConnectState(INPUT, SECRET, now);
    expect(verifyConnectState(token, SECRET, now + 2 * 60 * 60 * 1000)).toBeNull();
  });

  it("rejects non-relative returnTo targets", () => {
    const token = signConnectState(
      { ...INPUT, returnTo: "https://evil.example" },
      SECRET,
    );
    expect(verifyConnectState(token, SECRET)).toBeNull();
    const protocolRelative = signConnectState(
      { ...INPUT, returnTo: "//evil.example" },
      SECRET,
    );
    expect(verifyConnectState(protocolRelative, SECRET)).toBeNull();
  });
});
