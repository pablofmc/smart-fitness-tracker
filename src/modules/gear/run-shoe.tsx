import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { catalogImageUrl, shoeName } from "./catalog";
import { RunShoePicker, type PickerShoe } from "./run-shoe-picker";

const KM = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });

/** Shoe row in the run detail, with a sheet to move the run to another shoe (canvas: C2-Selector-Zapatilla). */
export async function RunShoe({ activityId, distanceM }: { activityId: number; distanceM: number | null }) {
  const db = await createClient();
  const [{ data: link }, { data: shoes }, { data: totals }] = await Promise.all([
    db.from("shoe_runs").select("shoe_id").eq("activity_id", activityId).maybeSingle(),
    db.from("shoes").select("id, brand, model, version, catalog_image, photo_path, limit_km, is_default, retired_on"),
    db.from("shoe_totals").select("shoe_id, km"),
  ]);
  const all = shoes ?? [];
  const currentId = link?.shoe_id ?? null;
  // Nothing to pick from and nothing assigned: the row would only say "Sin zapatilla".
  if (!all.some((s) => !s.retired_on) && currentId === null) return null;

  // Signed URLs for my private photos; the page has already checked the session through RLS above.
  const photos = all.flatMap((s) => (s.photo_path && (!s.retired_on || s.id === currentId) ? [s.photo_path] : []));
  const signed = photos.length ? ((await createAdminClient().storage.from("gear-photos").createSignedUrls(photos, 3600)).data ?? []) : [];
  const photoUrl = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])));
  const km = new Map((totals ?? []).map((t) => [t.shoe_id, Number(t.km)]));

  const toPicker = (s: (typeof all)[number]): PickerShoe => ({
    id: s.id,
    name: shoeName(s),
    image: (s.photo_path && photoUrl.get(s.photo_path)) || (s.catalog_image ? catalogImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, s.catalog_image) : null),
    sub: [`${KM.format(km.get(s.id!) ?? 0)} km de ${KM.format(Number(s.limit_km))}`, s.is_default ? "predeterminada" : null, s.retired_on ? "retirada" : null].filter(Boolean).join(" · "),
  });
  const current = all.find((s) => s.id === currentId);

  return (
    <RunShoePicker
      activityId={activityId}
      distanceKm={distanceM ? distanceM / 1000 : null}
      current={current ? toPicker(current) : null}
      options={all.filter((s) => !s.retired_on).sort((a, b) => Number(b.is_default) - Number(a.is_default)).map(toPicker)}
    />
  );
}
