import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets, icons, the web manifest, the service worker and the sync route (it checks its own secret).
  matcher: ["/((?!_next/static|_next/image|icons/|icon|apple-icon|manifest.webmanifest|sw.js|api/sync|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
