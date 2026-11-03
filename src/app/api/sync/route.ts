import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { startSync } from "@/lib/sync/start";

// Vercel Hobby's maximum. The run stops itself earlier, so it can save its place and log the result.
export const maxDuration = 300;
const BUDGET_MS = 240_000;

const digest = (value: string) => createHash("sha256").update(value).digest();

function authorized(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;
  return timingSafeEqual(digest(request.headers.get("authorization") ?? ""), digest(`Bearer ${secret}`));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ outcome: await startSync("scheduled", BUDGET_MS) });
}
