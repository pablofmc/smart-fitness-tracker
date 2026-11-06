import { RUN_TYPE_LABELS, shoeName, type CatalogShoe, type RunType } from "./catalog";

/** A model the search can suggest: from the catalog, or one I typed by hand before. */
export type ShoeModel = {
  key: string;
  brand: string;
  model: string;
  version: string | null;
  runTypes: RunType[];
  note: string | null;
  image: string | null;
  own: boolean;
};

export const fromCatalog = (s: CatalogShoe): ShoeModel => ({
  key: `catalog:${s.image ?? shoeName(s)}`,
  brand: s.brand,
  model: s.model,
  version: s.version,
  runTypes: s.runTypes,
  note: s.note,
  image: s.image,
  own: false,
});

export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

/**
 * Models whose "brand model version" contains every word of the query. Word starts rank first
 * ("peg" finds Pegasus before Speedgoat), then my own models, then catalog order.
 */
export function searchModels(query: string, models: ShoeModel[], limit = 6): ShoeModel[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.join("").length < 2) return [];
  return models
    .map((m, index) => {
      const name = fold(shoeName(m));
      if (!words.every((w) => name.includes(w))) return null;
      const starts = words.filter((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[^a-z0-9]/g, "\\$&")}`).test(name)).length;
      return { m, index, starts };
    })
    .filter((r) => r !== null)
    .sort((a, b) => b.starts - a.starts || Number(b.m.own) - Number(a.m.own) || a.index - b.index)
    .slice(0, limit)
    .map((r) => r.m);
}

export const runTypeLabels = (types: RunType[]) => types.map((t) => RUN_TYPE_LABELS[t]).join(" · ");
