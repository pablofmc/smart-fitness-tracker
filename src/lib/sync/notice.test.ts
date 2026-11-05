import { describe, expect, it } from "vitest";
import { pickNotice, type NoticeInput } from "./notice";

const calm: NoticeInput = {
  key: { kind: "ok", expiresOn: "2027-01-01" },
  lastFailed: false,
  stopped: false,
  history: { complete: true, percent: 100, reachedDay: null },
};
const expiring = { kind: "expiring", expiresOn: "2026-11-10", days: 8 } as const;

describe("pickNotice", () => {
  it("shows nothing when all is well", () => {
    expect(pickNotice(calm)).toBeNull();
  });

  it("puts the most serious problem first", () => {
    const importing = { complete: false, percent: 10, reachedDay: "2024-01-01" };
    expect(pickNotice({ key: { kind: "blocked", expiresOn: "2026-01-01" }, lastFailed: true, stopped: false, history: importing })).toBe("blocked");
    expect(pickNotice({ key: expiring, lastFailed: true, stopped: false, history: importing })).toBe("failed");
    expect(pickNotice({ key: expiring, lastFailed: false, stopped: false, history: importing })).toBe("expiring");
    expect(pickNotice({ key: expiring, lastFailed: true, stopped: true, history: importing })).toBe("stopped");
    expect(pickNotice({ ...calm, history: importing })).toBe("importing");
  });

  it("asks for a key before anything else can happen", () => {
    expect(pickNotice({ ...calm, key: { kind: "missing" } })).toBe("missing");
  });
});
