import { describe, expect, it } from "vitest";
import { parseTheme, themeAttribute } from "./theme";

describe("parseTheme", () => {
  it("keeps a known theme", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
  });

  it("falls back to system for missing or unknown values", () => {
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("sepia")).toBe("system");
  });
});

describe("themeAttribute", () => {
  it("sets no attribute for system, so the device decides", () => {
    expect(themeAttribute("system")).toBeNull();
    expect(themeAttribute("dark")).toBe("dark");
  });
});
