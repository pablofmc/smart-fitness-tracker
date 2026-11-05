"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const EVERY_MS = 60_000;

/** Re-reads the page's server data while something visible is changing on its own. */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), EVERY_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
