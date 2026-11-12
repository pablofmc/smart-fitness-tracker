import { describe, expect, it } from "vitest";
import { nextUserToSync } from "./turn";

describe("nextUserToSync", () => {
  it("picks whoever waited longest", () => {
    expect(
      nextUserToSync([
        { userId: "me", lastStartedAt: "2026-11-09T10:15:00Z" },
        { userId: "her", lastStartedAt: "2026-11-09T10:00:00Z" },
      ]),
    ).toBe("her");
  });

  it("puts someone never synced first, so a new key starts its history load at the next run", () => {
    expect(
      nextUserToSync([
        { userId: "me", lastStartedAt: "2026-11-09T10:00:00Z" },
        { userId: "her", lastStartedAt: null },
      ]),
    ).toBe("her");
  });

  it("alternates when both run every turn", () => {
    const last = new Map<string, string | null>([["a", null], ["b", null]]);
    const turns: string[] = [];
    for (let i = 0; i < 4; i++) {
      const next = nextUserToSync([...last].map(([userId, lastStartedAt]) => ({ userId, lastStartedAt })))!;
      turns.push(next);
      last.set(next, `2026-11-09T10:${String(i * 15).padStart(2, "0")}:00Z`);
    }
    expect(turns).toEqual(["a", "b", "a", "b"]);
  });

  it("has no one to sync without a usable key", () => {
    expect(nextUserToSync([])).toBeNull();
  });
});
