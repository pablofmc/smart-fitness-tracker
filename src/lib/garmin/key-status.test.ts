import { describe, expect, it } from "vitest";
import { keyStatus } from "./key-status";

const TODAY = "2026-11-02";

describe("keyStatus", () => {
  it("reports a missing key", () => {
    expect(keyStatus(null, TODAY)).toEqual({ kind: "missing" });
  });

  it("stays quiet until 14 days before expiry", () => {
    expect(keyStatus({ expiresOn: "2026-11-17", blockedAt: null }, TODAY).kind).toBe("ok");
    expect(keyStatus({ expiresOn: "2026-11-16", blockedAt: null }, TODAY)).toEqual({
      kind: "expiring",
      expiresOn: "2026-11-16",
      days: 14,
    });
  });

  it("still warns on the last valid day", () => {
    expect(keyStatus({ expiresOn: TODAY, blockedAt: null }, TODAY)).toMatchObject({ kind: "expiring", days: 0 });
  });

  it("treats a past expiry as blocked", () => {
    expect(keyStatus({ expiresOn: "2026-11-01", blockedAt: null }, TODAY).kind).toBe("blocked");
  });

  it("treats a key Garmin rejected as blocked, whatever its date says", () => {
    expect(keyStatus({ expiresOn: "2027-11-01", blockedAt: "2026-11-02T10:00:00Z" }, TODAY).kind).toBe("blocked");
  });
});
