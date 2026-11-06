import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { catalogImageUrl, shoeName, type RunType } from "./catalog";
import { shoeWear } from "./wear";

export type Shoe = Awaited<ReturnType<typeof readShoes>>[number];

/**
 * Every shoe with its km (initial km plus assigned runs, from the shoe_totals view), its wear and
 * the image to show: my own photo through a short-lived signed URL, else the catalog image.
 * Reads go through the session, so RLS decides; only the photo signing uses the admin client.
 */
export async function readShoes() {
  const db = await createClient();
  const [{ data: shoes }, { data: totals }] = await Promise.all([
    db
      .from("shoes")
      .select("id, brand, model, version, run_types, catalog_image, photo_path, started_on, initial_km, limit_km, is_default, retired_on, warning_hidden_until, created_at")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    db.from("shoe_totals").select("shoe_id, km, runs"),
  ]);
  const rows = shoes ?? [];
  if (rows.length === 0) return [];

  const paths = rows.flatMap((s) => (s.photo_path ? [s.photo_path] : []));
  const signed = paths.length ? ((await createAdminClient().storage.from("gear-photos").createSignedUrls(paths, 3600)).data ?? []) : [];
  const photoUrl = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
  const total = new Map((totals ?? []).map((t) => [t.shoe_id, t]));

  return rows.map((s) => {
    const km = Number(total.get(s.id)?.km ?? s.initial_km);
    const limitKm = Number(s.limit_km);
    return {
      id: s.id,
      name: shoeName(s),
      runTypes: s.run_types as RunType[],
      image: (s.photo_path && photoUrl.get(s.photo_path)) || (s.catalog_image ? catalogImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, s.catalog_image) : null),
      startedOn: s.started_on,
      km,
      limitKm,
      runs: total.get(s.id)?.runs ?? 0,
      isDefault: s.is_default,
      retiredOn: s.retired_on,
      warningHiddenUntil: s.warning_hidden_until,
      ...shoeWear(km, limitKm),
    };
  });
}
