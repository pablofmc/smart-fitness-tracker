import { createClient } from "@/lib/supabase/server";

/** R-DAT-01: downloads one archived file exactly as stored. Reads through the session, so RLS applies. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response(null, { status: 404 });

  const db = await createClient();
  const { data: file } = await db.from("raw_files").select("storage_path, content_type").eq("id", Number(id)).maybeSingle();
  if (!file) return new Response(null, { status: 404 });

  const { data, error } = await db.storage.from("raw").download(file.storage_path);
  if (error) return new Response(null, { status: 502 });

  const name = file.storage_path.replaceAll("/", "-");
  return new Response(data, {
    headers: { "Content-Type": file.content_type, "Content-Disposition": `attachment; filename="${name}"` },
  });
}
