"use client";

import { useSyncExternalStore } from "react";
import { SessionScreen, type SessionTemplate } from "./session-screen";

const noop = () => () => {};

/**
 * The session lives in the phone's storage, so its screen renders only in the browser. Imported directly,
 * not with next/dynamic, so its code is named in the page's HTML and the service worker keeps it for
 * offline use (public/sw.js).
 */
export function SessionLoader(props: { template: SessionTemplate; knownExercises: { key: string; name: string }[] }) {
  const inBrowser = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  return inBrowser ? <SessionScreen {...props} /> : <p className="text-sm text-muted">Cargando la sesión…</p>;
}
