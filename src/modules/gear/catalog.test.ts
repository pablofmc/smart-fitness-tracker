import { describe, expect, it } from "vitest";
import { BRANDS, brandSlug, catalogImageUrl, catalogShoeSchema, shoeName } from "./catalog";
import { SHOE_CATALOG } from "./catalog-data";

describe("shoe catalog", () => {
  it("every entry matches the schema", () => {
    for (const shoe of SHOE_CATALOG) {
      const result = catalogShoeSchema.safeParse(shoe);
      expect(result.success, `${shoeName(shoe)}: ${result.error?.message}`).toBe(true);
    }
  });

  it("has no duplicate models or images", () => {
    const names = SHOE_CATALOG.map(shoeName);
    expect(new Set(names).size).toBe(names.length);
    const images = SHOE_CATALOG.flatMap((s) => (s.image ? [s.image] : []));
    expect(new Set(images).size).toBe(images.length);
  });

  it("files each image under its brand's folder", () => {
    for (const shoe of SHOE_CATALOG) {
      if (shoe.image) expect(shoe.image.startsWith(`${brandSlug(shoe.brand)}/`), shoeName(shoe)).toBe(true);
    }
  });

  it("has no repeated run type within a model", () => {
    for (const shoe of SHOE_CATALOG) {
      expect(new Set(shoe.runTypes).size, shoeName(shoe)).toBe(shoe.runTypes.length);
    }
  });

  it("covers every brand", () => {
    const covered = new Set(SHOE_CATALOG.map((s) => s.brand));
    expect(BRANDS.filter((b) => !covered.has(b))).toEqual([]);
  });

  it("dates every entry with a checked link or image, and only those", () => {
    for (const shoe of SHOE_CATALOG) {
      expect(shoe.checkedOn !== null, shoeName(shoe)).toBe(shoe.productUrl !== null || shoe.image !== null);
    }
  });

  it("checks the current model of every line outside Hoka, listed before its previous versions", () => {
    const seen = new Set<string>();
    for (const shoe of SHOE_CATALOG) {
      const line = `${shoe.brand} ${shoe.model}`;
      if (seen.has(line) || shoe.brand === "Hoka") continue;
      seen.add(line);
      expect(shoe.checkedOn, shoeName(shoe)).not.toBeNull();
    }
  });

  it("offers up to two previous versions of a line", () => {
    const lines = new Map<string, number>();
    for (const shoe of SHOE_CATALOG) lines.set(`${shoe.brand} ${shoe.model}`, (lines.get(`${shoe.brand} ${shoe.model}`) ?? 0) + 1);
    expect(Math.max(...lines.values())).toBeLessThanOrEqual(3);
    expect(SHOE_CATALOG.map(shoeName)).toEqual(expect.arrayContaining(["Asics Novablast 5", "Asics Novablast 4", "Nike Pegasus Plus"]));
  });
});

describe("helpers", () => {
  it("names a shoe with and without version", () => {
    expect(shoeName({ brand: "Nike", model: "Pegasus", version: "42" })).toBe("Nike Pegasus 42");
    expect(shoeName({ brand: "Adidas", model: "Zenboost", version: null })).toBe("Adidas Zenboost");
  });

  it("builds the public image URL", () => {
    expect(catalogImageUrl("https://x.supabase.co/", "nike/pegasus-42.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/gear-catalog/nike/pegasus-42.webp",
    );
  });

  it("slugs brand names", () => {
    expect(brandSlug("New Balance")).toBe("new-balance");
  });
});
