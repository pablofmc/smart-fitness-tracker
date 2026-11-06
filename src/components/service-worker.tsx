"use client";

import { useEffect } from "react";

/** Registers public/sw.js in production, so Rutinas and a strength session open with no signal (R-STR-08). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Without it the app still works online; only offline opening is lost.
    });
  }, []);
  return null;
}
