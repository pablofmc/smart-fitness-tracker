import "server-only";
import type { DayValue } from "@/lib/metrics/baseline";
import { createClient } from "@/lib/supabase/server";
import { combineSources, type HealthDay, type HealthMetric } from "./metrics";

const PAGE_SIZE = 1000;

type Db = Awaited<ReturnType<typeof createClient>>;

async function pages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await read(start, start + PAGE_SIZE - 1);
    if (error) throw new Error("No pudimos leer tus datos de salud.");
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

/** Whole health-day payloads of some kinds from a day on, through the session. */
export async function readHealthDays(kinds: string[], from: string | null): Promise<HealthDay[]> {
  const db = await createClient();
  return pages((start, end) => {
    let query = db.from("health_days").select("kind, day, data").in("kind", kinds);
    if (from) query = query.gte("day", from);
    return query.order("day").order("kind").range(start, end);
  });
}

/** One metric over any span, reading only the JSON field it needs so years of history stay light. */
export async function readMetric(metric: HealthMetric, from: string | null, db?: Db): Promise<DayValue[]> {
  const client = db ?? (await createClient());
  const fields = await Promise.all(
    metric.sources.map((source) =>
      pages<{ day: string; raw: unknown }>((start, end) => {
        let query = client.from("health_days").select(`day, raw:data->${source.path.join("->")}`).eq("kind", source.kind);
        if (from) query = query.gte("day", from);
        return query.order("day").range(start, end) as unknown as PromiseLike<{ data: { day: string; raw: unknown }[] | null; error: unknown }>;
      }),
    ),
  );
  return combineSources(metric, fields);
}
