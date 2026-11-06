import { z } from "zod";

/** Brands offered in the shoe search (R-GEAR-01). */
export const BRANDS = ["Nike", "Adidas", "Asics", "Hoka", "Saucony", "New Balance", "On"] as const;
export type Brand = (typeof BRANDS)[number];

export const RUN_TYPES = ["daily", "long", "tempo", "race", "stability", "trail"] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const RUN_TYPE_LABELS: Record<RunType, string> = {
  daily: "Diario",
  long: "Fondo largo",
  tempo: "Tempo",
  race: "Competencia",
  stability: "Estabilidad",
  trail: "Trail",
};

export const GEAR_CATALOG_BUCKET = "gear-catalog";

export const catalogShoeSchema = z.object({
  brand: z.enum(BRANDS),
  model: z.string().min(1),
  /** null for models sold without a version number (e.g. "Zenboost"). */
  version: z.string().min(1).nullable(),
  runTypes: z.array(z.enum(RUN_TYPES)).min(1).max(2),
  /** Short Spanish note on what the shoe is for. */
  note: z.string().min(10).max(120),
  /** null for Hoka (its site blocks automated browsing) and previous versions no longer on sale. */
  productUrl: z.url({ protocol: /^https$/ }).nullable(),
  /** Path inside the gear-catalog bucket: `<brand>/<model>.webp`; null shows the generic drawing. */
  image: z
    .string()
    .regex(/^[a-z0-9-]+\/[a-z0-9-]+\.webp$/)
    .nullable(),
  /** Day the product page or image was checked; null when the entry has neither. */
  checkedOn: z.iso.date().nullable(),
});

export type CatalogShoe = z.infer<typeof catalogShoeSchema>;

/** "Nike Pegasus 42" */
export const shoeName = (s: { brand: string; model: string; version: string | null }) =>
  [s.brand, s.model, s.version].filter(Boolean).join(" ");

export const brandSlug = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Public URL of a catalog image; `supabaseUrl` is NEXT_PUBLIC_SUPABASE_URL. */
export const catalogImageUrl = (supabaseUrl: string, image: string) =>
  `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${GEAR_CATALOG_BUCKET}/${image}`;
