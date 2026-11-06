"use client";

import { useEffect } from "react";

/** Asks the service worker to keep copies of these pages for offline use (see public/sw.js). */
export function OfflineWarmup({ urls }: { urls: string[] }) {
  const key = urls.join("|");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "warm", urls: key.split("|") }));
  }, [key]);
  return null;
}
