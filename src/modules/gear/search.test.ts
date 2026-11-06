import { describe, expect, it } from "vitest";
import { shoeName } from "./catalog";
import { SHOE_CATALOG } from "./catalog-data";
import { fold, fromCatalog, searchModels, type ShoeModel } from "./search";

const catalog = SHOE_CATALOG.map(fromCatalog);
const own: ShoeModel = {
  key: "own:1",
  brand: "Mizuno",
  model: "Wave Rider",
  version: "29",
  runTypes: ["daily"],
  note: null,
  image: null,
  own: true,
};
const names = (q: string, models = catalog) => searchModels(q, models).map(shoeName);

describe("searchModels", () => {
  it("needs at least two letters", () => {
    expect(names("p")).toEqual([]);
    expect(names("  ")).toEqual([]);
  });

  it("finds a model by part of its name, ignoring case", () => {
    expect(names("PEGA")).toContain("Nike Pegasus 42");
  });

  it("matches every word, in any order", () => {
    expect(names("42 pegasus")).toEqual(["Nike Pegasus 42"]);
    expect(names("nike novablast")).toEqual([]);
  });

  it("ignores accents", () => {
    expect(fold("Énfasis")).toBe("enfasis");
    expect(names("nóvablast")).toContain("Asics Novablast 6");
  });

  it("ranks word starts first", () => {
    const models = [{ ...own, key: "a", brand: "Hoka", model: "Speedgoat", version: null }, { ...own, key: "b", brand: "Nike", model: "Goat", version: null }];
    expect(names("goat", models)).toEqual(["Nike Goat", "Hoka Speedgoat"]);
  });

  it("suggests my own models next to the catalog", () => {
    expect(names("wave rider", [...catalog, own])).toEqual(["Mizuno Wave Rider 29"]);
  });

  it("returns at most six suggestions", () => {
    expect(searchModels("nike", catalog)).toHaveLength(6);
  });

  it("finds Hoka models that have no image", () => {
    const [clifton] = searchModels("clifton", catalog);
    expect(clifton).toMatchObject({ brand: "Hoka", image: null });
  });
});
